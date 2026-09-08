#!/usr/bin/env bash
# The routes are camelCase: /fiveSFindings, not /five_s_findings. Now reproduce
# the reported failure -- "creating a single finding errors out" -- against the
# real route, and print exactly what the server says and logs.
set -u
API=localhost:1001
ENV_FILE=/root/apps/biltim/Nucleus/apps/be-nucleus/.env
GE=$(grep -m1 '^GODMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
GP=$(grep -m1 '^GODMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
JAR=$(mktemp); OUT=$(mktemp); trap 'rm -f "$JAR" "$OUT"' EXIT
T=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H 'content-type: application/json' \
     --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")" |
    grep -oE '"accessToken":"[^"]+"' | head -1 | sed 's/.*":"//;s/"//')
A=(-H "Authorization: Bearer $T" -b "$JAR" -H 'content-type: application/json')
echo "signed in, token ${#T} chars"

echo
echo "=========== CAN WE READ FINDINGS ==========="
c=$(curl -s -o "$OUT" -w '%{http_code}' "${A[@]}" "$API/fiveSFindings?limit=1")
echo "  GET /fiveSFindings -> $c"
head -c 400 "$OUT" | fold -s -w 130 | sed 's/^/    /'; echo

echo
echo "=========== CREATE ONE, THE WAY A FORM WOULD ==========="
echo "  --- A: no finding_no (the column is NOT NULL with no default) ---"
c=$(curl -s -o "$OUT" -w '%{http_code}' "${A[@]}" -X POST "$API/fiveSFindings" \
  -d '{"description":"nucleus probe","status":"open"}')
echo "  status $c"; head -c 600 "$OUT" | fold -s -w 130 | sed 's/^/    /'; echo

echo "  --- B: with finding_no ---"
c=$(curl -s -o "$OUT" -w '%{http_code}' "${A[@]}" -X POST "$API/fiveSFindings" \
  -d '{"description":"nucleus probe","status":"open","finding_no":999999}')
echo "  status $c"; head -c 600 "$OUT" | fold -s -w 130 | sed 's/^/    /'; echo
ID=$(grep -oE '"id":"[0-9a-f-]{36}"' "$OUT" | head -1 | sed 's/.*":"//;s/"//')

echo "  --- C: camelCase key, which is what the docs advertise ---"
c=$(curl -s -o "$OUT" -w '%{http_code}' "${A[@]}" -X POST "$API/fiveSFindings" \
  -d '{"description":"nucleus probe","status":"open","findingNo":999998}')
echo "  status $c"; head -c 600 "$OUT" | fold -s -w 130 | sed 's/^/    /'; echo
ID2=$(grep -oE '"id":"[0-9a-f-]{36}"' "$OUT" | head -1 | sed 's/.*":"//;s/"//')

for x in "$ID" "$ID2"; do
  [ -n "$x" ] && curl -s -o /dev/null -w "  cleanup delete $x -> %{http_code}\n" "${A[@]}" -X DELETE "$API/fiveSFindings/$x"
done

echo
echo "=========== WHAT THE SERVER LOGGED ==========="
tail -60 /root/be13.log | sed 's/\x1b\[[0-9;]*m//g' |
  grep -iE 'error|five|violat|null value|constraint|500' | tail -12 | cut -c1-150 | sed 's/^/  /'

echo
echo "=========== THE SHAPE THE DOCS ADVERTISE FOR CREATE ==========="
curl -s "$API/docs/json" | tr ',' '\n' | grep -A2 -i 'fiveSFindings' | head -20 | sed 's/^/  /'
