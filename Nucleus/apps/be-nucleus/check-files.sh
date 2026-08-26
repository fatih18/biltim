#!/usr/bin/env bash
# Can the app still serve a photo it stored before the upgrade?
#
# nucleus reads a file's location out of the row -- path.join(record.path,
# record.name) -- so an upload written by the old backend is reachable only if
# that path still resolves from where the new process runs. The audit reported
# /cdn/:id answering application/json, which is what this route returns when it
# cannot find the bytes, so the question is open.
#
#   git pull && bash apps/be-nucleus/check-files.sh
set -u
BE=http://localhost:1001
q() { sudo -u postgres psql -d biltim -At -c "$1"; }

echo "== how many files does the database think it has =="
echo "  rows: $(q 'select count(*) from main.files;')"

echo
echo "== a sample row, as the CDN route will read it =="
q "select id || E'\n  name          : ' || coalesce(name,'<null>')
        || E'\n  original_name : ' || coalesce(original_name,'<null>')
        || E'\n  path          : ' || coalesce(path,'<null>')
        || E'\n  mime_type     : ' || coalesce(mime_type,'<null>')
        || E'\n  size          : ' || coalesce(size::text,'<null>')
   from main.files order by created_at desc limit 3;" | sed 's/^/  /'

echo
echo "== does the byte actually exist where the row says =="
while IFS='|' read -r fid fpath fname; do
  [ -n "$fid" ] || continue
  full="$fpath/$fname"
  if [ -f "$full" ]; then
    echo "  ON DISK  $full ($(stat -c%s "$full" 2>/dev/null) bytes)"
  else
    echo "  MISSING  $full"
    # Where else might it be? The old backend wrote under apps/be/storage.
    hit=$(find /root/apps/biltim -name "$fname" -type f 2>/dev/null | head -1)
    [ -n "$hit" ] && echo "           but found at: $hit"
  fi
done < <(q "select id || '|' || coalesce(path,'') || '|' || coalesce(name,'') from main.files order by created_at desc limit 3;")

echo
echo "== what the two routes answer for a real id =="
FID=$(q "select id from main.files order by created_at desc limit 1;")
if [ -z "$FID" ]; then echo "  (no rows -- nothing to serve)"; exit 0; fi
JAR=$(mktemp)
curl -s -c "$JAR" -o /dev/null -X POST "$BE/auth/login" \
  -d email=godmin@nucleus.com -d password=q1w2e3r4t5
for route in files cdn; do
  ct=$(curl -s -b "$JAR" -o /tmp/.f -w '%{http_code} %{content_type} %{size_download}' "$BE/$route/$FID")
  echo "  /$route/:id -> $ct"
  case "$(head -c 1 /tmp/.f)" in
    '{') echo "      body: $(head -c 200 /tmp/.f)" ;;
    *)   echo "      bytes: $(head -c 16 /tmp/.f | od -An -tx1 | tr -s ' ')" ;;
  esac
done
rm -f "$JAR" /tmp/.f

echo
echo "== where the process thinks it is (paths in the row are relative to this) =="
echo "  be cwd: $(readlink /proc/$(pgrep -f 'be-nucleus/src/index.ts' | head -1)/cwd 2>/dev/null || echo '<not running>')"
