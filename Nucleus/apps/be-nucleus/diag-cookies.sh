#!/usr/bin/env bash
# The site is served over plain HTTP. A cookie marked Secure is discarded by the
# browser on an http:// origin, silently -- the login answers 200, the cookie
# never lands, and the next request looks signed out. That is indistinguishable
# from "I type the right password and it will not let me in", and no check run
# with curl on the server would ever notice.
set -u
ENV_FILE=/root/apps/biltim/Nucleus/apps/be-nucleus/.env
GE=$(grep -m1 '^GODMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
GP=$(grep -m1 '^GODMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
H=$(mktemp); trap 'rm -f "$H"' EXIT

echo "=========== WHAT THE BACKEND SETS ON A GOOD LOGIN ==========="
curl -s -D "$H" -o /dev/null -X POST localhost:1001/auth/login \
  -H 'content-type: application/json' \
  --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")"
grep -i '^set-cookie' "$H" | sed -E 's/=[^;]*;/=<value>;/' | sed 's/^/  /'
echo "  --- verdict ---"
if grep -iq '^set-cookie.*[Ss]ecure' "$H"; then
  echo "  SECURE IS SET. On http:// the browser DISCARDS these cookies."
else
  echo "  No Secure flag on the backend's cookies."
fi

echo
echo "=========== WHAT THE FRONTEND SETS, WHICH IS WHAT THE BROWSER SEES ==========="
# the browser talks to :3000 only; replay the same login through it
curl -s -D "$H" -o /dev/null -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")" 2>/dev/null
echo "  status: $(head -1 "$H")"
grep -i '^set-cookie' "$H" | sed -E 's/=[^;]*;/=<value>;/' | sed 's/^/  /'

echo
echo "=========== HOW THE LOGIN PAGE IS SERVED ==========="
curl -s -D "$H" -o /dev/null http://localhost:3000/login
grep -iE '^(HTTP/|set-cookie|location|content-security|strict-transport)' "$H" |
  sed -E 's/=[^;]*;/=<value>;/' | cut -c1-140 | sed 's/^/  /'

echo
echo "=========== WHAT THE CONFIG ASKS FOR ==========="
grep -iE '"(secure|sameSite|httpOnly|domain|cookie)"' \
  /root/apps/biltim/Nucleus/apps/be-nucleus/config.json | sed 's/^/  /' | head -20
echo "  NODE_ENV in backend .env: $(grep -m1 '^NODE_ENV=' "$ENV_FILE")"
echo "  NODE_ENV in frontend .env: $(grep -m1 '^NODE_ENV=' /root/apps/biltim/Nucleus/apps/fe/.env 2>/dev/null)"
