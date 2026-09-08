#!/usr/bin/env bash
# My sweep asserted that an empty POST writes nothing. That held for most
# entities and NOT for three of them: fiveSAuditDrafts, fiveSAuditPlans and
# users each accepted an empty body and created a row. Remove exactly those,
# and nothing else: only rows created in the last hour whose fields are empty.
set -u
q() { sudo -u postgres psql -d biltim -At -F' | ' -c "$1" 2>&1; }

echo "=========== WHAT THE SWEEP LEFT BEHIND ==========="
echo "  --- users with no email, created in the last hour ---"
q "select id || '  email=' || coalesce(email,'NULL') || '  created=' || created_at
   from main.users
   where created_at > now() - interval '1 hour'
     and (email is null or email = '');" | sed 's/^/    /'
echo "  --- audit drafts with an empty header, last hour ---"
q "select id || '  header=' || header::text || '  created=' || created_at
   from main.five_s_audit_drafts
   where created_at > now() - interval '1 hour'
     and (header::text in ('{}','null') );" | sed 's/^/    /'
echo "  --- audit plans with nothing set, last hour ---"
q "select id || '  status=' || coalesce(status,'NULL') || '  created=' || created_at
   from main.five_s_audit_plans
   where created_at > now() - interval '1 hour'
     and planned_date is null and location_id is null and title is null and audit_id is null;" | sed 's/^/    /'

echo
echo "=========== REMOVING THEM ==========="
q "delete from main.users where created_at > now() - interval '1 hour'
     and (email is null or email = '');" | sed 's/^/  users:  /'
q "delete from main.five_s_audit_drafts where created_at > now() - interval '1 hour'
     and header::text in ('{}','null');" | sed 's/^/  drafts: /'
q "delete from main.five_s_audit_plans where created_at > now() - interval '1 hour'
     and planned_date is null and location_id is null and title is null and audit_id is null;" | sed 's/^/  plans:  /'

echo
echo "=========== CONFIRM NOTHING OF MINE REMAINS ==========="
for t in users five_s_audit_drafts five_s_audit_plans five_s_findings; do
  printf '  %-24s rows now: %s\n' "$t" "$(q "select count(*) from main.$t;")"
done
echo "  probe findings left: $(q "select count(*) from main.five_s_findings where description like '%nucleus probe%';")"
