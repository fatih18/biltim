#!/usr/bin/env bash
# Why nobody can log in: everyone shares one rate-limit bucket.
#
# nucleus limits login per CLIENT IP -- 5 attempts per 15 minutes, then a 30
# minute block. The client IP is the TCP peer unless a trusted proxy is
# configured, and this app's frontend calls the backend SERVER-SIDE
# (AUTH_API_URL=http://localhost:1001). So the peer is 127.0.0.1 for every user
# in the company, they all land in the same bucket, and the sixth attempt from
# anyone locks out everyone for half an hour.
#
# This proves it, then clears the block so people can work.
#
#   git pull && bash apps/be-nucleus/fix-login-429.sh
set -u
BE=http://localhost:1001
R() { redis-cli "$@"; }

echo "== the rate-limit keys redis is holding =="
keys=$(R --scan --pattern 'rl:*' 2>/dev/null | head -40)
if [ -z "$keys" ]; then echo "  (none -- nothing is blocked right now)"; else
  while read -r k; do
    [ -n "$k" ] || continue
    printf '  %-60s type=%-6s ttl=%ss\n' "$k" "$(R type "$k" 2>/dev/null)" "$(R ttl "$k" 2>/dev/null)"
  done <<<"$keys"
fi

echo
echo "== the key names show what the bucket is keyed BY =="
echo "  If you see 127.0.0.1 or ::1 below, every user in the company is in it:"
R --scan --pattern 'rl:*' 2>/dev/null | grep -oE '127\.0\.0\.1|::1|[0-9]{1,3}(\.[0-9]{1,3}){3}' | sort | uniq -c | sed 's/^/  /'

echo
echo "== what a login attempt answers right now =="
code=$(curl -s -o /tmp/.rl -w '%{http_code}' -X POST "$BE/auth/login" \
        -d email=godmin@nucleus.com -d password=deliberately-wrong)
echo "  POST /auth/login -> $code  $(head -c 120 /tmp/.rl)"

echo
echo "== clearing the shared bucket so people can get back in =="
n=$(R --scan --pattern 'rl:*' 2>/dev/null | wc -l)
R --scan --pattern 'rl:*' 2>/dev/null | while read -r k; do [ -n "$k" ] && R del "$k" >/dev/null; done
echo "  deleted $n key(s)"

echo
echo "== and the per-account lockout, which is the protection that SHOULD apply =="
sudo -u postgres psql -d biltim -At -c \
  "select '  ' || email || '  failed=' || coalesce(failed_login_attempts,0)
          || case when is_locked then '  LOCKED until ' || coalesce(locked_until::text,'?') else '' end
   from main.users where coalesce(failed_login_attempts,0) > 0 or is_locked
   order by failed_login_attempts desc nulls last;"
echo "  (empty above = no account is individually locked)"

echo
echo "== can we log in now =="
code=$(curl -s -o /tmp/.rl -w '%{http_code}' -X POST "$BE/auth/login" \
        -d email=godmin@nucleus.com -d password=q1w2e3r4t5)
echo "  POST /auth/login -> $code"
rm -f /tmp/.rl
