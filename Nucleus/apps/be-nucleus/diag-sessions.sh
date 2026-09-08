#!/usr/bin/env bash
# The database says no real user has signed in since 31 August, yet Redis holds
# ten sessions. Either those sessions are old and nobody has got in since, or
# people are getting in and the login route is not recording it. Ask Redis how
# old they are.
set -u
echo "=========== THE TEN SESSIONS ==========="
redis-cli --scan --pattern 'session:*' 2>/dev/null | while read -r k; do
  ttl=$(redis-cli ttl "$k" 2>/dev/null)
  # sessions store JSON; pull the fields that date them
  v=$(redis-cli get "$k" 2>/dev/null)
  created=$(printf '%s' "$v" | grep -oE '"(createdAt|created_at|iat|loginAt)":"?[^",}]*' | head -2 | tr '\n' ' ')
  user=$(printf '%s' "$v" | grep -oE '"(email|userId|user_id)":"[^"]*"' | head -2 | tr '\n' ' ')
  if [ "$ttl" -gt 0 ] 2>/dev/null; then
    days=$(( ttl / 86400 )); hrs=$(( (ttl % 86400) / 3600 ))
    printf '  ttl %2sd %2sh  %s  %s\n' "$days" "$hrs" "$created" "$user"
  else
    printf '  ttl %-8s %s  %s\n' "$ttl" "$created" "$user"
  fi
done

echo
echo "=========== SESSION SHAPE (one, redacted) ==========="
k=$(redis-cli --scan --pattern 'session:*' 2>/dev/null | head -1)
redis-cli get "$k" 2>/dev/null | head -c 700 |
  sed -E 's/("(accessToken|refreshToken|token|sessionToken)":")[^"]*/\1REDACTED/g' | fold -s -w 150 | sed 's/^/  /'

echo
echo "=========== WHAT ELSE IS IN REDIS ==========="
redis-cli --scan 2>/dev/null | sed -E 's/:[^:]*$//' | sort | uniq -c | sort -rn | head -20 | sed 's/^/  /'
printf '  total keys: %s\n' "$(redis-cli dbsize 2>/dev/null)"

echo
echo "=========== DOES A GOOD LOGIN STILL WORK END TO END ==========="
echo "  (no password is sent; this only checks the route is alive and shaped right)"
code=$(curl -s -o /tmp/.l -w '%{http_code}' -X POST localhost:1001/auth/login \
        -H 'content-type: application/json' -d '{}')
printf '  empty body      -> %s  %s\n' "$code" "$(head -c 120 /tmp/.l)"
code=$(curl -s -o /tmp/.l -w '%{http_code}' localhost:1001/health 2>/dev/null)
printf '  GET /health     -> %s  %s\n' "$code" "$(head -c 120 /tmp/.l)"
code=$(curl -s -o /tmp/.l -w '%{http_code}' localhost:3000/login 2>/dev/null)
printf '  GET :3000/login -> %s  (%s bytes)\n' "$code" "$(wc -c < /tmp/.l)"
rm -f /tmp/.l
