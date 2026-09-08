#!/usr/bin/env bash
# The backend has recorded "vanished with no goodbye" more than once. Count how
# often, find out what (if anything) brings it back, and confirm nothing is
# supervising it.
set -u
strip() { sed 's/\x1b\[[0-9;]*m//g'; }

echo "=========== HOW OFTEN HAS IT DIED ==========="
for f in /root/be*.log /root/fe*.log; do
  [ -f "$f" ] || continue
  n=$(grep -c "ended abnormally" "$f" 2>/dev/null)
  first=$(head -1 "$f" | strip | cut -c1-60)
  printf '  %-18s %s  crashes:%-3s  starts: %s\n' \
    "$(basename "$f")" "$(date -r "$f" '+%d %b %H:%M')" "$n" "$first"
done
echo "  total 'ended abnormally' across all logs: $(cat /root/be*.log /root/fe*.log 2>/dev/null | grep -c 'ended abnormally')"
echo
echo "  --- every abnormal-end line, in order ---"
grep -h "ended abnormally" /root/be*.log 2>/dev/null | strip |
  sed -E 's/.*Ran ([^,]*),.*/  ran \1 then vanished/' | tail -25

echo
echo "=========== WHAT IS RUNNING RIGHT NOW ==========="
echo "--- screen sessions ---"; screen -ls 2>&1 | sed 's/^/  /'
echo "--- bun processes ---"
ps -eo pid,ppid,etime,rss,cmd | grep -i '[b]un' | cut -c1-150 | sed 's/^/  /'
echo "--- listeners ---"
ss -lntp 2>/dev/null | grep -E ':(1001|3000)' | cut -c1-150 | sed 's/^/  /'

echo
echo "=========== IS ANYTHING SUPERVISING IT ==========="
echo "--- systemd units mentioning nucleus/biltim/bun ---"
systemctl list-units --type=service --all --no-legend 2>/dev/null |
  grep -iE 'nucleus|biltim|bun|be-' | sed 's/^/  /'
echo "  (empty = no service supervises the backend)"
echo "--- root crontab ---"; crontab -l 2>&1 | grep -v '^#' | sed 's/^/  /'
echo "--- machine uptime / reboots ---"
uptime | sed 's/^/  /'
last -x reboot shutdown 2>/dev/null | head -6 | sed 's/^/  /'

echo
echo "=========== WHAT DOES THE END OF A DEAD LOG LOOK LIKE ==========="
prev=$(ls -1t /root/be*.log | sed -n 2p)
echo "  tail of $prev (the run that died):"
tail -12 "$prev" | strip | cut -c1-150 | sed 's/^/    /'
