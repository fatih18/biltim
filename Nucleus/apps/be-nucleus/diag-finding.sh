#!/usr/bin/env bash
# "Creating a single finding errors out." five_s_findings.finding_no is
# integer NOT NULL with no default, so whoever creates a finding must supply the
# number themselves -- and if the client does not, the insert cannot succeed.
# This stops guessing and makes the server produce the actual error.
set -u
ENV_FILE=/root/apps/biltim/Nucleus/apps/be-nucleus/.env
API=localhost:1001
GE=$(grep -m1 '^GODMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
GP=$(grep -m1 '^GODMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
OUT=$(mktemp); JAR=$(mktemp); trap 'rm -f "$OUT" "$JAR" /tmp/.oapi' EXIT

TOKEN=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H 'content-type: application/json' \
  --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")" |
  grep -oE '"accessToken":"[^"]+"' | head -1 | sed 's/.*":"//;s/"//')
[ -z "$TOKEN" ] && { echo "godmin login failed"; exit 1; }
AUTH=(-H "Authorization: Bearer $TOKEN" -b "$JAR" -H 'content-type: application/json')
echo "signed in as $GE"

echo
echo "=========== WHERE DO FINDINGS LIVE ==========="
curl -s "${AUTH[@]}" "$API/swagger/json" -o /tmp/.oapi 2>/dev/null
grep -oE '"/[^"]*five_s_findings[^"]*"' /tmp/.oapi 2>/dev/null | tr -d '"' | sort -u | sed 's/^/  /'
[ -s /tmp/.oapi ] || echo "  (no openapi document served)"

echo
echo "=========== READING FINDINGS ==========="
for p in /five_s_findings /v1/five_s_findings /api/five_s_findings /entity/five_s_findings; do
  c=$(curl -s -o "$OUT" -w '%{http_code}' "${AUTH[@]}" "$API$p?limit=1")
  printf '  GET %-28s %s  %s\n' "$p" "$c" "$(head -c 80 "$OUT")"
  [ "$c" = 200 ] && BASE=$p
done
[ -z "${BASE:-}" ] && { echo "  could not find the findings route; stopping."; exit 1; }
echo "  using $BASE"

echo
echo "=========== CREATE ONE THE WAY THE SCREEN DOES ==========="
echo "  --- A: without finding_no (what a form that does not compute it sends) ---"
c=$(curl -s -o "$OUT" -w '%{http_code}' "${AUTH[@]}" -X POST "$API$BASE" \
  -d '{"description":"nucleus probe","status":"open"}')
echo "  status $c"; head -c 500 "$OUT" | fold -s -w 130 | sed 's/^/    /'; echo

echo "  --- B: with finding_no supplied ---"
c=$(curl -s -o "$OUT" -w '%{http_code}' "${AUTH[@]}" -X POST "$API$BASE" \
  -d '{"description":"nucleus probe","status":"open","finding_no":999999}')
echo "  status $c"; head -c 500 "$OUT" | fold -s -w 130 | sed 's/^/    /'; echo
ID=$(grep -oE '"id":"[0-9a-f-]{36}"' "$OUT" | head -1 | sed 's/.*":"//;s/"//')
if [ -n "$ID" ]; then
  echo "  created $ID -- removing it again"
  curl -s -o /dev/null -w '  delete: %{http_code}\n' "${AUTH[@]}" -X DELETE "$API$BASE/$ID"
fi

echo
echo "=========== WHAT THE SERVER LOGGED WHILE WE DID THAT ==========="
tail -40 /root/be13.log | sed 's/\x1b\[[0-9;]*m//g' |
  grep -iE 'error|five_s|violat|null|constraint' | tail -10 | cut -c1-150 | sed 's/^/  /'

echo
echo "=========== THE COLUMN THAT HAS NO DEFAULT ==========="
sudo -u postgres psql -d biltim -At -F' | ' -c "
  select column_name, data_type, is_nullable, coalesce(column_default,'NO DEFAULT')
  from information_schema.columns
  where table_schema='main' and table_name='five_s_findings'
    and (is_nullable='NO')
  order by ordinal_position;" 2>&1 | sed 's/^/  /'
echo "  rows currently in five_s_findings: $(sudo -u postgres psql -d biltim -At -c 'select count(*) from main.five_s_findings;' 2>&1)"
