#!/usr/bin/env bash
# Hunt for every "the screen cannot satisfy this" defect of the kind that broke
# single-finding creation.
#
# An empty POST writes nothing -- it is refused by validation -- so this asks
# every entity, in the server's own words, which fields it demands before it
# will accept a create. Comparing that against what the screens actually send is
# what turns one known bug into the full list.
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
[ -z "$T" ] && { echo "login failed"; exit 1; }

ROUTES="boardMeetingDecisions companies fiveSActions fiveSAuditAnswers fiveSAuditDrafts
        fiveSAuditPlans fiveSAuditTeamMembers fiveSAuditTeams fiveSAudits fiveSFindingTypes
        fiveSFindings fiveSLocations fiveSQuestions fiveSSteps roles claims userClaims
        auditLogs users profiles files addresses phones notifications"

echo "=========== CAN EACH SCREEN READ ITS DATA ==========="
for r in $ROUTES; do
  c=$(curl -s -o "$OUT" -w '%{http_code}' "${A[@]}" "$API/$r?limit=1")
  n=$(grep -oE '"total":[0-9]+' "$OUT" | head -1 | cut -d: -f2)
  if [ "$c" = 200 ]; then printf '  ok    GET %-24s rows=%s\n' "$r" "${n:-?}"
  else printf '  FAIL  GET %-24s %s  %s\n' "$r" "$c" "$(head -c 110 "$OUT")"; fi
done

echo
echo "=========== WHAT EACH CREATE DEMANDS (empty POST writes nothing) ==========="
for r in $ROUTES; do
  c=$(curl -s -o "$OUT" -w '%{http_code}' "${A[@]}" -X POST "$API/$r" -d '{}')
  req=$(grep -oE '"field":"[^"]+"' "$OUT" | sed 's/.*":"//;s/"//' | paste -sd, -)
  case "$c" in
    400|422) printf '  %-24s requires: %s\n' "$r" "${req:-<unnamed>}" ;;
    200|201)  printf '  %-24s ACCEPTED AN EMPTY BODY -- a row was created with nothing in it\n' "$r" ;;
    401|403) printf '  %-24s %s (not permitted for godmin)\n' "$r" "$c" ;;
    404)     printf '  %-24s no create route\n' "$r" ;;
    500|502) printf '  %-24s %s SERVER ERROR: %s\n' "$r" "$c" "$(head -c 140 "$OUT")" ;;
    *)       printf '  %-24s %s  %s\n' "$r" "$c" "$(head -c 110 "$OUT")" ;;
  esac
done

echo
echo "=========== DID ANY EMPTY POST ACTUALLY WRITE A ROW ==========="
sudo -u postgres psql -d biltim -At -c "
  select 'five_s_findings=' || count(*) from main.five_s_findings" 2>&1 | sed 's/^/  /'
echo "  (was 2 before this sweep; anything higher means an empty POST wrote)"
