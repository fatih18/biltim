#!/usr/bin/env bash
# Guessing route names produced four 404s. Ask the server for its own route
# list instead: this build documents itself at /docs.
set -u
API=localhost:1001
for p in /docs/json /docs/openapi.json /docs /swagger/json /openapi.json; do
  c=$(curl -s -o /tmp/.d -w '%{http_code}' "$API$p")
  n=$(wc -c < /tmp/.d)
  printf '  %-22s %s  %s bytes\n' "$p" "$c" "$n"
  if [ "$c" = 200 ] && [ "$n" -gt 500 ]; then DOC=/tmp/.d; DOCP=$p; fi
done
[ -z "${DOC:-}" ] && { echo "no document served; falling back to a path sweep"; }

if [ -n "${DOC:-}" ]; then
  echo
  echo "=========== EVERY PATH THIS BUILD SERVES (from $DOCP) ==========="
  grep -oE '"/[a-zA-Z0-9_{}/-]*"' "$DOC" | tr -d '"' | sort -u | sed 's/^/  /'
  echo
  echo "  --- anything 5s ---"
  grep -oE '"/[a-zA-Z0-9_{}/-]*"' "$DOC" | tr -d '"' | grep -i five | sort -u | sed 's/^/  /'
  echo "  (nothing above = the 5S tables have no HTTP routes at all)"
fi

echo
echo "=========== SWEEP THE OBVIOUS SHAPES ==========="
ENV_FILE=/root/apps/biltim/Nucleus/apps/be-nucleus/.env
GE=$(grep -m1 '^GODMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
GP=$(grep -m1 '^GODMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
T=$(curl -s -X POST "$API/auth/login" -H 'content-type: application/json' \
     --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")" |
    grep -oE '"accessToken":"[^"]+"' | head -1 | sed 's/.*":"//;s/"//')
for p in /five_s_findings /fiveSFindings /five-s-findings /findings \
         /five_s_audits /five_s_locations /roles /claims /companies /users /profiles; do
  c=$(curl -s -o /tmp/.d -w '%{http_code}' -H "Authorization: Bearer $T" "$API$p?limit=1")
  printf '  GET %-22s %s  %s\n' "$p" "$c" "$(head -c 70 /tmp/.d)"
done
rm -f /tmp/.d
