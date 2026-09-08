#!/usr/bin/env bash
# Everything measured so far was measured on localhost. Users do not arrive on
# localhost. If the layer in front -- nginx, a proxy, a published port -- is
# broken, localhost looks perfectly healthy while nobody can use anything.
set -u
echo "=========== WHAT IS LISTENING, ON WHICH ADDRESS ==========="
ss -lntp 2>/dev/null | grep -vE '127\.0\.0\.1|::1\]' | cut -c1-140 | sed 's/^/  /'
echo "  --- loopback-only listeners (unreachable from outside) ---"
ss -lntp 2>/dev/null | grep -E '127\.0\.0\.1|::1\]' | cut -c1-140 | sed 's/^/  /'

echo
echo "=========== IS THERE A PROXY IN FRONT ==========="
for s in nginx apache2 haproxy caddy traefik; do
  if systemctl is-active "$s" >/dev/null 2>&1; then
    echo "  $s: ACTIVE"
    [ "$s" = nginx ] && nginx -T 2>/dev/null |
      grep -E 'server_name|listen|proxy_pass|ssl_certificate |root ' |
      sed 's/^[ \t]*/    /' | head -40
  else
    printf '  %-9s %s\n' "$s:" "$(systemctl is-active "$s" 2>&1)"
  fi
done
echo "  --- docker/podman published ports ---"
docker ps --format '  {{.Names}}  {{.Ports}}  {{.Status}}' 2>/dev/null | head

echo
echo "=========== REACH IT THE WAY A USER DOES ==========="
IP=$(hostname -I | awk '{print $1}')
echo "  server address: $IP"
for target in "localhost:3000" "$IP:3000" "localhost:1001/health" "$IP:1001/health"; do
  out=$(curl -s -o /dev/null -w '%{http_code} in %{time_total}s' --max-time 8 "http://$target" 2>&1)
  printf '  http://%-24s -> %s\n' "$target" "$out"
done
for target in "$IP" "$IP:80" "$IP:443"; do
  out=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 8 "http://$target" 2>&1)
  printf '  http://%-24s -> %s\n' "$target" "$out"
done

echo
echo "=========== WHAT THE FRONTEND THINKS THE BACKEND IS ==========="
sed -E 's/(SECRET|PASSWORD|KEY|TOKEN)=.*/\1=<redacted>/I' /root/apps/biltim/Nucleus/apps/fe/.env 2>/dev/null | sed 's/^/  /'

echo
echo "=========== DOES THE LOGIN PAGE ACTUALLY RENDER ==========="
body=$(curl -s --max-time 10 http://localhost:3000/login)
printf '  bytes: %s\n' "${#body}"
printf '  has a form:      %s\n' "$(printf '%s' "$body" | grep -c '<input')"
printf '  next build id:   %s\n' "$(printf '%s' "$body" | grep -oE '"buildId":"[^"]*"' | head -1)"
printf '  error markers:   %s\n' "$(printf '%s' "$body" | grep -ciE 'Application error|500|Internal Server')"
echo "  --- the js/css it asks the browser to fetch, and whether they exist ---"
printf '%s' "$body" | grep -oE '/_next/static/[^"]+\.(js|css)' | sort -u | head -8 | while read -r a; do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://localhost:3000$a")
  printf '    %s  %s\n' "$c" "$a"
done

echo
echo "=========== RECENT FRONTEND ERRORS ==========="
tail -400 /root/fe2.log 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' |
  grep -iE 'error|ECONNREFUSED|failed|500' | tail -12 | cut -c1-150 | sed 's/^/  /'
