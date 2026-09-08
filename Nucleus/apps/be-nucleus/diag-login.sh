#!/usr/bin/env bash
# Why can nobody log in? Users report 403 "Account is locked".
#
# The login route locks an account for 30 minutes after 5 failed attempts, and
# the frontend log shows that refusal being returned. This asks the database WHO
# is locked and WHY, rather than guessing.
#
#   git pull && bash apps/be-nucleus/diag-login.sh
set -u
q() { sudo -u postgres psql -d biltim -At -F' | ' -c "$1" 2>/dev/null; }

echo "== accounts currently locked =="
q "select email, failed_login_attempts, locked_until,
     case when locked_until > now() then 'STILL LOCKED' else 'lock expired' end
   from main.users where is_locked order by locked_until desc nulls last;" | sed 's/^/  /'
echo "  (empty = nobody is locked right now)"

echo
echo "== accounts carrying failed attempts but not locked =="
q "select email, failed_login_attempts from main.users
   where coalesce(failed_login_attempts,0) > 0 and not coalesce(is_locked,false)
   order by failed_login_attempts desc;" | sed 's/^/  /'

echo
echo "== how many people can even sign in (active, with a password) =="
q "select count(*) filter (where password is not null and is_active) || ' of ' || count(*)
   from main.users;" | sed 's/^/  usable accounts: /'

echo
echo "== who has logged in, and when =="
q "select coalesce(to_char(last_login_at,'DD Mon HH24:MI'),'never') || '  ' || email
   from main.users order by last_login_at desc nulls last limit 12;" | sed 's/^/  /'

echo
echo "== failed-login audit entries in the last 3 days =="
q "select to_char(created_at,'DD Mon HH24:MI') || '  ' || coalesce(summary,'-')
   from main.audit_logs
   where created_at > now() - interval '3 days'
     and (summary ilike '%login%' or summary ilike '%lock%')
   order by created_at desc limit 20;" | sed 's/^/  /'
echo "  (empty = the login route is not writing these to audit_logs)"

echo
echo "== what the login endpoint answers right now =="
for who in godmin@nucleus.com; do
  code=$(curl -s -o /tmp/.d -w '%{http_code}' -X POST localhost:1001/auth/login \
          -d "email=$who" -d 'password=deliberately-wrong')
  printf '  %-24s -> %s  %s\n' "$who" "$code" "$(head -c 90 /tmp/.d)"
done
rm -f /tmp/.d
