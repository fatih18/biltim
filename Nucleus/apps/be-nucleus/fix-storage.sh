#!/usr/bin/env bash
# Bring the uploaded files to where the new process actually looks.
#
# Every files row stores a RELATIVE path -- './storage/images/anonymous'. The old
# backend ran from dist-deployment/backend, so that resolved there, and that is
# where the bytes physically are. The new backend runs from apps/be-nucleus, so
# the same string resolves somewhere empty and /cdn/:id answers 404 "File not
# found" for every photo ever uploaded.
#
# Copied rather than moved: the old bundle keeps its copy until you delete the
# whole dist-deployment directory, so this is reversible by deleting what it
# creates. New uploads land in the new location, which is why consolidating
# there is the right direction.
#
#   git pull && bash apps/be-nucleus/fix-storage.sh
set -u
OLD=/root/apps/biltim/Nucleus/dist-deployment/backend/storage
NEW=/root/apps/biltim/Nucleus/apps/be-nucleus/storage
BE=http://localhost:1001
q() { sudo -u postgres psql -d biltim -At -c "$1"; }

echo "== before =="
echo "  old bundle : $([ -d "$OLD" ] && find "$OLD" -type f | wc -l || echo 0) file(s)  $OLD"
echo "  new app    : $([ -d "$NEW" ] && find "$NEW" -type f | wc -l || echo 0) file(s)  $NEW"

if [ ! -d "$OLD" ]; then echo "  nothing to copy -- old storage is not there"; exit 0; fi

echo
echo "== copying (never overwriting something already in the new location) =="
mkdir -p "$NEW"
# -n so a file the new app has already written wins over the old bundle's copy.
cp -Rn "$OLD/." "$NEW/" 2>/dev/null
echo "  new app now: $(find "$NEW" -type f | wc -l) file(s)"

echo
echo "== can the CDN serve them now =="
JAR=$(mktemp)
curl -s -c "$JAR" -o /dev/null -X POST "$BE/auth/login" \
  -d email=godmin@nucleus.com -d password=q1w2e3r4t5
served=0; failed=0
while read -r fid; do
  [ -n "$fid" ] || continue
  read -r code ctype size <<<"$(curl -s -b "$JAR" -o /tmp/.c -w '%{http_code} %{content_type} %{size_download}' "$BE/cdn/$fid")"
  if [ "$code" = 200 ] && [ "${ctype#image/}" != "$ctype" ]; then
    served=$((served+1)); printf '  200  %s  %s  %s bytes\n' "$ctype" "${fid:0:8}" "$size"
  else
    failed=$((failed+1)); printf '  %s  %s  %s  <-- still not served\n' "$code" "$ctype" "${fid:0:8}"
  fi
done < <(q "select id from main.files order by created_at desc;")
rm -f "$JAR" /tmp/.c

echo
echo "  $served served as images, $failed not"
[ "$failed" -eq 0 ] || exit 1
