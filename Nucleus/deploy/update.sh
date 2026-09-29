#!/usr/bin/env bash
# Biltim 5S — tek komutla guncelleme.
#
# Sunucuya uzun komut yazmak CyberArk/RDP konsolunda guvenilir degil: tuslar
# dusuyor, Shift'li karakterler (| " & { } : $) bozuluyor. Butun adimlar burada;
# konsola yazilacak tek sey:
#
#   cd /root/apps/biltim
#   bash update.sh              guncelle: git pull, derle, yeniden baslat
#   bash update.sh status       sadece durum; hicbir seye dokunmaz
#   bash update.sh nopull       git pull yapmadan derle + yeniden baslat
#   bash update.sh geri         yalniz on yuz: onceki derlemeyle yer degistir
#
# Neyi garanti eder:
# - Derleme canli .next'e degil .next-build'e yapilir. `next build` hedef
#   klasoru bastan siler; canli .next'e derlemek sitenin derleme boyunca
#   bozulmasi demekti (29 Eylul'de yasandi). Derleme basarisizsa canli siteye
#   hic dokunulmamis olur.
# - Is, konsoldan bagimsiz bir oturumda kosar. Konsol koparsa ya da Ctrl+C'ye
#   basilirsa sadece izleme durur, guncelleme yarida kalmaz.
# - Her servis icin ayri bakar: portu systemd servisi mi tutuyor, screen mi.
#   Servis kurulu ama portu baska bir surec tutuyorsa hicbir seye dokunmadan
#   durur; iki kopya ayni portta kosmaz.
# - Arka uc kalkmazsa kodu onceki surume alip arka ucu onunla kaldirir; on yuz
#   kalkmazsa onceki derlemeyi geri koyar. Geri alma da tutmazsa "SITE KAPALI"
#   diye acikca yazar; hic bir hata yolu "canli siteye dokunulmadi" diye
#   yalan soylemez.
# - git pull ve derleme zaman asimina sahip; ag kapaliysa sonsuza kadar asili
#   kalmaz.
#
# Kayit: /root/biltim-deploy/update.log   Son basarili surum: .../last-good

# Govde fonksiyon icinde: git pull bu dosyanin kendisini degistirirse bash yarim
# okunmus eski dosyadan devam etmesin; fonksiyon calismadan once tamami okunur.
main() {
  set -uo pipefail

  SELF=$(readlink -f "${BASH_SOURCE[0]}")
  REPO=$(cd "$(dirname "$SELF")/../.." && pwd)
  NUCLEUS="$REPO/Nucleus"
  BE_DIR="$NUCLEUS/apps/be-nucleus"
  FE_DIR="$NUCLEUS/apps/fe"
  # Tam yol bilerek: PATH'teki /snap/bin/bun olu bir bag, Next'i derleyemiyor.
  BUN=/usr/local/bin/bun
  STATE=/root/biltim-deploy
  LOG="$STATE/update.log"
  LAST_GOOD_FILE="$STATE/last-good"
  INSTALLED_FILE="$STATE/installed-for"
  BE_PORT=1001
  FE_PORT=3000

  local cmd=${1:-}
  case "$cmd" in
    '' | nopull | geri | status | --inner) ;;
    *) die "bilinmeyen komut: $cmd  (gecerli: status, nopull, geri)" ;;
  esac

  [ "$(id -u)" = 0 ] || die "root olarak calistir (sudo su -)."
  mkdir -p "$STATE" || die "$STATE olusturulamadi."

  if [ "$cmd" = status ]; then
    print_status
    return 0
  fi

  if [ "$cmd" != --inner ]; then
    run_detached "$@"
    return $?
  fi

  shift
  inner "${1:-}"
}

# Asil isi konsolun oturumundan ayri bir oturumda baslatir ve kaydi izler.
run_detached() {
  local from
  from=$(( $(stat -c %s "$LOG" 2>/dev/null || echo 0) + 1 ))
  echo "Guncelleme baslatiliyor. Konsol koparsa is yarida kalmaz."
  echo "Tekrar izlemek icin:  tail -f $LOG"
  echo
  setsid -w bash "$SELF" --inner "$@" </dev/null >>"$LOG" 2>&1 &
  local pid=$!
  tail -c "+$from" --pid="$pid" -f "$LOG"
  wait "$pid"
}

inner() {
  local mode=$1
  echo
  echo "=================== $(date '+%Y-%m-%d %H:%M:%S') update.sh ${mode:-guncelle} ==================="

  [ -x "$BUN" ] || die "$BUN yok ya da calismiyor."
  exec 9>"$STATE/lock"
  flock -n 9 || die "baska bir update.sh zaten calisiyor."
  cd "$REPO" || die "$REPO bulunamadi."

  if [ "$mode" = geri ]; then
    fe_toggle
    return $?
  fi

  local BE_MODE FE_MODE
  BE_MODE=$(svc_mode be "$BE_PORT")
  FE_MODE=$(svc_mode fe "$FE_PORT")
  echo "arka uc: $BE_MODE   on yuz: $FE_MODE"
  [ "$BE_MODE" = cakisma ] && die "biltim-be servisi kurulu ama $BE_PORT portunu baska bir surec tutuyor (eski screen?). Bak: screen -ls. Hicbir seye dokunulmadi."
  [ "$FE_MODE" = cakisma ] && die "biltim-fe servisi kurulu ama $FE_PORT portunu baska bir surec tutuyor (eski screen?). Bak: screen -ls. Hicbir seye dokunulmadi."

  # Elle yapilmis degisiklik varsa git pull ya reddeder ya da ustune yazar;
  # ikisi de sessiz olmamali. Asagidaki geri almalar da temiz agaca guvenir.
  local dirty
  dirty=$(git status --porcelain --untracked-files=no)
  if [ -n "$dirty" ]; then
    echo "$dirty"
    die "makinede git disi degisiklik var (yukarida). Bilerek yapilmadiysa geri almak icin: git checkout -- <dosya>"
  fi

  # 1) Kod
  local OLD NEW
  OLD=$(git rev-parse HEAD)
  if [ "$mode" = nopull ]; then
    echo "[1/5] git pull atlandi (nopull)."
  else
    echo "[1/5] git pull"
    timeout 120 git pull --ff-only ||
      die "git pull basarisiz ya da 2 dakikada bitmedi; hicbir seye dokunulmadi. GitHub'a cikis kapali olabilir: nc -zv -w 6 github.com 443"
  fi
  NEW=$(git rev-parse HEAD)
  echo "      $(git log --oneline -1 "$OLD")  ->  $(git log --oneline -1 "$NEW")"

  # 2) Bagimliliklar. Karsilastirma node_modules'un EN SON hangi surum icin
  #    kuruldugu ile yapilir ($INSTALLED_FILE), bu calismanin pull oncesiyle
  #    degil: elle yapilmis bir pull ya da geri donus degisikligi gizlemesin.
  #    Kayit HIC yoksa node_modules'un su anki kod icin kurulu oldugu
  #    varsayilir; kayit var ama commit degilse (yarim kalmis kurulum) kurulum
  #    zorunludur.
  local installed installed_now=0 need_install=0
  installed=$(cat "$INSTALLED_FILE" 2>/dev/null || true)
  if [ -z "$installed" ]; then
    installed=$OLD
  elif ! git cat-file -e "$installed^{commit}" 2>/dev/null; then
    need_install=1
  fi
  if [ "$need_install" = 0 ] && ! git diff --quiet "$installed" "$NEW" -- '*package.json' '*bun.lock'; then
    need_install=1
  fi
  if [ "$need_install" = 0 ]; then
    echo "[2/5] paket dosyalari degismedi, bun install atlandi."
  else
    echo "[2/5] bun install (npm'e erisim gerekir)"
    # Kurulum yarida kalirsa kayit bunu soylesin; sonraki calisma (nopull
    # dahil) kurulumu atlamasin.
    echo yarim >"$INSTALLED_FILE"
    # --frozen-lockfile: sunucuda bun.lock yeniden yazilmasin; uyusmazlik
    # sessizce "cozulmesin", hata olarak dursun.
    if ! (cd "$NUCLEUS" && timeout 900 "$BUN" install --frozen-lockfile); then
      code_back "$OLD" "$NEW"
      die "bun install basarisiz. Servisler yeniden baslatilmadi. node_modules yarim kalmis olabilir; calisan servisler etkilenmeyebilir ama yeniden baslarlarsa kalkmayabilirler. Ag acilinca: bash update.sh. $(site_state)"
    fi
    installed_now=1
    echo "$NEW" >"$INSTALLED_FILE"
  fi

  # 3) On yuz, canli .next'in yanina derlenir.
  echo "[3/5] on yuz .next-build klasorune derleniyor (birkac dakika). Site bu sirada normal calisir."
  rm -rf "$FE_DIR/.next-build"
  if ! (cd "$FE_DIR" && NEXT_DIST_DIR=.next-build timeout 1800 "$BUN" run build) || [ ! -f "$FE_DIR/.next-build/BUILD_ID" ]; then
    rm -rf "$FE_DIR/.next-build"
    code_back "$OLD" "$NEW"
    if [ "$installed_now" = 1 ]; then
      die "derleme basarisiz. On yuz derlemesine ve servislere dokunulmadi, AMA node_modules bu calismada yeni surum icin kuruldu; servisler yeniden baslarsa eski kodu yeni paketlerle calistirir. $(site_state)"
    fi
    die "derleme basarisiz. Canli on yuz derlemesine ve servislere dokunulmadi. $(site_state)"
  fi
  echo "$NEW" >"$FE_DIR/.next-build/DEPLOY_COMMIT"
  # Next derlerken distDir'e gore tsconfig yazabilir; git takibindeki bir
  # dosyayi degistirdiyse bir sonraki git pull reddeder.
  git checkout -- "$FE_DIR/tsconfig.json" 2>/dev/null

  # 4) Arka uc. config.json her acilista diskten okunur; restart yeter.
  #    Kalkmazsa kod onceki surume alinip arka uc onunla yeniden baslatilir.
  echo "[4/5] arka uc yeniden baslatiliyor"
  local rc
  restart_svc be "$BE_MODE" "$BE_DIR" "$BUN run src/index.ts"
  rc=$?
  if [ "$rc" = 2 ]; then
    rm -rf "$FE_DIR/.next-build"
    code_back "$OLD" "$NEW"
    die "eski arka uc sureci durdurulamadi; hicbir sey yeniden baslatilmadi. $(site_state)"
  fi
  if [ "$rc" != 0 ] || ! wait_ok "arka uc /health" be_code 120; then
    show_logs be "$BE_MODE"
    rm -rf "$FE_DIR/.next-build"
    [ "$installed_now" = 1 ] && echo "      not: node_modules bu calismada yeni surum icin kuruldu."
    if [ "$OLD" = "$NEW" ]; then
      die "arka uc ayaga kalkmadi ve donulecek onceki kod yok (kod degismedi). $(site_state) Bak: journalctl -u biltim-be -n 80 --no-pager"
    fi
    code_back "$OLD" "$NEW" ||
      die "arka uc ayaga kalkmadi ve kod onceki surume alinamadi. $(site_state) Bak: journalctl -u biltim-be -n 80 --no-pager"
    if restart_svc be "$BE_MODE" "$BE_DIR" "$BUN run src/index.ts" && wait_ok "arka uc (onceki surum)" be_code 120; then
      die "yeni arka uc ayaga kalkmadi; onceki surume donuldu. On yuze dokunulmadi. $(site_state)"
    fi
    die "yeni arka uc de onceki surum de 200 donmedi. $(site_state) Bak: journalctl -u biltim-be -n 80 --no-pager"
  fi

  # 5) On yuz: yeni derlemeyi yerine koy, yeniden baslat. Kalkmazsa onceki
  #    derlemeyi geri koy; basarisiz derleme .next-failed'e gider ki `geri`
  #    onu bir daha canliya almasin. `geri`nin hedefi (.next-prev) yeni
  #    derleme kanitlanana kadar silinmez, .next-prev-old'da bekler.
  echo "[5/5] on yuz yeni derlemeye geciyor"
  local live_commit
  live_commit=$(cat "$FE_DIR/.next/DEPLOY_COMMIT" 2>/dev/null || true)
  rm -rf "$FE_DIR/.next-prev-old"
  if [ -d "$FE_DIR/.next-prev" ]; then mv "$FE_DIR/.next-prev" "$FE_DIR/.next-prev-old" || die ".next-prev tasinamadi; on yuze dokunulmadi. $(site_state)"; fi
  if [ -d "$FE_DIR/.next" ]; then mv "$FE_DIR/.next" "$FE_DIR/.next-prev" || die ".next tasinamadi; on yuze dokunulmadi. $(site_state)"; fi
  if ! mv "$FE_DIR/.next-build" "$FE_DIR/.next"; then
    fe_undo_swap
    die ".next-build yerine konamadi; eski derleme yerinde birakildi. $(site_state)"
  fi
  restart_svc fe "$FE_MODE" "$FE_DIR" "$BUN run start"
  rc=$?
  if [ "$rc" = 2 ]; then
    rm -rf "$FE_DIR/.next-failed"
    mv "$FE_DIR/.next" "$FE_DIR/.next-failed" && fe_undo_swap
    die "eski on yuz sureci durdurulamadi; derleme takasi geri alindi, hicbir sey yeniden baslatilmadi. $(site_state)"
  fi
  if [ "$rc" != 0 ] || ! wait_ok "on yuz /login" fe_code 120; then
    show_logs fe "$FE_MODE"
    echo "      Onceki derleme geri konuyor."
    if fe_restore_prev "$FE_MODE"; then
      die "yeni on yuz ayaga kalkmadi; onceki derleme geri kondu. Arka uc yeni surumde. Basarisiz derleme: $FE_DIR/.next-failed $(site_state)"
    fi
    die "yeni on yuz de onceki derleme de 200 donmedi. $(site_state) Bak: journalctl -u biltim-fe -n 80 --no-pager"
  fi
  # Ayni commit yeniden derlendiyse (nopull) canlidan cikan derleme ayni
  # surumdu; gercek onceki surum .next-prev-old'daydi, `geri` onu gostersin.
  if [ -n "$live_commit" ] && [ "$live_commit" = "$NEW" ] && [ -d "$FE_DIR/.next-prev-old" ]; then
    rm -rf "$FE_DIR/.next-prev"
    mv "$FE_DIR/.next-prev-old" "$FE_DIR/.next-prev"
  else
    rm -rf "$FE_DIR/.next-prev-old"
  fi

  echo "$NEW" >"$LAST_GOOD_FILE"
  echo
  echo "TAMAM. Calisan surum: $(git log --oneline -1)"
  print_status
  return 0
}

# Hata yolunda kodu, calismaya devam eden surume geri alir: makine o arada
# yeniden baslarsa servisler denenmemis kodla kalkmasin. Agac en basta temiz
# dogrulandigi icin reset --hard yalnizca bu calismanin pull'unu geri alir;
# bir sonraki `bash update.sh` ayni commit'leri yeniden ceker.
code_back() {
  local old=$1 new=$2
  [ "$old" = "$new" ] && return 0
  if git reset -q --hard "$old"; then
    echo "      kod onceki surume alindi: $(git log --oneline -1 "$old")"
    return 0
  fi
  echo "      UYARI: kod onceki surume alinamadi; agac $(git rev-parse --short HEAD) uzerinde."
  return 1
}

# Hata mesajlarinin sonuna eklenen gercek durum: tahmin degil, olcum.
site_state() {
  local b f
  b=$(be_code)
  f=$(fe_code)
  if [ "$b" = 200 ] && [ "$f" = 200 ]; then
    echo "Su an: site CALISIYOR (arka uc $b, on yuz $f)."
  else
    echo "Su an: SITE KAPALI (arka uc ${b:-yanit yok}, on yuz ${f:-yanit yok})."
  fi
}

# Adim 5'in klasor takasini geri alir: .next-prev -> .next, .next-prev-old -> .next-prev.
fe_undo_swap() {
  if [ ! -d "$FE_DIR/.next" ] && [ -d "$FE_DIR/.next-prev" ]; then
    mv "$FE_DIR/.next-prev" "$FE_DIR/.next"
  fi
  if [ ! -d "$FE_DIR/.next-prev" ] && [ -d "$FE_DIR/.next-prev-old" ]; then
    mv "$FE_DIR/.next-prev-old" "$FE_DIR/.next-prev"
  fi
}

die() {
  echo
  echo "HATA: $*"
  echo "Kayit: ${LOG:-/root/biltim-deploy/update.log}"
  exit 1
}

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" 2>/dev/null; }
be_code() { http_code "http://localhost:$BE_PORT/health"; }
fe_code() { http_code "http://localhost:$FE_PORT/login"; }

# Portu dinleyen surecin PID'i; dinleyen yoksa bos.
port_pid() {
  ss -Hltnp "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true
}

# systemd | screen | cakisma
# Karar, servisin durumuna degil portu gercekten kimin tuttuguna gore verilir.
svc_mode() {
  local name=$1 port=$2 pid unit_on=0
  if systemctl is-enabled --quiet "biltim-$name" 2>/dev/null || systemctl is-active --quiet "biltim-$name" 2>/dev/null; then
    unit_on=1
  fi
  pid=$(port_pid "$port")
  if [ -n "$pid" ]; then
    if grep -q "biltim-$name.service" "/proc/$pid/cgroup" 2>/dev/null; then
      echo systemd
    elif [ "$unit_on" = 1 ]; then
      echo cakisma
    else
      echo screen
    fi
  elif [ "$unit_on" = 1 ]; then
    echo systemd
  else
    echo screen
  fi
}

# $1 be|fe  $2 mod  $3 klasor  $4 screen'de calisacak komut
# Eski sureci durduramazsa 2 doner (hicbir sey baslatilmadi, eskisi hala
# calisiyor); cagiran geri almayi kendisi yapar. die ile cikmak yarim
# kalmis bir .next takasini geri almadan birakirdi.
restart_svc() {
  local name=$1 mode=$2 dir=$3 run=$4 port i
  if [ "$mode" = systemd ]; then
    systemctl reset-failed "biltim-$name" >/dev/null 2>&1
    systemctl restart "biltim-$name"
    return
  fi
  [ "$name" = be ] && port=$BE_PORT || port=$FE_PORT
  screen -S "$name" -X quit >/dev/null 2>&1
  for i in $(seq 1 20); do
    [ -z "$(port_pid "$port")" ] && break
    sleep 1
  done
  if [ -n "$(port_pid "$port")" ]; then
    echo "      $port portu screen kapatildiktan sonra da tutuluyor (PID $(port_pid "$port"))."
    return 2
  fi
  (cd "$dir" && screen -dmS "$name" -L -Logfile "/root/$name-screen.log" $run)
}

# $1 ad  $2 fonksiyon  $3 saniye (gercek sure)
wait_ok() {
  local name=$1 fn=$2 limit=$3 code="" start=$SECONDS
  while [ $((SECONDS - start)) -lt "$limit" ]; do
    code=$($fn)
    if [ "$code" = 200 ]; then
      echo "      $name: 200 ($((SECONDS - start)) sn)"
      return 0
    fi
    sleep 3
  done
  echo "      $name: ${code:-yanit yok} ($limit sn icinde 200 donmedi)"
  return 1
}

# Otomatik geri alma (adim 5): basarisiz derleme .next-failed'e, onceki
# derleme .next'e. `geri` basarisiz derlemeyi bir daha secemez.
fe_restore_prev() {
  local mode=$1
  [ -d "$FE_DIR/.next-prev" ] || { echo "      onceki derleme ($FE_DIR/.next-prev) yok."; return 1; }
  rm -rf "$FE_DIR/.next-failed"
  [ -d "$FE_DIR/.next" ] && mv "$FE_DIR/.next" "$FE_DIR/.next-failed"
  mv "$FE_DIR/.next-prev" "$FE_DIR/.next" || return 1
  [ -d "$FE_DIR/.next-prev-old" ] && mv "$FE_DIR/.next-prev-old" "$FE_DIR/.next-prev"
  restart_svc fe "$mode" "$FE_DIR" "$BUN run start" && wait_ok "on yuz (onceki derleme)" fe_code 120
}

# `bash update.sh geri`: yalniz on yuz; .next ile .next-prev yer degistirir.
# Hedef ayaga kalkmazsa geri cevirir. Kod ve arka uc degismez.
fe_toggle() {
  local mode
  mode=$(svc_mode fe "$FE_PORT")
  [ "$mode" = cakisma ] && die "biltim-fe servisi kurulu ama $FE_PORT portunu baska bir surec tutuyor. Bak: screen -ls. Hicbir seye dokunulmadi."
  [ -d "$FE_DIR/.next-prev" ] || die "donulecek onceki on yuz derlemesi yok ($FE_DIR/.next-prev). Hicbir seye dokunulmadi."
  swap_prev || die ".next ile .next-prev yer degistirilemedi."
  if restart_svc fe "$mode" "$FE_DIR" "$BUN run start" && wait_ok "on yuz (onceki derleme)" fe_code 120; then
    echo
    echo "TAMAM. Yalniz on yuz degisti; kod ve arka uc ayni."
    echo "      canli on yuz derlemesi : $(build_label "$FE_DIR/.next")"
    echo "      yedekteki derleme      : $(build_label "$FE_DIR/.next-prev")"
    echo "Tekrar 'bash update.sh geri' ikisinin yerini yine degistirir."
    return 0
  fi
  show_logs fe "$mode"
  echo "      bu derleme ayaga kalkmadi; eski haline donuluyor."
  swap_prev || die "klasorler geri cevrilemedi. $(site_state) Bak: ls -la $FE_DIR"
  if restart_svc fe "$mode" "$FE_DIR" "$BUN run start" && wait_ok "on yuz (geri cevrilen)" fe_code 120; then
    die "yedekteki derleme ($(build_label "$FE_DIR/.next-prev")) ayaga kalkmadi; baslangictaki derlemeye donuldu. Tekrar geri yazmak ayni derlemeyi yeniden dener. $(site_state)"
  fi
  die "iki derleme de 200 donmedi. $(site_state) Bak: journalctl -u biltim-fe -n 80 --no-pager"
}

# Derlemenin hangi commit'ten yapildigi (update.sh her derlemeye yazar).
build_label() {
  local c
  c=$(cat "$1/DEPLOY_COMMIT" 2>/dev/null || true)
  if [ -n "$c" ]; then git -C "$REPO" log --oneline -1 "$c" 2>/dev/null || echo "${c:0:7}"; else echo "bilinmiyor (update.sh oncesi derleme)"; fi
}

swap_prev() {
  rm -rf "$FE_DIR/.next-swap"
  mv "$FE_DIR/.next" "$FE_DIR/.next-swap" &&
    mv "$FE_DIR/.next-prev" "$FE_DIR/.next" &&
    mv "$FE_DIR/.next-swap" "$FE_DIR/.next-prev"
}

show_logs() {
  local name=$1 mode=$2
  echo "      --- son gunluk satirlari ($name) ---"
  if [ "$mode" = systemd ]; then
    journalctl -u "biltim-$name" -n 40 --no-pager 2>&1 | sed 's/^/      /'
  else
    tail -n 40 "/root/$name-screen.log" 2>&1 | sed 's/^/      /'
  fi
}

print_status() {
  echo "      surum      : $(git -C "$REPO" log --oneline -1 2>/dev/null)"
  echo "      son basarili: $(cat "$LAST_GOOD_FILE" 2>/dev/null | cut -c1-7)"
  echo "      arka uc    : $(be_code)  ($(svc_mode be "$BE_PORT"))"
  echo "      on yuz     : $(fe_code)  ($(svc_mode fe "$FE_PORT"))"
  { screen -ls 2>&1 || true; } | sed 's/^/      /'
}

main "$@"
exit $?
