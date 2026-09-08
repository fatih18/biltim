#!/usr/bin/env bash
# /docs/json is 119KB but a naive grep found no paths in it, and a Bearer header
# without the session cookie came back 401 everywhere -- which made 404 and 401
# indistinguishable. Parse the document properly, and probe with the cookie the
# browser would actually carry.
set -u
API=localhost:1001
D=/tmp/.doc
curl -s "$API/docs/json" -o "$D"
echo "document: $(wc -c < "$D") bytes"
echo
echo "=========== HOW IT IS SHAPED ==========="
head -c 400 "$D" | fold -s -w 130 | sed 's/^/  /'
echo
echo "=========== DOES IT MENTION THE 5S TABLES ==========="
for t in five_s_findings five_s_audits five_s_locations five_s_actions; do
  printf '  %-20s %s occurrences\n' "$t" "$(grep -o "$t" "$D" | wc -l)"
done
echo "  --- context around the first five_s mention ---"
grep -oE '.{90}five_s_findings.{60}' "$D" | head -3 | sed 's/^/    /'

echo
echo "=========== EVERY PATH IN THE DOCUMENT ==========="
tr ',{' '\n\n' < "$D" | grep -oE '"/[^"]*"' | tr -d '"' | sort -u | head -60 | sed 's/^/  /'
echo "  total distinct: $(tr ',{' '\n\n' < "$D" | grep -oE '"/[^"]*"' | sort -u | wc -l)"

echo
echo "=========== PROBE WITH A REAL SESSION (cookie, as the browser has) ==========="
ENV_FILE=/root/apps/biltim/Nucleus/apps/be-nucleus/.env
GE=$(grep -m1 '^GODMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
GP=$(grep -m1 '^GODMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
JAR=$(mktemp)
T=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H 'content-type: application/json' \
     --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")" |
    grep -oE '"accessToken":"[^"]+"' | head -1 | sed 's/.*":"//;s/"//')
echo "  token ${#T} chars, cookies: $(grep -c nucleus "$JAR" 2>/dev/null)"
for p in /auth/me /users /roles /five_s_findings /five_s_audits; do
  c=$(curl -s -o /tmp/.o -w '%{http_code}' -H "Authorization: Bearer $T" -b "$JAR" "$API$p?limit=1")
  printf '  GET %-20s %s  %s\n' "$p" "$c" "$(head -c 80 /tmp/.o)"
done
rm -f "$JAR" /tmp/.o
