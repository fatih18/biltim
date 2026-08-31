#!/usr/bin/env bash
# How big is the 429 problem, and is it ONLY login?
#
# nucleus keys every rate-limit bucket by client IP. This frontend calls the
# backend server-side (AUTH_API_URL=http://localhost:1001), so the peer IP is
# loopback for EVERY user in the company and they all share one counter.
# Defaults: login 5 per 15m (30m block), private routes 60 per MINUTE,
# public 100 per minute -- company-wide, not per person.
#
# The server logs every block. This counts them instead of guessing.
#
#   git pull && bash apps/be-nucleus/measure-429.sh
set -u
LOGS=$(ls /root/be*.log 2>/dev/null)
[ -n "$LOGS" ] || { echo "no /root/be*.log found"; exit 1; }
echo "reading: $LOGS"
echo

echo "== how many requests nucleus refused with 429 =="
total=$(grep -h "RateLimit] Blocked" $LOGS 2>/dev/null | wc -l | tr -d ' ')
echo "  blocked requests in the logs: $total"
[ "$total" = 0 ] && echo "  (nothing was ever blocked -- the 429s did not come from here)"

echo
echo "== which ROUTES got blocked (is it only login?) =="
grep -h "RateLimit] Blocked" $LOGS 2>/dev/null \
  | sed -E 's/.* to //' | sort | uniq -c | sort -rn | head -25 | sed 's/^/  /'

echo
echo "== which client IP those blocks were keyed by =="
grep -h "RateLimit] Blocked" $LOGS 2>/dev/null \
  | sed -E 's/.*Blocked request from ([^ ]+) to .*/\1/' | sort | uniq -c | sort -rn | head | sed 's/^/  /'

echo
echo "== when they happened (per hour) =="
grep -h "RateLimit] Blocked" $LOGS 2>/dev/null \
  | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}' | sort | uniq -c | tail -24 | sed 's/^/  /'

echo
echo "== buckets redis is holding right now =="
redis-cli --scan --pattern 'rl:*' 2>/dev/null | head -30 | while read -r k; do
  [ -n "$k" ] || continue
  printf '  %-58s ttl=%ss\n' "$k" "$(redis-cli ttl "$k" 2>/dev/null)"
done
[ -z "$(redis-cli --scan --pattern 'rl:*' 2>/dev/null | head -1)" ] && echo "  (none right now)"

echo
echo "== how many people actually use this app (to size the shared 60/min) =="
sudo -u postgres psql -d biltim -At -c \
 "select '  users with a login in the last 7 days: ' || count(*)
  from main.users where last_login_at > now() - interval '7 days';" 2>/dev/null

echo
echo "== a normal page load costs how many backend calls =="
echo "  (each authenticated call spends from the SAME company-wide 60/min bucket)"
grep -hcE '→ (GET|POST) ' $LOGS 2>/dev/null | head -1 | sed 's/^/  total requests logged: /'
