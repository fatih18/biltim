#!/usr/bin/env bash
# Does a NON-godmin role actually work after grant-roles.sql?
#
# godmin proves nothing here: its role is documented as "bypasses all
# authorization checks", so it answers 200 whether the claim mapping is right or
# not. The old backend ran with AUTHZ_ALLOW_ALL=1, so no ordinary role's claim
# set was ever exercised — this is the first time any of them is.
#
# It creates ONE user, tests, and deletes it — including on failure, via trap.
# Nothing else is written. The account is named so it is obvious in an audit log.
#
#   git pull && bash apps/be-nucleus/verify-roles.sh
set -u

BE=http://localhost:1001
EMAIL=zz-authz-probe@nucleus.local
PASS=Probe-$RANDOM-$RANDOM
ROLE=${1:-Auditor}

q() { sudo -u postgres psql -d biltim -At -c "$1"; }
sc() { curl -s -o /tmp/.rb -w '%{http_code}' "$@"; }

cleanup() {
  q "delete from main.user_roles where user_id in (select id from main.users where email = '$EMAIL');" >/dev/null 2>&1
  q "delete from main.user_sessions where user_id in (select id from main.users where email = '$EMAIL');" >/dev/null 2>&1
  q "delete from main.users where email = '$EMAIL';" >/dev/null 2>&1
  rm -f /tmp/.rb /tmp/.pj
  echo "  (probe account removed)"
}
trap cleanup EXIT

ROLE_ID=$(q "select id from main.roles where name = '$ROLE' limit 1;")
if [ -z "$ROLE_ID" ]; then echo "FAIL: role '$ROLE' not found"; exit 1; fi
GRANTS=$(q "select count(*) from main.role_claims where role_id = '$ROLE_ID';")
echo "role '$ROLE' holds $GRANTS claims"
if [ "$GRANTS" -lt 120 ]; then
  echo "  NOTE: still around 100 — grant-roles.sql has not run, expect 403s below"
fi

# Same hashing the login path uses (Bun.password.verify reads the prefix).
HASH=$(bun -e "console.log(await Bun.password.hash(process.argv[1], { algorithm: 'argon2id' }))" "$PASS")
if [ -z "$HASH" ]; then echo "FAIL: could not hash a password"; exit 1; fi

q "insert into main.users (email, password, is_active, is_god, email_verified, verified_at)
   values ('$EMAIL', '$HASH', true, false, true, now());" >/dev/null
UID_=$(q "select id from main.users where email = '$EMAIL';")
q "insert into main.user_roles (user_id, role_id) values ('$UID_', '$ROLE_ID');" >/dev/null
echo "probe user created and given '$ROLE'"

code=$(curl -s -c /tmp/.pj -o /tmp/.rb -w '%{http_code}' -X POST "$BE/auth/login" \
        -d email="$EMAIL" -d password="$PASS")
if [ "$code" != 200 ]; then
  echo "FAIL: probe login got $code -- $(head -c 160 /tmp/.rb)"; exit 1
fi
echo "probe login 200"

echo
echo "what this NON-godmin role can actually read:"
ok=0; forbidden=0; other=0
for e in fiveSFindings fiveSAudits fiveSActions fiveSAuditPlans fiveSLocations \
         fiveSQuestions fiveSSteps fiveSAuditTeams fiveSFindingTypes companies \
         boardMeetingDecisions users roles claims files notifications auditLogs; do
  c=$(sc -b /tmp/.pj "$BE/$e?limit=1")
  case "$c" in
    200) ok=$((ok+1));       printf '  200  %s\n' "$e" ;;
    403) forbidden=$((forbidden+1)); printf '  403  %s   <-- denied\n' "$e" ;;
    *)   other=$((other+1)); printf '  %s  %s\n' "$c" "$e" ;;
  esac
done

echo
echo "  $ok readable, $forbidden forbidden, $other other"
if [ "$forbidden" -gt 0 ]; then
  echo "  A 403 here is the real thing the old AUTHZ_ALLOW_ALL=1 was hiding."
  exit 1
fi
echo "  No 403: this role's claims survived the rename from users.read to get.users."
