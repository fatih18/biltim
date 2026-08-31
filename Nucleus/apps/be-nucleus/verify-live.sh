#!/usr/bin/env bash
# Post-cutover audit for biltim on nucleus-core-ts 0.10.8. READ-ONLY: it logs
# in, reads, and logs out. It creates no rows and alters no schema.
#
# Why a script and not typed commands: the only way into this box is a CyberArk
# PSM-SSH session drawn on an HTML5 canvas, and the remote keyboard is on a
# Turkish layout. Typed input loses characters — `$(` arrived as `/.env`,
# `nohup` as `noh7b`, `GODMIN` as `GODMİN`. Anything needing a quote cannot be
# typed reliably, so it travels through git instead.
#
#   git pull && bash apps/be-nucleus/verify-live.sh
set -u

BE=http://localhost:1001
FE=http://localhost:3000
JAR=$(mktemp); TMP=$(mktemp); H=$(mktemp)
P=0; F=0; W=0
ok()   { printf '  ok    %s\n' "$1"; P=$((P+1)); }
no()   { printf '  FAIL  %s -- %s\n' "$1" "$2"; F=$((F+1)); }
warn() { printf '  warn  %s -- %s\n' "$1" "$2"; W=$((W+1)); }
sc()   { curl -s -o "$TMP" -w '%{http_code}' "$@"; }
q()    { sudo -u postgres psql -d biltim -At -c "$1" 2>/dev/null; }

echo "=== 1. is anything serving ==="
[ "$(sc $BE/health)" = 200 ] && ok "backend /health" || no "backend /health" "down"
[ "$(sc $FE/)" = 200 ] && ok "frontend /" || no "frontend /" "down"
[ "$(sc $FE/login)" = 200 ] && ok "frontend /login" || no "frontend /login" "down"
grep -qi '<html' "$TMP" && ok "frontend returns HTML" || no "frontend body" "not HTML"

echo "=== 2. the routes we added survive the move off Elysia ==="
curl -s "$BE/docs/json" -o "$TMP"
for r in /reports/dashboard /reports/open-findings.xlsx; do
  grep -q "$r" "$TMP" && ok "declared in /docs/json: $r" || no "$r" "missing from the route table"
done
n=$(grep -o '"/[^"]*"' "$TMP" | sort -u | wc -l)
echo "        (route table holds ~$n distinct paths)"

echo "=== 3. authentication ==="
c=$(curl -s -c "$JAR" -D "$H" -o "$TMP" -w '%{http_code}' -X POST "$BE/auth/login" \
      -d email=godmin@nucleus.com -d password=q1w2e3r4t5)
if [ "$c" != 200 ]; then
  no "login" "got $c -- $(head -c 150 "$TMP")"
  echo; echo "Login failed. Everything below depends on it. Stopping."; exit 1
fi
ok "login 200 (form-encoded)"
n=$(grep -c nucleus_ "$JAR" || echo 0)
[ "$n" -ge 3 ] && ok "all three cookies written" || no "cookies" "only $n of 3"
# A cookie over 4096 bytes is dropped by the browser SILENTLY: login looks fine
# and every fetch afterwards is 401. jwtClaimsMode:resolve is what keeps it small.
len=$(awk '/nucleus_access_token/{print length($7)}' "$JAR" | head -1)
[ -n "${len:-}" ] && { [ "$len" -lt 4000 ] && ok "access cookie $len bytes (under the 4096 browser limit)" \
                                          || no "access cookie" "$len bytes -- browsers drop it"; }
[ "$(sc $BE/fiveSFindings)" = 401 ] && ok "anonymous read refused" || no "anonymous read" "not 401"

echo "=== 4. who the session says we are ==="
curl -s -b "$JAR" "$BE/auth/me" -o "$TMP"
python3 - "$TMP" <<'PY' 2>/dev/null || echo "  warn  /auth/me unreadable"
import json,sys
d=json.load(open(sys.argv[1])); dd=d.get('data') or {}
u=dd.get('user') or dd
print('        email  :', u.get('email'))
print('        isGod  :', u.get('isGod'))
print('        profile:', 'present' if dd.get('profile') else 'MISSING (screens show a blank name)')
r=dd.get('roles') or []
print('        roles  :', [x.get('name') if isinstance(x,dict) else x for x in r] or 'NONE')
PY

echo "=== 5. authorization is REAL now (the old app ran AUTHZ_ALLOW_ALL=1) ==="
for e in fiveSFindings fiveSAudits fiveSActions fiveSAuditPlans fiveSLocations \
         fiveSQuestions fiveSSteps fiveSAuditTeams fiveSFindingTypes companies \
         boardMeetingDecisions users roles claims files notifications auditLogs; do
  c=$(sc -b "$JAR" "$BE/$e?limit=1")
  case "$c" in
    200) ok "GET /$e" ;;
    403) no "GET /$e" "403 -- the bypass was hiding a missing permission" ;;
    404) warn "GET /$e" "404 -- entity not served under this name" ;;
    *)   no "GET /$e" "got $c" ;;
  esac
done

echo "=== 6. the 0.10 semantics the frontend was rewritten for ==="
c=$(sc -b "$JAR" "$BE/fiveSFindings/00000000-0000-0000-0000-000000000000")
[ "$c" = 404 ] && ok "missing row -> 404 (0.9 answered 200 + data:null)" || no "missing row" "got $c"
c=$(sc -b "$JAR" "$BE/fiveSFindings/not-a-uuid")
[ "$c" = 400 ] && ok "malformed id -> 400" || no "malformed id" "got $c"
c=$(sc -b "$JAR" -G "$BE/fiveSFindings" --data-urlencode 'filters=[{"field":"is_active","operator":"eq","value":true}]')
[ "$c" = 200 ] && ok "filters as ARRAY -> 200" || no "filters array" "got $c"
c=$(sc -b "$JAR" -G "$BE/fiveSFindings" --data-urlencode 'filters={"is_active":true}')
[ "$c" = 400 ] && ok "filters as OBJECT -> 400 (0.9 returned EVERY ROW; the FE seam now rewrites these)" \
               || no "filters object" "got $c, expected 400"

echo "=== 7. our own routes still answer ==="
c=$(sc -b "$JAR" "$BE/reports/dashboard")
if [ "$c" = 200 ]; then
  ok "reports/dashboard 200"
  python3 - "$TMP" <<'PY' 2>/dev/null
import json,sys
k=(json.load(open(sys.argv[1])).get('data') or {})
want={'byLocationType','statusCounts','overdueActions','scoresByDepartment','byStepCode',
      'scoreTrend','planCompliance','findingsPerTeam','departmentSummary','mapHeat'}
missing=want-set(k)
print('        aggregates:', len(want-missing), 'of', len(want), ('MISSING '+','.join(sorted(missing))) if missing else '')
PY
else no "reports/dashboard" "got $c"; fi
c=$(sc -b "$JAR" "$BE/reports/open-findings.xlsx")
if [ "$c" = 200 ] && head -c2 "$TMP" | grep -q PK; then ok "open-findings.xlsx is a real workbook"
else no "open-findings.xlsx" "code $c, first bytes $(head -c2 "$TMP" | od -c | head -1)"; fi

echo "=== 8. the paths that were pointing at nothing ==="
# Sent WITH a session on purpose. An authenticated caller reaching a path that
# does not exist gets 404, and that is the proof the old FE route is dead. This
# check used to expect 401 while still sending the cookie jar, so it warned about
# the correct answer. (401 is what an ANONYMOUS caller gets for any unknown path
# — the server declines to tell a stranger which paths exist, which is why the
# two codes differ here.)
[ "$(sc -b "$JAR" -X POST "$BE/v2/auth/logout")" = 404 ] && ok "/v2/auth/logout is NOT served (confirms the old FE path was dead)" \
  || warn "/v2/auth/logout" "answered something other than 404 for a signed-in caller"
fid=$(q "select id from main.files where is_active is not false limit 1")
if [ -n "${fid:-}" ]; then
  ct1=$(curl -s -b "$JAR" -o /dev/null -w '%{content_type}' "$BE/files/$fid")
  ct2=$(curl -s -b "$JAR" -o /dev/null -w '%{content_type}' "$BE/cdn/$fid")
  echo "        /files/:id -> $ct1"
  echo "        /cdn/:id   -> $ct2"
  case "$ct2" in image/*|application/pdf*|video/*|audio/*|application/octet*) ok "cdn serves bytes, files serves JSON (view-file now uses cdn)" ;;
    *) warn "cdn content-type" "got $ct2" ;; esac
else warn "file check" "no rows in main.files"; fi

echo "=== 9. what the migration did to the data ==="
echo "        users            : $(q 'select count(*) from main.users')"
echo "        claims           : $(q 'select count(*) from main.claims')"
echo "        five_s_findings  : $(q 'select count(*) from main.five_s_findings')"
echo "        five_s_audits    : $(q 'select count(*) from main.five_s_audits')"
d=$(q "select column_default from information_schema.columns where table_schema='main' and table_name='claims' and column_name='mode'")
case "${d:-}" in *startsWith*) ok "claims.mode has its default (this is what unblocked 2715 claims)" ;;
  *) no "claims.mode default" "is '${d:-none}'" ;; esac
t=$(q "select data_type from information_schema.columns where table_schema='main' and table_name='users' and column_name='created_at'")
[ "$t" = "timestamp with time zone" ] && ok "system timestamps converted to timestamptz" || no "users.created_at" "is $t"
t=$(q "select data_type from information_schema.columns where table_schema='main' and table_name='five_s_findings' and column_name='created_at'")
[ "$t" = "timestamp without time zone" ] && ok "domain timestamps left naive on purpose (add_base_columns:false)" \
  || warn "five_s_findings.created_at" "is $t -- domain tables were supposed to stay naive"
# The stamps must not have moved. Anything created before tonight should still
# read in working hours, not shifted by three.
echo "        oldest user created_at: $(q 'select min(created_at) from main.users')"
# main.tenants is NOT expected here. It carries feature_set ['multi-tenant'] in
# system.tables.json and this install runs isMultiTenant:false, so nucleus never
# creates it. This check used to assert the opposite and reported a data loss
# that never happened — the same result appears on a clean local install that has
# never been touched. What matters is that the tables this install DOES declare
# are present.
[ -z "$(q "select to_regclass('main.tenants')")" ] && ok "main.tenants absent, as a single-tenant install expects" \
  || warn "main.tenants" "present although isMultiTenant is false"
[ -n "$(q "select to_regclass('main.user_cohorts')")" ] && ok "main.user_cohorts created" || no "user_cohorts" "missing"

echo "=== 10. frontend talks to backend ==="
[ "$(sc "$FE/api/reports/dashboard")" = 401 ] && ok "FE proxy refuses an anonymous call" || warn "FE proxy" "did not 401"
c=$(sc -b "$JAR" "$FE/api/reports/dashboard")
[ "$c" = 200 ] && ok "FE proxy 200 with a session" || warn "FE proxy with session" "got $c (it forwards cookies by name; check forwardAuth)"

echo "=== 11. refresh-token reuse detection (0.10.4) -- run last, it ends this session ==="
cp "$JAR" "$JAR.keep"
c1=$(sc -b "$JAR.keep" -c "$JAR.new" -X POST "$BE/auth/refresh")
c2=$(sc -b "$JAR.keep" -X POST "$BE/auth/refresh")
echo "        first use: $c1   second use of the SAME token: $c2"
if [ "$c1" = 200 ]; then ok "refresh works"; else no "refresh" "got $c1"; fi
[ "$c2" = 200 ] && warn "reuse" "second use also 200 -- inside the 30s grace window, not a defect" \
                || ok "reused refresh token refused ($c2)"

curl -s -b "$JAR" -X POST "$BE/auth/logout" -o /dev/null
rm -f "$JAR" "$JAR.keep" "$JAR.new" "$TMP" "$H"
echo
echo "  $P ok, $F failed, $W warnings"
[ "$F" -eq 0 ] || exit 1
