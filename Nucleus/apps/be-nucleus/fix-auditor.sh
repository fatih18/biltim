#!/usr/bin/env bash
# An auditor who cannot open a photo cannot audit. Neither can one who cannot
# see the plan telling them what to audit, or the corrective action a finding
# turned into. Those three were denied — not by anyone's decision, but because
# the old backend ran with AUTHZ_ALLOW_ALL=1, so no role's claim set was ever
# exercised and nobody found out what was missing from it.
#
#   git pull && bash apps/be-nucleus/fix-auditor.sh
set -u
ROLE=Auditor
q() { sudo -u postgres psql -d biltim -At -c "$1"; }

RID=$(q "select id from main.roles where name='$ROLE';")
[ -n "$RID" ] || { echo "FAIL: no role '$ROLE'"; exit 1; }

echo "== what $ROLE can do today, per entity =="
q "select split_part(c.action,'.',2) as entity,
          string_agg(distinct split_part(c.action,'.',1), ',' order by split_part(c.action,'.',1)) as methods
   from main.role_claims rc join main.claims c on c.id = rc.claim_id
   where rc.role_id = '$RID' and c.action ~ '^(get|post|put|patch|delete)\.'
   group by 1 order by 1;" | sed 's/|/  ->  /' | sed 's/^/  /'

echo
echo "== granting the reads the role cannot work without =="
for a in get.files get.five_s_actions get.five_s_audit_plans; do
  CID=$(q "select id from main.claims where action = '$a' limit 1;")
  if [ -z "$CID" ]; then echo "  SKIP $a -- no such claim"; continue; fi
  BEFORE=$(q "select count(*) from main.role_claims where role_id='$RID' and claim_id='$CID';")
  if [ "$BEFORE" != "0" ]; then echo "  already granted: $a"; continue; fi
  q "insert into main.role_claims (role_id, claim_id) values ('$RID','$CID');" >/dev/null
  echo "  granted: $a"
done

echo
echo "$ROLE now holds $(q "select count(*) from main.role_claims where role_id='$RID';") claims"
echo "Restart the backend so the claims cache picks these up:"
echo "  screen -S be -X quit"
echo "  cd Nucleus/apps/be-nucleus && screen -dmS be -L -Logfile /root/be5.log bun run start"
