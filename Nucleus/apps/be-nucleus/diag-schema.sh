#!/usr/bin/env bash
# The backend log holds two things worth reading in full rather than in a
# truncated column: a schema push that applied 12 of its 16 statements and gave
# up on the rest, and a previous run that "vanished with no goodbye".
set -u
W=${W:-155}

echo "=========== SCHEMA PUSH FAILURES (full text) ==========="
grep -h "Schema" /root/be13.log 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | fold -s -w "$W" | tail -60

echo
echo "=========== HOW THE PREVIOUS RUN DIED ==========="
grep -h "Lifecycle" /root/be1*.log 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | fold -s -w "$W" | tail -20

echo
echo "=========== WAS IT THE KERNEL? ==========="
dmesg -T 2>/dev/null | grep -iE 'out of memory|oom-kill|killed process' | tail -10
journalctl -k --since '30 days ago' 2>/dev/null | grep -iE 'oom|killed process' | tail -10
echo "--- memory now ---"
free -m | sed 's/^/  /'
echo "--- what the backend is using ---"
ps -o pid,etime,rss,vsz,cmd -p "$(pgrep -f 'bun run start' | head -1)" 2>/dev/null | sed 's/^/  /'

echo
echo "=========== DOES THE SCHEMA MATCH THE CODE? ==========="
sudo -u postgres psql -d biltim -At -c "
  select table_name from information_schema.tables
  where table_schema='main' order by 1;" 2>&1 | tr '\n' ' ' | fold -s -w "$W" | sed 's/^/  /'
echo
echo "--- audit_logs columns (my earlier query guessed wrong) ---"
sudo -u postgres psql -d biltim -At -c "
  select column_name||':'||data_type||(case when is_nullable='NO' then '!' else '' end)
  from information_schema.columns
  where table_schema='main' and table_name='audit_logs' order by ordinal_position;" 2>&1 |
  tr '\n' ' ' | fold -s -w "$W" | sed 's/^/  /'
echo
echo "--- rows with a null created_at (why SET NOT NULL failed) ---"
sudo -u postgres psql -d biltim -At -c "
  select count(*) from main.audit_logs where created_at is null;" 2>&1 | sed 's/^/  /'
