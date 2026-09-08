#!/usr/bin/env bash
# Before putting the backend under a supervisor, learn exactly how the running
# process was started: its working directory, its environment, and where its
# configuration comes from. A unit that starts the binary without the same
# environment starts a backend that cannot reach the database.
set -u
pid=$(ss -lntpH 2>/dev/null | grep ':1001' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
echo "backend pid: ${pid:-NOT FOUND}"
[ -z "${pid:-}" ] && exit 1

echo
echo "=========== HOW IT WAS STARTED ==========="
echo "  cwd:  $(readlink -f /proc/$pid/cwd)"
echo "  exe:  $(readlink -f /proc/$pid/exe)"
printf '  cmd:  '; tr '\0' ' ' < "/proc/$pid/cmdline"; echo
echo "  parent chain:"
p=$pid; for _ in 1 2 3 4; do
  [ "$p" = 1 ] && break
  printf '    %s  %s\n' "$p" "$(tr '\0' ' ' < /proc/$p/cmdline | cut -c1-110)"
  p=$(awk '{print $4}' "/proc/$p/stat" 2>/dev/null) || break
done

echo
echo "=========== ITS ENVIRONMENT (secret VALUES masked) ==========="
tr '\0' '\n' < "/proc/$pid/environ" | sort | while IFS='=' read -r k v; do
  case "$k" in
    *PASS*|*SECRET*|*KEY*|*TOKEN*|*DSN*|*URL*|*URI*|*CONN*)
      printf '  %s=<set, %s chars>\n' "$k" "${#v}" ;;
    *) printf '  %s=%s\n' "$k" "$(printf '%s' "$v" | cut -c1-70)" ;;
  esac
done

echo
echo "=========== WHERE CONFIG COMES FROM ==========="
d=$(readlink -f "/proc/$pid/cwd")
ls -la "$d"/.env* "$d"/config.json 2>/dev/null | sed 's/^/  /'
echo "  --- package.json start script ---"
grep -A6 '"scripts"' "$d/package.json" 2>/dev/null | sed 's/^/  /'
echo "  --- does it read a .env file? ---"
grep -rlE "\.env" "$d/src" 2>/dev/null | head -3 | sed 's/^/  /'

echo
echo "=========== THE FRONTEND, SAME QUESTIONS ==========="
fpid=$(ss -lntpH 2>/dev/null | grep ':3000' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
echo "  frontend pid: ${fpid:-NOT FOUND}"
[ -n "${fpid:-}" ] && {
  echo "  cwd: $(readlink -f /proc/$fpid/cwd)"
  printf '  cmd: '; tr '\0' ' ' < "/proc/$fpid/cmdline"; echo
  tr '\0' '\n' < "/proc/$fpid/environ" | grep -iE '^(NODE_ENV|PORT|AUTH_API|NEXT_PUBLIC)' | cut -c1-100 | sed 's/^/    /'
}
