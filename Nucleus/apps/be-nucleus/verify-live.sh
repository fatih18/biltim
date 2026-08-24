#!/usr/bin/env bash
# Live check for the 0.10.8 cutover, run ON the server.
#
# It exists because the only way into that box is a CyberArk PSM-SSH session
# rendered as an HTML5 canvas, and the remote keyboard is on a Turkish layout —
# so anything typed through it loses characters ($( became /.env, nohup became
# noh7b). Shipping the script through git instead of typing it is the only way
# to run a command that needs quotes.
#
#   git pull && bash apps/be-nucleus/verify-live.sh
#
# Output is deliberately one screen: a fixed set of PASS/FAIL lines, no bodies.
set -u

BE=http://localhost:1001
FE=http://localhost:3000
JAR=$(mktemp)
PASS=0; FAIL=0

ok()   { printf '  PASS  %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  FAIL  %s -- %s\n' "$1" "$2"; FAIL=$((FAIL+1)); }
code() { curl -s -o /tmp/.vb -w '%{http_code}' "$@"; }

echo "== backend =="
c=$(code "$BE/health")
[ "$c" = 200 ] && ok "health 200" || bad "health" "got $c"

echo "== login =="
c=$(curl -s -c "$JAR" -o /tmp/.vb -w '%{http_code}' -X POST "$BE/auth/login" \
     -H 'Content-Type: application/json' \
     -d '{"email":"godmin@nucleus.com","password":"q1w2e3r4t5"}')
if [ "$c" = 200 ]; then
  ok "login 200"
  n=$(grep -c nucleus_ "$JAR" || true)
  [ "$n" -ge 3 ] && ok "3 cookies set" || bad "cookies" "only $n"
else
  bad "login" "got $c -- $(head -c 120 /tmp/.vb)"
  echo; echo "Login failed, so nothing below can be trusted. Stopping."; exit 1
fi

echo "== who am i =="
curl -s -b "$JAR" "$BE/auth/me" > /tmp/.me
python3 - <<'PY' 2>/dev/null || echo "  (python3 missing, raw:) $(head -c 200 /tmp/.me)"
import json
d=json.load(open('/tmp/.me'))
u=(d.get('data') or {}).get('user') or (d.get('data') or {})
print('  email  :', u.get('email'))
print('  isGod  :', u.get('isGod'))
r=(d.get('data') or {}).get('roles') or []
print('  roles  :', [x.get('name') if isinstance(x,dict) else x for x in r] or 'NONE')
PY

echo "== authorization actually applies now (old app ran with AUTHZ_ALLOW_ALL=1) =="
for p in fiveSFindings fiveSAudits users roles; do
  c=$(code -b "$JAR" "$BE/$p?limit=1")
  case "$c" in
    200) ok "GET /$p 200" ;;
    403) bad "GET /$p" "403 FORBIDDEN -- this role lost a permission the bypass was hiding" ;;
    *)   bad "GET /$p" "got $c" ;;
  esac
done

echo "== the filter fix, server side =="
c=$(code -b "$JAR" -G "$BE/fiveSFindings" --data-urlencode 'filters=[{"field":"is_active","operator":"eq","value":true}]')
[ "$c" = 200 ] && ok "filters as ARRAY 200" || bad "filters array" "got $c"
c=$(code -b "$JAR" -G "$BE/fiveSFindings" --data-urlencode 'filters={"is_active":true}')
[ "$c" = 400 ] && ok "filters as OBJECT 400 (expected -- this is what the FE seam now rewrites)" \
                || bad "filters object" "got $c, expected 400"

echo "== our own routes =="
c=$(code -b "$JAR" "$BE/reports/dashboard")
[ "$c" = 200 ] && ok "reports/dashboard 200" || bad "reports/dashboard" "got $c"
c=$(code -b "$JAR" "$BE/reports/open-findings.xlsx")
[ "$c" = 200 ] && ok "open-findings.xlsx 200" || bad "open-findings.xlsx" "got $c"

echo "== logout really is served (it pointed at /v2/auth/logout before) =="
c=$(code -b "$JAR" -X POST "$BE/auth/logout")
[ "$c" = 200 ] && ok "auth/logout 200" || bad "auth/logout" "got $c"

echo "== frontend =="
c=$(code "$FE/")
[ "$c" = 200 ] && ok "FE / 200" || bad "FE /" "got $c"
c=$(code "$FE/login")
[ "$c" = 200 ] && ok "FE /login 200" || bad "FE /login" "got $c"
if grep -qi '<html' /tmp/.vb; then ok "FE returns HTML"; else bad "FE body" "not HTML"; fi

rm -f "$JAR" /tmp/.vb /tmp/.me
echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
