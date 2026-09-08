#!/usr/bin/env bash
# Three of the eleven deaths ended long, healthy runs (4d 1h, 4d 17h, 35h 49m).
# The backend runs from a snap, and a snap refresh kills the running binary
# without a signal the process can log -- which is what "vanished with no
# goodbye and no error" looks like from inside. Test that.
set -u
echo "=========== IS BUN A SNAP, AND WHEN DID IT REFRESH ==========="
readlink -f "$(command -v bun)" | sed 's/^/  bun binary: /'
snap list --all bun-js 2>&1 | sed 's/^/  /'
echo "  --- refresh history (snap kills running processes on refresh) ---"
snap changes 2>&1 | tail -20 | sed 's/^/  /'
echo "  --- when snapd last refreshed anything ---"
snap refresh --time 2>&1 | sed 's/^/  /'

echo
echo "=========== DID THE KERNEL KILL IT ==========="
dmesg -T 2>&1 | grep -iE 'oom|killed process|segfault|general protection' | tail -15 | sed 's/^/  /'
echo "  dmesg lines total: $(dmesg 2>/dev/null | wc -l)  (0 = dmesg is restricted, absence proves nothing)"
journalctl --since '30 days ago' --no-pager 2>&1 |
  grep -iE 'oom|killed process|segfault|bun' | tail -15 | cut -c1-150 | sed 's/^/  /'

echo
echo "=========== EXACT DEATH AND BIRTH TIMES ==========="
for f in $(ls -1t /root/be*.log | tac); do
  s=$(date -r "$f" '+%d %b %H:%M')
  # first timestamped line = when this run started; file mtime = when it stopped
  b=$(grep -m1 -oE '^[0-9]{2}:[0-9]{2}:[0-9]{2}' "$f" 2>/dev/null)
  printf '  %-12s started ~%s   last wrote %s\n' "$(basename "$f")" "${b:-?}" "$s"
done

echo
echo "=========== MEMORY TREND OF THE LIVE PROCESS ==========="
pid=$(ss -lntpH 2>/dev/null | grep ':1001' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
echo "  backend pid: ${pid:-not found}"
[ -n "${pid:-}" ] && {
  ps -o pid,etime,rss,vsz,pcpu -p "$pid" | sed 's/^/  /'
  grep -E 'VmRSS|VmHWM|VmSwap' "/proc/$pid/status" 2>/dev/null | sed 's/^/  /'
  echo "  open file descriptors: $(ls /proc/$pid/fd 2>/dev/null | wc -l) / $(grep -m1 'Max open files' /proc/$pid/limits | awk '{print $4}')"
}
