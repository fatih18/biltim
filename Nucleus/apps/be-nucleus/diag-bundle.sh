#!/usr/bin/env bash
# NEXT_PUBLIC_* values are inlined into the JavaScript the browser downloads.
# If the built bundle contains localhost:1001, then every user's browser is
# being told the API lives on the user's own machine -- where nothing answers.
# That fails for everyone while every check run on the server passes.
set -u
FE=/root/apps/biltim/Nucleus/apps/fe

echo "=========== THE FRONTEND'S ENV ON THIS SERVER ==========="
sed -E 's/(SECRET|PASSWORD|KEY|TOKEN)=.*/\1=<redacted>/I' "$FE/.env" 2>/dev/null | sed 's/^/  /'

echo
echo "=========== WHAT THE BROWSER BUNDLE ACTUALLY CONTAINS ==========="
hits=$(grep -rl "localhost:1001" "$FE/.next/static" 2>/dev/null | head -10)
if [ -n "$hits" ]; then
  echo "  localhost:1001 IS BAKED INTO THE BROWSER BUNDLE:"
  printf '%s\n' "$hits" | sed "s|$FE/|    |"
  echo "  --- the surrounding text ---"
  printf '%s\n' "$hits" | head -1 | while read -r f; do
    grep -oE '.{60}localhost:1001.{40}' "$f" | head -3 | sed 's/^/    /'
  done
else
  echo "  localhost:1001 is NOT in .next/static -- the browser is told something else."
fi
echo
echo "  --- every absolute API address in the bundle ---"
grep -rhoE 'https?://[a-zA-Z0-9._-]+(:[0-9]+)?' "$FE/.next/static" 2>/dev/null |
  sort | uniq -c | sort -rn | head -12 | sed 's/^/    /'

echo
echo "=========== WHEN WAS IT BUILT, AND FROM WHAT ==========="
ls -ld "$FE/.next" 2>/dev/null | sed 's/^/  /'
cat "$FE/.next/BUILD_ID" 2>/dev/null | sed 's/^/  build id: /'
echo "  .env last changed: $(date -r "$FE/.env" '+%d %b %Y %H:%M' 2>/dev/null)"

echo
echo "=========== WHAT A BROWSER ON THE NETWORK CAN REACH ==========="
IP=$(hostname -I | awk '{print $1}')
echo "  this server is $IP"
for t in "$IP:3000" "$IP:1001/health"; do
  printf '  http://%-22s -> %s\n' "$t" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 "http://$t")"
done
echo "  (if :1001 answers here, the browser could reach it -- at the SERVER's address, not localhost)"
