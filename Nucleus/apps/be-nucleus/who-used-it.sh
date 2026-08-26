#!/usr/bin/env bash
# Did anyone actually use the app while it was being cut over, and did they hit
# anything? Asked of the database and the logs rather than assumed from the hour.
#
#   git pull && bash apps/be-nucleus/who-used-it.sh
set -u
q() { sudo -u postgres psql -d biltim -At -c "$1"; }

echo "== sessions opened in the last 12 hours =="
q "select count(*) || ' session(s), ' ||
          coalesce(count(distinct user_id)::text,'0') || ' distinct user(s)'
   from main.user_sessions where created_at > now() - interval '12 hours';" | sed 's/^/  /'
q "select '  ' || to_char(s.created_at,'HH24:MI') || '  ' || coalesce(u.email,'?')
   from main.user_sessions s left join main.users u on u.id = s.user_id
   where s.created_at > now() - interval '12 hours'
   order by s.created_at;"

echo
echo "== last login per user (who is actually using this install) =="
q "select '  ' || coalesce(to_char(last_login_at,'DD Mon HH24:MI'),'never       ')
        || '  ' || email || case when login_count is null then '' else '  (' || login_count || ' logins)' end
   from main.users order by last_login_at desc nulls last;"

echo
echo "== writes recorded in the audit log, last 12 hours =="
q "select count(*) from main.audit_logs where created_at > now() - interval '12 hours';" | sed 's/^/  rows: /'
q "select '  ' || to_char(created_at,'HH24:MI') || '  ' || coalesce(action,'?') || '  ' || coalesce(table_name,'')
   from main.audit_logs where created_at > now() - interval '12 hours'
   order by created_at desc limit 10;"

echo
echo "== what the server actually answered, from the boot logs =="
for f in /root/be*.log; do
  [ -f "$f" ] || continue
  n5=$(grep -c ' 5[0-9][0-9] ' "$f" 2>/dev/null || echo 0)
  n4=$(grep -ciE 'Unauthenticated|Forbidden' "$f" 2>/dev/null || echo 0)
  err=$(grep -c 'ERROR' "$f" 2>/dev/null || echo 0)
  printf '  %-18s ERROR=%-5s auth-refusals=%-5s 5xx=%s\n' "$(basename "$f")" "$err" "$n4" "$n5"
done

echo
echo "== is it answering right now =="
printf '  backend /health : '; curl -s -o /dev/null -w '%{http_code}\n' localhost:1001/health
printf '  frontend /login : '; curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/login
