#!/usr/bin/env bash
# The backend and frontend run inside bare `screen` sessions. Eleven times the
# backend has ended "with no goodbye and no error", and nothing brings it back --
# it stays down until a person notices. This puts both under systemd so a crash
# costs seconds instead of hours.
#
#   bash supervise.sh plan      # write the units, start nothing, show them
#   bash supervise.sh cutover   # switch to systemd, verify, roll back if unhealthy
#   bash supervise.sh rollback  # go back to screen
set -u
BE_DIR=/root/apps/biltim/Nucleus/apps/be-nucleus
FE_DIR=/root/apps/biltim/Nucleus/apps/fe
BUN=/snap/bin/bun

fe_start() { # the fe start script, read from its own package.json
  grep -o '"start" *: *"[^"]*"' "$FE_DIR/package.json" 2>/dev/null | head -1 | sed 's/.*: *"//;s/"$//'
}

health() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 localhost:1001/health 2>/dev/null; }
page()   { curl -s -o /dev/null -w '%{http_code}' --max-time 8 localhost:3000/login 2>/dev/null; }

write_units() {
  cat > /etc/systemd/system/biltim-be.service <<UNIT
[Unit]
Description=Biltim Nucleus backend (port 1001)
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$BE_DIR
Environment=HOME=/root
ExecStart=$BUN run src/index.ts
Restart=always
RestartSec=3
# Do not give up: this is the whole point of the unit.
StartLimitIntervalSec=0
StandardOutput=append:/root/be-systemd.log
StandardError=append:/root/be-systemd.log

[Install]
WantedBy=multi-user.target
UNIT

  cat > /etc/systemd/system/biltim-fe.service <<UNIT
[Unit]
Description=Biltim Nucleus frontend (port 3000)
After=network-online.target biltim-be.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$FE_DIR
Environment=HOME=/root
ExecStart=$BUN run start
Restart=always
RestartSec=3
StartLimitIntervalSec=0
StandardOutput=append:/root/fe-systemd.log
StandardError=append:/root/fe-systemd.log

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
}

case "${1:-plan}" in

plan)
  echo "=========== WHAT IS RUNNING NOW ==========="
  screen -ls 2>&1 | sed 's/^/  /'
  echo "  backend health : $(health)"
  echo "  login page     : $(page)"
  echo "  fe start script: $(fe_start)"
  echo
  write_units
  echo "=========== UNITS WRITTEN (nothing started) ==========="
  systemd-analyze verify /etc/systemd/system/biltim-be.service 2>&1 | sed 's/^/  be: /'
  systemd-analyze verify /etc/systemd/system/biltim-fe.service 2>&1 | sed 's/^/  fe: /'
  echo "  (no output above = both units are valid)"
  sed 's/^/  | /' /etc/systemd/system/biltim-be.service
  echo
  echo "  next: bash supervise.sh cutover"
  ;;

cutover)
  echo "=========== BEFORE ==========="
  echo "  health $(health)   page $(page)"
  write_units
  echo
  echo "=========== STOPPING THE SCREEN SESSIONS ==========="
  screen -S be -X quit 2>&1 | sed 's/^/  be: /'; echo "  be screen stopped"
  screen -S fe -X quit 2>&1 | sed 's/^/  fe: /'; echo "  fe screen stopped"
  sleep 3
  pkill -f 'bun run src/index.ts' 2>/dev/null; pkill -f 'next-server' 2>/dev/null
  sleep 2
  echo "  health after stop: $(health)  (000 expected -- it is down)"

  echo
  echo "=========== STARTING UNDER SYSTEMD ==========="
  systemctl enable --now biltim-be.service 2>&1 | sed 's/^/  /'
  for i in $(seq 1 30); do h=$(health); [ "$h" = 200 ] && break; sleep 2; done
  echo "  backend health after ${i}x2s: $h"
  systemctl enable --now biltim-fe.service 2>&1 | sed 's/^/  /'
  for i in $(seq 1 30); do p=$(page); [ "$p" = 200 ] && break; sleep 2; done
  echo "  login page after ${i}x2s: $p"

  if [ "$h" = 200 ] && [ "$p" = 200 ]; then
    echo
    echo "  BOTH HEALTHY under systemd."
    systemctl is-active biltim-be biltim-fe | sed 's/^/    /'
  else
    echo
    echo "  NOT HEALTHY -- rolling back to screen."
    "$0" rollback
  fi
  ;;

rollback)
  echo "=========== ROLLING BACK TO SCREEN ==========="
  systemctl disable --now biltim-be.service biltim-fe.service 2>&1 | sed 's/^/  /'
  sleep 2
  n=$(ls -1 /root/be*.log 2>/dev/null | wc -l)
  cd "$BE_DIR" && screen -dmS be -L -Logfile "/root/be$((n+1)).log" bun run start
  cd "$FE_DIR" && screen -dmS fe -L -Logfile "/root/fe$((n+1)).log" bun run start
  for i in $(seq 1 30); do h=$(health); [ "$h" = 200 ] && break; sleep 2; done
  echo "  back on screen: health $h  page $(page)"
  screen -ls 2>&1 | sed 's/^/  /'
  ;;

status)
  systemctl status biltim-be --no-pager -n 8 2>&1 | cut -c1-150 | sed 's/^/  /'
  echo "  health $(health)  page $(page)"
  ;;
esac
