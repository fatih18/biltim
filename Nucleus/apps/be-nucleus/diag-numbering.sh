#!/usr/bin/env bash
# finding_no is NOT NULL with no default and the frontend never sends it, so
# every create from the UI is refused. The fix is to let the database assign it
# -- but only if the number is global. If it restarts per audit, an identity
# column would silently change what "#3" means on screen.
set -u
q() { sudo -u postgres psql -d biltim -At -F' | ' -c "$1" 2>&1; }

echo "=========== IS finding_no GLOBAL OR PER-AUDIT ==========="
q "select coalesce(audit_id::text,'(no audit)') || '  numbers: ' ||
          string_agg(finding_no::text, ',' order by finding_no)
   from main.five_s_findings group by audit_id order by 1 limit 15;" | sed 's/^/  /'
echo
echo "  distinct finding_no values : $(q 'select count(distinct finding_no) from main.five_s_findings;')"
echo "  total rows                 : $(q 'select count(*) from main.five_s_findings;')"
echo "  max finding_no             : $(q 'select coalesce(max(finding_no),0) from main.five_s_findings;')"
echo "  audits that have findings  : $(q 'select count(distinct audit_id) from main.five_s_findings;')"
echo "  (distinct == total  => the number is GLOBAL and an identity column is right)"
echo "  (numbers repeat across audits => it is PER-AUDIT and identity would be wrong)"

echo
echo "=========== IS ANYTHING ENFORCING UNIQUENESS ==========="
q "select conname || '  ' || pg_get_constraintdef(oid)
   from pg_constraint
   where conrelid = 'main.five_s_findings'::regclass;" | sed 's/^/  /'
q "select indexname || '  ' || indexdef from pg_indexes
   where schemaname='main' and tablename='five_s_findings';" | sed 's/^/  /'

echo
echo "=========== THE COLUMN AS IT STANDS ==========="
q "select column_name || ' | ' || data_type || ' | null=' || is_nullable ||
          ' | default=' || coalesce(column_default,'NONE') ||
          ' | identity=' || is_identity
   from information_schema.columns
   where table_schema='main' and table_name='five_s_findings'
     and column_name in ('finding_no','id','audit_id','status');" | sed 's/^/  /'
