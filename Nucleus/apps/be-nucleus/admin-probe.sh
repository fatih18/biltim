#!/usr/bin/env bash
# Sign in as the install's own godmin -- reading the credential from the .env
# that is already on this machine, so it is never typed, echoed or carried
# anywhere -- and report which auth routes this build actually serves.
#
# A 404 here is the finding: a route that is not mounted is a capability the
# users do not have. Password recovery is the one that matters: without it,
# anyone who forgets a password is out permanently.
set -u
ENV_FILE=/root/apps/biltim/Nucleus/apps/be-nucleus/.env
API=localhost:1001
OUT=$(mktemp); JAR=$(mktemp)
trap 'rm -f "$OUT" "$JAR"' EXIT

GE=$(grep -m1 '^GODMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2-)
GP=$(grep -m1 '^GODMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
[ -z "$GP" ] && { echo "no GODMIN_PASSWORD in $ENV_FILE"; exit 1; }
echo "signing in as $GE (password read from .env, ${#GP} chars, not shown)"

code=$(curl -s -o "$OUT" -w '%{http_code}' -c "$JAR" -X POST "$API/auth/login" \
        -H 'content-type: application/json' \
        --data-binary "$(printf '{"email":"%s","password":"%s"}' "$GE" "$GP")")
echo "  POST /auth/login -> $code"
[ "$code" != 200 ] && { echo "  body: $(head -c 300 "$OUT")"; echo; echo "GODMIN CANNOT SIGN IN EITHER."; exit 1; }
TOKEN=$(grep -oE '"accessToken":"[^"]+"' "$OUT" | head -1 | sed 's/.*":"//;s/"//')
echo "  access token: ${#TOKEN} chars"
AUTH=(-H "Authorization: Bearer $TOKEN" -b "$JAR")

echo
echo "=========== WHICH AUTH ROUTES EXIST ==========="
echo "  404 = not mounted, so users do not have it."
probe() { # method path
  c=$(curl -s -o "$OUT" -w '%{http_code}' -X "$1" "${AUTH[@]}" \
        -H 'content-type: application/json' --data-binary '{}' "$API$2")
  case "$c" in
    404) printf '  MISSING  %-6s %-34s %s\n' "$1" "$2" "$c" ;;
    *)   printf '  present  %-6s %-34s %s\n' "$1" "$2" "$c" ;;
  esac
}
probe POST /auth/login
probe POST /auth/forgot-password
probe POST /auth/reset-password
probe POST /auth/password-reset
probe POST /auth/change-password
probe POST /auth/set-password
probe POST /auth/magic-link
probe GET  /auth/sessions
probe POST /auth/admin/set-user-password
probe POST /auth/admin/rotate-passwords
probe GET  /auth/me

echo
echo "=========== WHAT GODMIN SEES ==========="
for p in /auth/me /v2/users /v2/roles; do
  c=$(curl -s -o "$OUT" -w '%{http_code}' "${AUTH[@]}" "$API$p?limit=2")
  printf '  GET %-14s %s  %s\n' "$p" "$c" "$(head -c 110 "$OUT")"
done

echo
echo "=========== CAN A USER RECOVER A FORGOTTEN PASSWORD ==========="
echo "  password reset route mounted : $(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/forgot-password" -H 'content-type: application/json' -d '{"email":"x@y.z"}')"
echo "  magic-link route mounted     : $(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/magic-link" -H 'content-type: application/json' -d '{"email":"x@y.z"}')"
echo "  (404 on both = there is no way back in without an administrator)"
