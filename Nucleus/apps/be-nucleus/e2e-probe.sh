#!/usr/bin/env bash
# Prove, end to end and on the live box, that a person can sign in and use a
# feature -- without anyone's real password.
#
# It creates one clearly-marked throwaway account, gives it the same roles as an
# existing user so the authorisation path is exercised for real, signs in over
# HTTP exactly as the browser does, calls the endpoints a signed-in user calls,
# and then deletes the account. The account is removed on every exit path.
set -u
PSQL() { sudo -u postgres psql -d biltim -At -c "$1" 2>&1; }
API=localhost:1001
EMAIL='zz-nucleus-probe@example.invalid'
TEMPLATE=${TEMPLATE:-denetci2@denetci.com}
JAR=$(mktemp); OUT=$(mktemp)

cleanup() {
  echo
  echo "=========== CLEANUP ==========="
  PSQL "delete from main.user_roles where user_id in (select id from main.users where email='$EMAIL');" | sed 's/^/  roles: /'
  PSQL "delete from main.users where email='$EMAIL';" | sed 's/^/  user:  /'
  left=$(PSQL "select count(*) from main.users where email='$EMAIL';")
  echo "  probe rows remaining: $left  (must be 0)"
  rm -f "$JAR" "$OUT"
}
trap cleanup EXIT

pass=0; fail=0
check() { # name expected actual [detail]
  if [ "$2" = "$3" ]; then printf '  ok    %-38s %s\n' "$1" "$3"; pass=$((pass+1))
  else printf '  FAIL  %-38s got %s want %s  %s\n' "$1" "$3" "$2" "${4:-}"; fail=$((fail+1)); fi
}

echo "=========== 1. MINT A THROWAWAY ACCOUNT ==========="
PW="Probe-$(head -c 12 /dev/urandom | base64 | tr -d '/+=')-9"
HASH=$(bun -e "console.log(await Bun.password.hash(process.argv[1],{algorithm:'bcrypt',cost:10}))" "$PW" 2>/dev/null)
case "$HASH" in
  '$2'*) echo "  bcrypt hash generated (${#HASH} chars)";;
  *) echo "  could not hash the password: $HASH"; exit 1;;
esac
PSQL "delete from main.users where email='$EMAIL';" >/dev/null
ID=$(PSQL "insert into main.users (email, password, is_active, first_name, last_name)
           values ('$EMAIL', '$HASH', true, 'Nucleus', 'Probe') returning id;")
case "$ID" in
  *-*-*) echo "  created: $ID";;
  *) echo "  INSERT failed: $ID"; exit 1;;
esac
echo "  copying roles from $TEMPLATE:"
PSQL "insert into main.user_roles (user_id, role_id)
      select '$ID', role_id from main.user_roles
      where user_id = (select id from main.users where email='$TEMPLATE');" | sed 's/^/    /'
PSQL "select count(*) from main.user_roles where user_id='$ID';" | sed 's/^/    roles copied: /'

echo
echo "=========== 2. SIGN IN THE WAY THE BROWSER DOES ==========="
code=$(curl -s -o "$OUT" -w '%{http_code}' -c "$JAR" -X POST "$API/auth/login" \
        -H 'content-type: application/json' \
        --data-binary "$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PW")")
check "POST /auth/login" 200 "$code" "$(head -c 200 "$OUT")"
TOKEN=$(grep -oE '"(accessToken|token)":"[^"]+"' "$OUT" | head -1 | sed 's/.*":"//;s/"//')
[ -n "$TOKEN" ] && echo "  access token received (${#TOKEN} chars)" || echo "  no access token in the body"
AUTH=(-H "Authorization: Bearer $TOKEN" -b "$JAR")

echo
echo "=========== 3. USE THE SESSION ==========="
for path in /auth/me /auth/sessions; do
  c=$(curl -s -o "$OUT" -w '%{http_code}' "${AUTH[@]}" "$API$path")
  check "GET $path" 200 "$c" "$(head -c 140 "$OUT")"
done

echo
echo "=========== 4. USE A FEATURE ==========="
# ask the running server which routes it actually serves, then exercise real ones
curl -s "$API/swagger/json" -o /tmp/.api 2>/dev/null || curl -s "$API/openapi" -o /tmp/.api 2>/dev/null
routes=$(grep -oE '"/v[0-9]+/[a-zA-Z0-9_/-]+"' /tmp/.api 2>/dev/null | tr -d '"' |
         grep -vE '\{|auth' | sort -u | head -6)
if [ -z "$routes" ]; then echo "  (no route list from the server; trying common ones)"; routes="/v2/users /v2/roles"; fi
for path in $routes; do
  c=$(curl -s -o "$OUT" -w '%{http_code}' "${AUTH[@]}" "$API$path?limit=1")
  case "$c" in
    200) printf '  ok    %-38s 200  %s\n' "GET $path" "$(head -c 90 "$OUT")"; pass=$((pass+1));;
    401|403) printf '  auth  %-38s %s  (role gate, not a fault)\n' "GET $path" "$c";;
    *) printf '  FAIL  %-38s %s  %s\n' "GET $path" "$c" "$(head -c 140 "$OUT")"; fail=$((fail+1));;
  esac
done

echo
echo "=========== 5. WAS THE SIGN-IN RECORDED ==========="
PSQL "select 'last_login_at=' || coalesce(last_login_at::text,'null') ||
             '  login_count=' || coalesce(login_count::text,'null') ||
             '  failed=' || coalesce(failed_login_attempts::text,'null')
      from main.users where email='$EMAIL';" | sed 's/^/  /'
printf '  sessions in redis now: %s\n' "$(redis-cli --scan --pattern 'session:*' 2>/dev/null | wc -l)"

echo
echo "=========== RESULT: $pass ok, $fail failed ==========="
