#!/usr/bin/env bash
# Nobody has logged in since 31 August. Before guessing why, establish what the
# system has actually been doing since then: what it audited, what it answered,
# and whether anyone was even knocking.
set -u
q() { sudo -u postgres psql -d biltim -At -F' | ' -c "$1" 2>&1 | head -30; }

echo "== running build =="
grep -o '"nucleus-core-ts": *"[^"]*"' package.json 2>/dev/null | sed 's/^/  package.json: /'
ls -d node_modules/nucleus-core-ts 2>/dev/null >/dev/null &&
  grep -o '"version": *"[^"]*"' node_modules/nucleus-core-ts/package.json | head -1 | sed 's/^/  installed:    /'
echo "  uptime: $(ps -o etime= -p "$(pgrep -f 'bun run start' | head -1)" 2>/dev/null | tr -d ' ')"

echo
echo "== audit volume per day, last 14 days =="
q "select to_char(created_at,'DD Mon') || '  ' || lpad(count(*)::text,5) || '  ' ||
     string_agg(distinct operation, ',')
   from main.audit_logs where created_at > now() - interval '14 days'
   group by 1, date_trunc('day',created_at) order by date_trunc('day',created_at) desc;" | sed 's/^/  /'
echo "  (empty = the app has audited nothing in two weeks)"

echo
echo "== every failed login this database has ever recorded =="
q "select to_char(created_at,'DD Mon HH24:MI') || '  ' || coalesce(summary,'-')
   from main.audit_logs where operation like '%LOGIN%'
   order by created_at desc limit 15;" | sed 's/^/  /'

echo
echo "== live sessions in redis =="
printf '  session keys: %s\n' "$(redis-cli --scan --pattern 'session:*' 2>/dev/null | wc -l)"
printf '  rate-limit keys: %s\n' "$(redis-cli --scan --pattern 'rl:*' 2>/dev/null | wc -l)"
printf '  blocked keys: %s\n' "$(redis-cli --scan --pattern '*:blocked*' 2>/dev/null | wc -l)"

echo
echo "== what the frontend has been answering (whole log) =="
grep -oE 'statusCode: [0-9]+' /root/fe2.log 2>/dev/null | sort | uniq -c | sort -rn | head | sed 's/^/  /'
echo "  --- non-401 failures, with the url ---"
grep -B4 -E "statusCode: (4[0-9][0-9]|5[0-9][0-9])" /root/fe2.log 2>/dev/null |
  grep -oE "localhost:1001[^']*" | sort | uniq -c | sort -rn | head -15 | sed 's/^/  /'

echo
echo "== backend log: anything that is not a 2xx =="
ls -la /root/be*.log /root/fe*.log 2>/dev/null | sed 's/^/  /'
grep -ohE '"status":[0-9]+|status=[0-9]+' /root/be13.log 2>/dev/null | sort | uniq -c | sed 's/^/  /'
echo "  --- errors/exceptions in the backend log ---"
grep -icE 'error|exception|refus|blocked' /root/be13.log 2>/dev/null | sed 's/^/  matching lines: /'
grep -iE 'error|exception|refus|blocked' /root/be13.log 2>/dev/null | tail -8 | cut -c1-160 | sed 's/^/  /'
