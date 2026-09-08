#!/usr/bin/env bash
# Make recording a finding work again.
#
# five_s_findings.finding_no is NOT NULL with no default and nothing in the app
# has ever supplied it, so every create came back 400 "finding_no is required"
# and the screen said "Tekil bulgu kaydedilirken bir hata oluştu". config.json
# now gives the column identity, so the database assigns the number.
#
# Two things this is careful about:
#   - the generator is pinned to the nucleus version INSTALLED here, so a newer
#     one from npm cannot quietly rewrite the rest of the schema;
#   - the sequence is moved past the numbers already stored, because Postgres
#     starts a new identity at 1 and identity adds no unique index, so a
#     collision would be silent.
set -u
DIR=/root/apps/biltim/Nucleus/apps/be-nucleus
API=localhost:1001
cd "$DIR" || exit 1
health() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$API/health"; }

echo "=========== BEFORE ==========="
echo "  health: $(health)"
grep -n "findingNo" src/drizzle/schema.ts | head -2 | sed 's/^/  /'
MAX=$(sudo -u postgres psql -d biltim -At -c "select coalesce(max(finding_no),0) from main.five_s_findings;" 2>&1)
echo "  highest finding_no stored: $MAX"

echo
echo "=========== REGENERATE THE SCHEMA (pinned to the installed nucleus) ==========="
GEN=./node_modules/.bin/nucleus-core-ts
[ -x "$GEN" ] || { echo "  installed generator not found at $GEN — stopping."; exit 1; }
"$GEN" generate config.json src/drizzle/ 2>&1 | tail -5 | sed 's/^/  /'
if ! grep -q "generatedByDefaultAsIdentity" src/drizzle/schema.ts; then
  echo "  THE GENERATOR DID NOT EMIT IDENTITY. Stopping before any restart."
  git checkout src/drizzle/schema.ts 2>/dev/null
  exit 1
fi
grep -n "findingNo" src/drizzle/schema.ts | head -2 | sed 's/^/  /'

echo
echo "=========== RESTART THE BACKEND ==========="
screen -S be -X quit 2>/dev/null; sleep 2
pkill -f 'bun run src/index.ts' 2>/dev/null; sleep 2
N=$(ls -1 /root/be*.log 2>/dev/null | wc -l)
screen -dmS be -L -Logfile "/root/be$((N+1)).log" bun run start
for i in $(seq 1 40); do h=$(health); [ "$h" = 200 ] && break; sleep 2; done
echo "  health after ${i}x2s: $h"
[ "$h" != 200 ] && { echo "  DID NOT COME BACK. Last log:"; tail -20 "/root/be$((N+1)).log" | sed 's/^/    /'; exit 1; }

echo
echo "=========== MOVE THE SEQUENCE PAST WHAT IS ALREADY STORED ==========="
sudo -u postgres psql -d biltim -c \
  "ALTER TABLE main.five_s_findings ALTER COLUMN finding_no RESTART WITH $((MAX+1));" 2>&1 | sed 's/^/  /'

echo
echo "=========== DOES RECORDING A FINDING WORK NOW ==========="
GE=$(grep -m1 '^GODMIN_EMAIL=' .env | cut -d= -f2-)
GP=$(grep -m1 '^GODMIN_PASSWORD=' .env | cut -d= -f2-)
JAR=$(mktemp); OUT=$(mktemp)
T=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H 'content-type: application/json' \
     --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")" |
    grep -oE '"accessToken":"[^"]+"' | head -1 | sed 's/.*":"//;s/"//')
c=$(curl -s -o "$OUT" -w '%{http_code}' -H "Authorization: Bearer $T" -b "$JAR" \
     -H 'content-type: application/json' -X POST "$API/fiveSFindings" \
     -d '{"description":"post-fix verification","status":"open"}')
echo "  POST /fiveSFindings with NO finding_no -> $c"
echo "  assigned number: $(grep -oE '"findingNo":[0-9]+' "$OUT" | head -1)"
ID=$(grep -oE '"id":"[0-9a-f-]{36}"' "$OUT" | head -1 | sed 's/.*":"//;s/"//')
[ -n "$ID" ] && curl -s -o /dev/null -w "  removing the verification row: %{http_code}\n" \
  -H "Authorization: Bearer $T" -b "$JAR" -X DELETE "$API/fiveSFindings/$ID"
rm -f "$JAR" "$OUT"
echo
[ "$c" = 200 ] && echo "  FIXED: a finding can be recorded without the client supplying a number." \
               || echo "  STILL FAILING — see the body above."
