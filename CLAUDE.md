# Biltim 5S — proje notu (önce bunu oku)

Bu dosya, bu repoyu açan her yeni oturumun projeyi baştan öğrenmek zorunda
kalmaması için. Son güncelleme: 10.11.2026, canlıdaki sürüm `7d54875`
(13.10.2026). Kodla çelişen bir şey görürsen kod doğrudur; bu dosyayı düzelt.

## Ne bu proje

5S saha denetimi uygulaması. Müşteri: Çolakoğlu Metalurji (Kalite birimi),
aracı firma Biltim. Akış: Merkez Ekip denetim planlar, denetçi ekibi sahada
(çoğunlukla iPad) soru formunu doldurur, orta/kötü cevaplar "bulgu" olur,
saha sorumlusu bulguyu "sonrası" fotoğrafıyla kapatır, Merkez Ekip denetimi
onaylar, raporlar ve Excel'ler çıkar.

Müşteri istekleri Outlook'tan, satır satır bir Excel ("Notlar ...xlsx") ve
ekli formlar olarak gelir. Satırlara Excel satır numarasıyla atıf yap.

## Harita

```
biltim/
  update.sh                 sunucuda tek komut (Nucleus/deploy/update.sh'i çalıştırır)
  azure-pipelines.yml       ESKİ, kullanılmıyor (olmayan yollara bakıyor)
  docs/e2e-test-matrisi.md  ekran ekran elle test senaryoları
  Nucleus/                  bun + turbo monoreposu
    apps/be-nucleus/        CANLI arka uç (nucleus-core-ts 0.10.115, Bun)
    apps/fe/                CANLI ön yüz (Next.js 16, React 19)
    apps/be/                ESKİ arka uç, kullanılmıyor (dev script'i kapalı)
    deploy/                 update.sh, biltim-be/fe.service, README.md (teslimat kılavuzu)
```

- `nucleus-core-ts` 0.10.115 = nucleus-core reposunda `f38303c`. Kaynağı
  okumak için: `git -C <nucleus-core> show f38303c:<yol>`.
- Arka uç dosyaları: `src/index.ts` (sunucu), `src/guards/businessRules.ts`
  (5S iş kuralları), `src/guards/caller.ts` (çağıranı ve rolleri bulma),
  `src/routes/biltim.ts` (`/biltim/*`: kullanıcı/rol yönetimi, scope),
  `src/routes/reports.ts` + `locationForm.ts` + `excel.ts` + `photos.ts`
  (`/reports/*`), `src/boot.ts` (açılışta çalışan veri düzeltmeleri),
  `src/db.ts` (ayrı pg havuzu), `config.json` (şemanın ve ayarların kaynağı).
- Ön yüz: `app/(pages)/denetim/page.tsx` (denetim formu + çevrimdışı kuyruk,
  ~5000 satır), `app/_hooks/UseNucleusApi/` (yanıt çeviri katmanı),
  `lib/api/endpoints.nucleus.ts` + `factory.nucleus.ts` (API),
  `app/_utils/routeAccess/` (rol listeleri), `public/offline-sw.js`.

## Komutlar

```bash
# yerel geliştirme (Postgres 16 + Redis 7 gerekir, aşağıdaki kurulum bölümüne bak)
cd Nucleus && bun install && bun run dev        # be-nucleus (1001) + fe (3000)

# arka uç
cd Nucleus/apps/be-nucleus
bun test src                 # ~480 test, DB gerekmez
bunx tsc --noEmit -p .
bun run gen                  # config.json değişince: src/drizzle/* yeniden üretilir, COMMIT'le

# ön yüz
cd Nucleus/apps/fe
bunx tsc --noEmit -p . --incremental false      # TypeScript 7 (tsgo), saniyeler sürer
bun test app lib                                 # ~750 test
NEXT_DIST_DIR=.next-verify bun run build         # canlı .next'e dokunmadan derleme denemesi
# sonra: rm -rf .next-verify && git checkout -- tsconfig.json
```

### Yeni bilgisayarda yerel veritabanı (sıfırdan, ~5 dakika)

Canlı veritabanına dışarıdan erişim yok, bağlantısı da paylaşılmaz. Her
geliştirme makinesi kendi yerel veritabanını kurar:

1. Postgres 16 ve Redis 7'yi çalıştır. `Nucleus/docker-compose.db.yml` tam
   Docker kurulumu içindir ve portları dışarı açmaz; yerelde onu kullanma.
   - macOS: `brew install postgresql@16 redis`, sonra
     `brew services start postgresql@16` ve `brew services start redis`.
   - Docker:
     `docker run -d --name biltim-pg -e POSTGRES_PASSWORD=<şifre> -p 5432:5432 postgres:16`
     ve `docker run -d --name biltim-redis -p 6379:6379 redis:7-alpine`.
2. `createdb biltim_v2` (Docker'da: `docker exec biltim-pg createdb -U postgres biltim_v2`).
3. `be-nucleus/.env`'i oluştur. `.env.docker` şablondur. Değişkenler:
   `DATABASE_URL=postgresql://<kullanıcı>:<şifre>@localhost:5432/biltim_v2`,
   `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`, `PORT=1001`; üç token secret'ı
   (`ACCESS_/REFRESH_/SESSION_TOKEN_SECRET`) için yeni rastgele değerler;
   `GODMIN_EMAIL` ve `GODMIN_PASSWORD` yerel godmin hesabı için. Şifre yalnız
   ilk açılışta yazılır.
4. `cd Nucleus && bun install`, sonra arka ucu BİR KEZ başlat ve
   `curl localhost:1001/health` 200 dönünce kapat:
   `cd apps/be-nucleus && bun run src/index.ts`. Nucleus bu açılışta tabloları,
   claim'leri ve godmin hesabını kurar.
5. Rolleri, 5S adımlarını ve soruları yükle, sonra rol yetkilerini ver:
   `psql -d biltim_v2 -f seed-local-dev.sql` ve
   `psql -d biltim_v2 -f roles-nucleus-claims.sql` (be-nucleus içinden).
6. Arka ucu yeniden başlat. Log'da `[boot] N rol yetkisi eklendi` görünür.
   godmin ile gir, test kullanıcılarını Kullanıcılar ekranından oluştur.

Seed'deki sorular yer tutucudur; puan kurallarını (5.1, 5.5) denemeye
yeter. Bu yol 10.11.2026'da boş bir veritabanında baştan sona denendi.
- `fe/.env` git'te ve `localhost:1001`'i gösterir. Bir makinede
  `fe/.env.local` varsa onu ezer. Founder'ın Mac'indeki `.env.local` 4001'i
  gösteriyor, `be-nucleus/.env` ise `PORT=1001` diyor. Arka uç 1001'deyken ön
  yüz 4001'e giderse "fetch failed" görürsün; ya `.env.local`'ı kaldır ya da
  ön yüzü `AUTH_API_URL=http://localhost:1001` ile başlat.
- `biome check` kalite kapısı değil: dosyalarda yüzlerce eski uyarı var.
  Tip hatası ise kapıdır: `next build` tip kontrolü yapar, tek hata canlı
  kurulumu durdurur.

## Canlıya teslimat (tek yol)

1. Kodu `main`'e push'la (GitHub `fatih18/biltim`). Push sunucuya hiçbir şey
   kurmaz. Repoda `.github` yok; `azure-pipelines.yml`'de `trigger: main`
   duruyor ama eskimiş, bağlı bir Azure hattı olup olmadığı repodan
   anlaşılmıyor.
2. Founder sunucuda çalıştırır: `cd /root/apps/biltim && bash update.sh`.
   Bu komutu sen çalıştırmazsın; ne zaman çalışacağına founder karar verir.

`update.sh` sırasıyla şunları yapar:
- Sunucuda elle değiştirilmiş takipli dosya varsa durur.
- `git pull --ff-only` yapar (120 sn zaman aşımı).
- Paketler değiştiyse `bun install --frozen-lockfile` çalıştırır.
- Ön yüzü `.next-build`'e derler.
- Arka ucu yeniden başlatır ve `:1001/health`'i bekler.
- `.next`'i takas edip ön yüzü yeniden başlatır ve `:3000/login`'i bekler.
- Kurulum ya da derleme başarısız olursa kodu eski commit'e geri alır; site
  eski sürümle devam eder. Ön yüz yeni sürümle kalkmazsa yalnız ön yüzün
  derlemesi geri alınır, arka uç yeni kodda kalır (çıktı bunu yazar).
  `bun install` yarıda kalırsa `node_modules` karışık kalabilir.

Sonunda `TAMAM. Calisan surum: <sha> <mesaj>` yazar. Diğer kipler:
`bash update.sh status`, `nopull`, `geri`. Kayıt dosyası:
`/root/biltim-deploy/update.log`.

Sunucu: `172.26.16.27`, düz HTTP. systemd servisleri `biltim-be` (1001) ve
`biltim-fe` (3000). Repo `/root/apps/biltim`. Bun her zaman
`/usr/local/bin/bun` olarak çağrılır; `/snap/bin/bun` ölü bir bağlantıdır.

### Teslimat tuzakları
- **Deploy SQL çalıştırmaz.** Repodaki `.sql` dosyaları yalnız elle
  çalıştırıldıkları makinede etkili oldu. Her kurulumda olması gereken veri
  düzeltmesi, rol yetkisi ya da indeks `src/boot.ts`'e (`applyBootFixes`,
  `GRANTS`) idempotent kod olarak girer. Boot adımı başarısız olursa yalnız
  `[boot]` önekiyle log'a düşer, API yine açılır.
- **`roles-nucleus-claims.sql`'i yeniden çalıştırmak** beş rolün yetkilerini
  silip kendi setini yazar. Bu sette boot'un eklediği yetkilerin çoğu yok:
  denetim/cevap düzeltme, `get.roles`, `get.user_roles` ve denetçinin
  `planned_date` / `date_change_count` yetkisi. Arka uç yeniden başlayana kadar
  ilgili ekranlar 403 verir ya da tarih sessizce kaydedilmez.
- **`config.json` değiştiyse** yerelde `bun run gen` çalıştırıp
  `src/drizzle/*`'ı aynı commit'e koy. Sunucu şema üretmez. Ön yüz de
  `config.json`'u derleme anında okur.
- **Paket değişikliği** `bun.lock` ile birlikte commit'lenmeli (frozen
  lockfile). Sunucunun dışarı (npm, github 443) çıkışı çoğu zaman kapalı:
  paket değişen bir teslimat ağ açılana kadar bekleyebilir. Yazı tipleri bu
  yüzden yerel (`next/font/local`); Google Fonts ekleme.
- **Sunucuda elle derleme ya da dosya düzenleme yapılmaz.** `next build`
  hedef klasörü baştan siler; 29.09'da canlı `.next`'e derlemek siteyi
  düşürdü. Kirli dosya ağacı da `update.sh`'i durdurur.
- `AUTH_API_URL` ön yüze **derleme anında** gömülür (`/cdn`, `/files`,
  `/reports` rewrite'ları). Adres değişirse yeniden derlemek gerekir.
- Arka uçta `PORT` yoksa sunucu 1002'ye düşer ve ön yüzle bağlantı kopar.
  `PORT` yalnız sunucudaki git dışı `.env`'de tanımlı.
- systemd servis dosyaları git'ten otomatik kurulmaz. Değiştirirsen elle
  `/etc/systemd/system`'e kopyalanıp `daemon-reload` yapılmalı. Ayrıca
  `StartLimitIntervalSec` yanlış bölümde (`[Service]`) duruyor; systemd onu
  yok sayıyor.
- Yüklenen fotoğraflar `apps/be-nucleus/storage/` altında, git dışında.
  Silme ya da `git clean` etme.
- `Nucleus/package.json`'daki `db:*` komutları ESKİ arka uca (`apps/be`)
  aittir. `bun run db:reset` onay sormadan (`--yes` gömülü)
  `DROP SCHEMA main CASCADE` çalıştırır ve DATABASE_URL yoksa `apps/be/.env`'e
  düşer (DB adı `biltim`, canlıyla aynı). Bunları çalıştırma; şema
  `be-nucleus`'ta `bun run gen` ile üretilir, nucleus açılışta uygular.

## Sunucuya erişim (founder'ın tarayıcısından)

Tek yol CyberArk Alero → PSM-RDP jump host (`172.16.19.43`). İçinde PuTTY
(root@bltm-5s) ve sitenin açık olduğu bir Chrome var. Claude bunu founder'ın
Chrome'undaki PSM sekmesinden görebilir; kurallar:

- PSM sekmesini **yenileme**, giriş düşer. Sitenin uzak Chrome'u yenilenebilir.
- Uzak masaüstünde odak kayar. Önce imleci getir, sonra tıkla; tıklama
  bazen PuTTY penceresine gider.
- Terminale yazmak riskli: Türkçe klavye Shift'li karakterleri bozar
  (`| " & { } : $`) ve uzun satırlar bozulur. Sunucuda yapılacak her iş,
  repoya commit'lenmiş bir betik olarak gider ve founder kısa bir komutla
  çalıştırır. Canlı terminale komut yazmak izin katmanında reddedilebilir.
- Canlıda yalnız bak: kayıt, gönderim ya da indirme yapma. Müşteri ortak
  godmin hesabı kullanıyor; o hesapla başka yerden giriş yapmak müşteriyi
  oturumdan atabilir.
- Oturum gün içinde düşer. Bu uygulamayı etkilemez; yalnız ölçme imkânın
  kesilir.

## Roller ve yetki modeli

| DB adı | Türkçe | Yetki |
|---|---|---|
| `godmin` | godmin | her şey. Uygulamanın kendi kontrolleri `users.is_god` VEYA `godmin` rolünü kabul eder; nucleus'un jenerik CRUD'u yalnız `godmin` ROLÜNE bakar |
| `Super Admin` | Super Admin | yönetici |
| `Content Manager Core Team` | Merkez Ekip | yönetici: planlar, onaylar, düzeltir, kullanıcı yönetir |
| `Manager` | Müdür | planlar, her şeyi görür; **onaylayamaz**, tamamlanmış denetimi düzeltemez |
| `Field Manager` | Saha Sorumlusu | sonrası fotoğrafıyla bulgu kapatır (kendi lokasyonu sınırı yalnız ekranda, API'de yok) |
| `Auditor` | Denetçi | denetim yapar, bulgu ekler; bulgu değiştiremez |

Türkçe adlar `roles.alias`'ta tutulur. Kodda iki ana liste var:
`CENTRAL_ROLES` (Merkez Ekip, Super Admin, Müdür; planlama yetkisi) ve
`ADMIN_ROLES` (Müdür hariç; onay, düzeltme, kullanıcı yönetimi). Bu listeler
`guards/caller.ts` ve `fe/app/_utils/routeAccess`'te tanımlı. Ayrıca
`/reports/*`'ı açan `REPORT_ROLES` (`src/routes/reports.ts`) ve Header
menüsünde elle kopyalanmış rol kontrolleri (`Header/ClientSide`) var. Bir rol
kuralını değiştirirken bunların hepsine bak. godmin'i her kontrolde ayrıca say:
`hasPrivilege(roles, list, isGod)` ve `isGodminUser`.

- godmin'in iki yolu: `users.is_god` bayrağı (uygulamanın kendi kontrolleri) ve
  `godmin` rolü (nucleus'un jenerik CRUD'u: `POST /fiveSAudits`, `POST /fiveSFindings`
  dahil). Boot'taki `grantGodminRole` (`src/godminRole.ts`) bayraklı her hesaba rolü
  de verir. Ön yüzde menü ve ekran kontrolleri `isGod`'u `hasPrivilege` /
  `routeAccess/menuAccess` üzerinden sayar; rol adına tek başına bakma.
- Denetim ekranında hangi planın açılacağı `denetim/_utils/planChoice.ts`'de
  karar verilir: ana sayfadan tıklanan plan (`?planId=`) her zaman kazanır, açılamıyorsa
  sebep ekranda yazılır ve başka plan sessizce açılmaz. Merkez Ekip, Super Admin ve
  godmin her planı görür ve kendi lokasyonununkini de başlatır (sunucudaki #27
  `isAdmin` istisnası); Müdür her planı görür ama kendi lokasyonunu başlatamaz;
  denetçi yalnız kendi ekibinin planlarını görür.

Plan durumu: `planned` → denetçi gönderince `pending_approval` → Merkez Ekip
onaylayınca `completed` (bir de `cancelled` var). Planlı tarihi ekip lideri
ve Müdür en fazla 2 kez değiştirebilir. Merkez Ekip, Super Admin ve godmin
sınırsız değiştirir ve hak harcamaz (22.10 notları satır 34, `16ba539`).
Tamamlanmış ya da onay bekleyen denetimin tarihini yalnız yöneticiler
(`ADMIN_ROLES`) değiştirir.

**Reddet** (22.10 notları satır 30; müşteri başka bir tarif yazmadı, "düzeltmeye
geri gönder" olarak tasarlandı): bir yönetici (`isAdmin`) `pending_approval`
bir planı gerekçeyle (5–500 karakter) `POST /biltim/plans/:plan_id/reject` ile
`rejected` ("Düzeltme Bekliyor") yapar. Denetim ve cevapları silinmez; planın
ekibi (lider ya da aktif üye) ya da bir yönetici düzeltme akışında (`editAudit`)
düzeltip aynı `audit_id` ile yeniden gönderir (`rejected` → `pending_approval`).
`rejected` hâlâ açık plandır (lokasyon/ekip silmeyi engeller), tarihini yalnız
yönetici değiştirir. Jenerik CRUD ile `status: 'rejected'` yazılamaz;
`rejection_reason`, `rejected_at`, `rejected_by` yalnız Reddet rotasına aittir.
Her ekip üyesine `audit_rejected` türünde bildirim gider. Bir yönetici
reddedilmiş planı ekip yeniden göndermeden doğrudan da onaylayabilir (bilinçli).
Kodda: `guards/rejectedPlan.ts`, `routes/planReview.ts`, ön yüzde
`app/_utils/planReview`.

- Reddet'in düzeltme akışı denetim ve cevap satırlarını yazar, bu yüzden
  `Auditor` rolüne `put/patch.five_s_audits` ve `…five_s_audit_answers` TABLO
  düzeyinde verildi (`src/boot.ts`). Tablo yetkisi nucleus'un kolon süzmesini
  kapatır (aşağıdaki kolon yetkisi tuzağı); sınır yalnız `businessRules.ts`'teki
  kuraldır: reddedilmiş planın ekibi ve yöneticiler dışında 403. Bu kuralı gevşetme.
  Yönetici olmayanlar için denetim yazımında yalnız puanlar, `auditor_name` ve
  `audit_date` açıktır; `is_active`, `plan_id`, `source`, `client_submission_id`,
  `department_name`, `location_id`, `auditor_id`, `period_id` yazılamaz
  (`guards/rejectedAuditWrites.ts`, bir YASAK listesidir: `five_s_audits`'e kimlik
  ya da bağ kolonu eklersen listeye de ekle). Müdür planlama yetkisi gereği
  reddedilmiş planın takımını/lokasyonunu hâlâ değiştirebilir; yapamayacağı şey
  planı ekibin düzeltmesi olmadan durumdan çıkarmaktır.
- Tekil bulgu formundaki "Ekip" alanı kişinin gerçek denetim ekibini gösterir
  (lider ya da aktif üye); ekibi yoksa alan görünmez. Eski kayıtlardaki
  "Ekip: <rol adı>" satırı ekranda (`userTeams.ts`) ve Excel'de
  (`routes/teamLine.ts`) ayıklanır, veritabanına dokunulmaz. Denetimde girilen tekil
  bulgu taşıyıcı satırın `form_title`'ında denetimin adını taşır (R74); bu değişiklik
  öncesi kayıtlar "Tekil Bulgu" kalır.
- Raporlar: lokasyon adı eşleşmesi `routes/locationMatch.ts` (`locationKey`: Türkçe
  katlama, boşluk, görünmez karakter); saha sorumlusu yalnız kendi lokasyonlarının
  ve yalnız TAMAMLANMIŞ denetimlerin raporunu görür (`auditReport.ts`,
  `locationFormAccess.ts`, `locationFormAudits.ts`). Bulgu Excel'lerinde öncesi ve
  sonrası fotoğrafı gömülür; rapor başına en çok 150 fotoğraf / 40 MB
  (`photoReport.ts` `REPORT_PHOTO_LIMITS`), aşılan sayfa notunda sayılır. Fotoğraflar
  küçültülmeden saklanır; `/reports` vekilinin zaman aşımı 3 dakika
  (`next.config.ts`). Gerçek fotoğraflarla boyut ve süre ÖLÇÜLMEDİ.
- Müdür onay bekleyen ya da tamamlanmış denetimin bulgusunu silemez, pasife alamaz
  ve başka denetime taşıyamaz (`guards/findingDelete.ts`); yönetici yapabilir.

## İstek nasıl akıyor (en çok buradan hata çıkar)

```
tarayıcı → Next server action (factory.nucleus.ts, AUTH_API_URL)
        → be-nucleus: onRequest = businessRules → nucleus inbound guard → auth
        → nucleus jenerik CRUD (/fiveSFindings ...)   veya   host route (/biltim, /reports)
```

- **`businessRules.ts` auth'tan ÖNCE çalışır.** Burada `x-user-id` gibi
  başlıklar hâlâ istemcinin gönderdiğidir; onlara güvenme. Çağıranı
  `resolveCaller` ile oturum çerezinden (`nucleus_session_token` →
  `main.user_sessions`) bul. Çağıran bilinmiyorsa 401 dön, 400 değil
  (aşağıdaki çevrimdışı kuyruk maddesine bak).
- Ön yüz istemcisi gövde anahtarlarını **camelCase** gönderir
  (`plannedDate`). İstemci iç içe nesneleri de çevirir, dizilerin içine
  girmez. Guard kendi kopyasında yalnız üst düzey anahtarları `toSnakeKeys`
  ile snake_case'e katlar; nucleus gövdeyi gönderildiği gibi alır. GET
  parametreleri olduğu gibi gider.
- Guard yol ve gövde kimliklerini küçük harfli kanonik UUID'ye çevirir.
  Büyük harfli kimlikle kuralların atlandığı bir açık vardı; yeni kuralda
  da aynı yardımcıyı kullan.
- **Host route'lar** (`/biltim/*`, `/reports/*`) auth'tan SONRA çalışır ve
  `x-user-id` orada güvenilirdir. Ama nucleus bu rotalarda claim kontrolü
  yapmaz; rol kontrolünü kodda sen yazarsın (`adminOnly`, `callerById`,
  `REPORT_ROLES`). Bir rotanın kullandığı her query parametresi `query`
  şemasında tanımlı olmalı; tanımsız olanları router sessizce atar.
- Jenerik CRUD yetkisi her istekte DB'deki `role_claims`'ten okunur. Boot'ta
  eklenen bir yetki hemen geçerli olur. Claim adları snake_case'dir
  (`put.five_s_audit_plans.planned_date`), API yolları camelCase'dir
  (`/fiveSAuditPlans`).
- **Kolon yetkisi tuzağı:** nucleus, yetkisi olmayan kolonları gövdeden
  sessizce siler ve 200 döner. Ekran "kaydedildi" der, hiçbir şey yazılmaz.
  Örnek: denetçinin planlı tarih değişikliği. Kolon bazında yetki
  verilecekse role tablo yetkisi (`put.five_s_findings`) verme: tablo yetkisi
  kolon süzmeyi tamamen kapatır.
- `user_roles` jenerik yazımı ve nucleus'un `/auth/admin/*` kullanıcı uçları
  yalnız godmin'e açık. Merkez Ekip bu işleri `/biltim/users*` host
  route'larıyla yapar. Bu rotalar rütbe kuralını uygular: godmin hesabına ve
  kendinden üstteki hesaba dokunulmaz. Kişi kendi hesabını silemez,
  kilitleyemez, kendi rolünü değiştiremez (şifre belirleme ve kilit açma
  uçlarında bu kontrol yok).
- Jenerik `PATCH users {is_locked:false}` 200 döner ama hiçbir şey yapmaz;
  kilidi `/biltim/users/unlock` açar. Bildirimler `/notifications/*/seen`
  uçlarıyla okundu yapılır; jenerik PATCH denetçiye 403 verir.
- **Liste tavanı:** nucleus `limit` ne olursa olsun en fazla 200 satır verir
  (limit verilmezse 20). Uzun listeleri sayfa sayfa oku (`readAllPages`,
  `useServerList`); büyük limitle çekip tarayıcıda süzme.
- Ön yüz `UseNucleusApi` her yanıtı çevirir: zarfı açar, `{items, meta}`'yı
  `{data, pagination}`'a çevirir, camelCase anahtarlara snake_case
  ikizlerini EKLER. Ekranlar snake_case okur. Ekranların eski filtre ve
  sıralama dili (`{col: v}`, `_gte/_lte`, `orderBy`) burada çevrilir.
  `GET /users` profil ve rol getirmez. Profilleri hook `GET_USERS` için
  kendisi ekler; roller için `app/_utils/userRoles`'taki `attachRoles` ve
  `usersWithRole` yardımcılarını kullan.
- Callback API'de `onErrorHandle(errors, code)`. HTTP kodunu kaybeden bir
  sarmalayıcı, bilinçli bir reddi sonsuza kadar yeniden denenen bir kuyruk
  kaydına çevirir. Üretilmiş bir action nesnesini React bağımlılık
  listesine koyma: her istekte yeni nesne olur, sonsuz istek döngüsüne girer
  (saniyede 20 istek ölçüldü).
- `/cdn/<id>` dosyanın baytlarını verir, `/files/<id>` DB satırını (JSON)
  verir. Resimler için `resolvePhotoUrl` ve `buildFileUrl` kullan.
- `app/api` route handler YOK, ekleme. Proxy gerekiyorsa Next rewrite ya da
  server action kullan. Eski `@/lib/api` istemcisini kullanma; canlı olan
  `factory.nucleus` / `endpoints.nucleus`. Yeni bir host route yazınca onu
  `endpoints.nucleus.ts`'in `custom` bloğuna elle ekle.

## Çevrimdışı (iPad)

- Site düz HTTP; tarayıcı burada güvenli bağlam (secure context) saymaz.
  Bu yüzden:
  - service worker (`offline-sw.js`) hiç kaydolmaz;
  - `crypto.randomUUID` yoktur, kimlik için `getRandomValues` kullan.
- **Bağlantı yokken sayfayı sıfırdan açmak HTTPS olmadan mümkün değil.**
  Gereken: müşterinin bir iç alan adı ve iPad'lerin güvendiği bir sertifika
  kurması. Bu müşterinin işi. Şu an çalışan: sayfa internet varken açılır,
  sekme kapanmazsa denetim internetsiz doldurulup kaydedilir.
- Kuyruk Dexie'de: veritabanı `fiveS_offline_db_v1`, `denetim/page.tsx`
  içinde. `app/offline/fiveS/*` ölü koddur.
- Kuyruğun tekrar sırası: denetim → cevaplar → her bulgu için önce
  fotoğraflar, sonra bulgu → plan damgası. İlerleme kuyruk kaydında tutulur
  (`syncedAuditId`, `syncedAnswerQuestionIds`, `syncedPhotoUploads`,
  `syncedFindingIds`), böylece yarıda kalan gönderim kaldığı yerden devam
  eder. `client_submission_id` / `client_finding_id` sunucunun aynı kaydı
  tanıması için: bu iki kolonda kısmi benzersiz indeks var (boot kurar),
  tekrar gönderim 409 alır ve uygulama mevcut kaydı bulup devam eder.
- **Sunucu durum kodları kuyruğu yönetir:**
  - 400/403/404/409/415/422 = red. Kayıt kenara alınır ve "reddedildi"
    olarak görünür.
  - 401, 408, 429, 5xx ya da hiç cevap gelmemesi = geçici. Kayıt kuyrukta
    kalır, sonra yeniden denenir.
  - Çağıran bilinmiyorsa 401 dön. Çift kayıt için 409 dön.
- Çevrimdışıyken çıkış yapılmaz. Amaç, ortak tablette bir sonraki kişinin
  öncekinin hesabıyla içeride kalmasını önlemek.
- Girişte tarayıcıya özel bir `deviceHint` (`biltim_device_id`) gönderilir.
  O olmadan bütün Windows PC'ler tek cihaz sayılıyor ve birbirini oturumdan
  atıyordu.

## Veri ve tarih tuzakları

- **Domain tabloları saat dilimsiz `timestamp`** (`add_base_columns:false`).
  Her iki pg havuzu `-c timezone=UTC` ile açılır. Istanbul saat dilimli bir
  oturum her damgayı 3 saat kaydırır. Yeni bir havuz ya da elle SQL de UTC
  kullanmalı. `add_base_columns`'u true yapma.
- node-pg `date` kolonunu YEREL gece yarısına çevirir; UTC+3'te bu bir önceki
  güne kayar. Günlerle `toDateKey` / `excelDay` ile çalış. "Bugün" =
  `todayAtPlant()` (Europe/Istanbul); DB'nin `CURRENT_DATE`'i 00:00–03:00
  arası dünü döner. Ön yüz günleri `atUtcMidnight` ile UTC gece yarısı
  olarak yazar. Plan tarihi düz `YYYY-AA-GG` olmalı.
- Türkçe büyük/küçük harf: JS `toLowerCase()` `İ`'yi bozar. Arama için
  `containsTr` / `foldTr`, SQL'de `lower(trim(...))` kullan. Rol adı gibi
  tanımlayıcılarda Türkçe katlama kullanma.
- Domain tablolarında yabancı anahtar yok; jenerik DELETE kalıcı siler.
  Bulgular lokasyona METİNLE bağlı (`location_name`), denetimler de
  `department_name` ile. Lokasyon adı değişirse bağ kopar. Excel raporları adı
  büyük/küçük harf, boşluk ve i/ı farkından bağımsız eşler (`routes/locationMatch.ts`);
  form Excel'i denetimleri ayrıca `location_id` ile de bağlar, yeniden adlandırılan
  lokasyonun denetimleri ve bulguları formda kalır.
- Tekil bulgu, puanı 0 olan sahte bir denetim satırının altında durur
  (`source='single_finding'`). Bunları her denetim sayımından ve
  ortalamadan çıkar.
- `five_s_findings.finding_no` dizisi bir kez sıfırlandı; eski veride çift
  numaralar var. Boot diziyi yalnız ileri alır, benzersiz indeks yok.
- `/auth/register` herkese açık (rol `basic`). Bu yüzden `/reports/*`'ın
  önünde 5S rolü isteyen bir kapı var. Yeni bir veri ucu yazarken de rol
  kontrolü ekle.
- Bütün kullanıcılar arka uca 127.0.0.1'den gelir: ön yüz sunucu tarafından
  çağırıyor. IP bazlı hız limitleri bu yüzden tüm şirket için ortaktır.
  `config.json`'daki login limitlerine dokunurken dikkat et.
- `jwtClaimsMode: resolve` kalmalı (Redis ister). `embed` modunda erişim
  çerezi 4096 baytı aşıyor ve tarayıcı onu sessizce atıyordu: giriş başarılı
  görünüp sonraki her istek 401 dönüyordu. Çerez adları:
  `nucleus_access_token`, `nucleus_refresh_token`, `nucleus_session_token`.
  `authentication.cookieDomain` ayarlama: çerezler `Secure` olur ve düz
  HTTP'de atılır.
- godmin şifresi yalnız hesap ilk oluşturulurken yazılır; `.env`'deki
  `GODMIN_PASSWORD`'ü değiştirmek bir şey yapmaz. 5 yanlış şifre hesabı 30
  dakika kilitler. Kurtarma kullanıcı ekranındaki şifre/kilit düğmeleriyle
  yapılır.
- SMTP yok: "şifremi unuttum" ve mail bildirimi çalışmaz.
- Excel'e yalnız PNG/JPEG/GIF fotoğraf gömülebilir; HEIC/WEBP için hücreye
  not düşülür.

## Açık konular (founder kararı ya da müşteri işi bekliyor)

- iPad'de internetsiz açılış için HTTPS (müşterinin bilgi işlemi).
- Çift bulgu numaraları: #1/#2 hem 21.08 SSH Bakım denetiminde hem Bölge 3
  tekil bulgularında. Öneri: Bölge 3'tekiler #12/#13 olsun.
- Puan kuralları (`denetim/_utils/scoring.ts`): 5.5 orta/kötü ise toplamdan
  %10 düşer; listeye eklenen her soru kendi %10'unu ekler. 2.3 kuralı 22.10
  notlarıyla (satır 38) kaldırıldı; müşteri soruları yeniliyor. 5.1 orta/kötü
  ise 5. adım 0 olur.
  "Bölge sorumlusu veya görevlendirdiği kişi denetime katıldı" işaretlenmezse
  sorular pasif olur, denetim cevapsız ve 0 puanla kaydedilir
  (`denetim/_utils/attendance.ts`).
- Canlıda lokasyonlara müdürlük ve kroki konumu girilmedi; ilgili raporlar
  bu yüzden boş.
- `finding-closed-at.sql` tetikleyicisi boot'ta kurulmuyor; canlıda olup
  olmadığı bilinmiyor.
- 22.10 notlarında yapılmayanlar (müşteriyle konuşulacak ya da veri bekliyor):
  satır 43 ve 48 (müşteri "konuşulmalı" dedi), rollerin yeniden tasarımı (22, 23, 27,
  34'ün yorumları), satır 61 (Bölge 3 bulgularını #12/#13 yapmak: müşteri onayı yok),
  SMTP (satır 63 ve 70), satır 72 (faz 2), Sayfa1 "özge ekipte görünmemeli" (veri mi
  kod mu bilinmiyor).
- 22.10 işlerinin DOĞRULANMAYAN yanları: iPad'de çevrimdışı tekrar; gerçek fotoğraflı
  Excel'in boyutu ve süresi; godmin rolünün boot'ta SQL ile verilmesi (nucleus'un JWT
  yolu belirteç yenilenene kadar rolü görmeyebilir, kanıtlanmadı); satır 2/17, 27,
  28, 71, 73, 75 canlı akışları yalnız birim testle ve yerel veritabanında kısmen.
  Yerelde Chrome'la doğrulananlar: satır 16, 30 (Reddet döngüsü), 34, 39, ana sayfa
  listesi 320–1280 px ve koyu tema; gerçek Postgres'te: rapor uçları (üç rolle) ve
  Reddet korumaları (Müdür ve ekip dışı denemeleri, rejection_* ve kimlik kolonları).
- Ana sayfadaki Raporlar özeti grafik kartları 320 px'te sayfayı yatay taşırıyor
  (`ReportsDashboard`, recharts sarmalayıcısı); iPad'de görünmez.
- Dosyalar hâlâ 200 satırın üstünde (`denetim/page.tsx` ~5000, `businessRules.ts`
  ~1700, `HomeAuditListPanel.tsx` ~500); 22.10 işlerinin yeni mantığı küçük ayrı
  dosyalara yazıldı, eski monolitler bölünmedi.
- Bilinen açıklar:
  - Saha sorumlusu API üzerinden kendi lokasyonu dışındaki bir bulguyu da
    kapatabilir; sınır yalnız ekranda.
  - Bulgu listesindeki saha sorumlusu süzmesi de yalnız ekranda; jenerik
    `GET /fiveSFindings` her bulguyu döner.
  - Bir denetimi aynı ekipten başka biri devam ettirirse, ilk kişinin
    çektiği fotoğraflar onun cihazında kalır.

## Yanıltıcı ya da eski dosyalar

- `azure-pipelines.yml`, `docker-compose*.yml`, Dockerfile'lar,
  `scripts/bundle-for-deployment.ts`: canlı yol değil, eskimiş.
- `apps/be-nucleus/README.md` sürümü 0.9.951 diyor; doğrusu 0.10.115.
  `entities.json` hiçbir yerde kullanılmıyor, şemanın kaynağı `config.json`.
- `apps/be-nucleus/*.sh` ve `*.sql` (diag-*, fix-*, verify-* ...): Ağustos–
  Eylül'den kalma tek seferlik teşhis ve onarım betikleri. Kalıp olarak
  okunabilir ama otomatik çalışan hiçbir şey onlara bağlı değil.
  `supervise.sh`'in yerini systemd servisleri aldı.
- Bazı betiklerde godmin şifresi açık yazılı. Takipli `fe/.env` dosyası da
  bir şifreleme anahtarı içeriyor. Bu değerleri yeni dosyalara, belgelere ya
  da commit'lere kopyalama.

## Çalışma kuralları (founder'ın)

- Türkçe, sade dille yaz; sorulana cevap ver. Bulguyu sonuç gibi sunma:
  "doğrulandı" demek için kanıt (test çıktısı, ekran) göster.
- Commit mesajları Türkçe, küçük harfli ve kısa. Model adı ya da
  `Co-Authored-By` satırı YAZMA.
- Yalnız kendi dosyalarını commit'le: `git add -A` yasak, açık yollar ver.
  Commit'ten sonra `git show --stat` ile kontrol et. Kökteki `.DS_Store`
  takipli ve sürekli değişir; onu ekleme.
- Canlıya kurulumu sen tetikleme. Push edersin, `update.sh`'i founder
  çalıştırır.
- Founder'ın makinesinde aynı anda tek ağır süreç çalıştır (next build,
  dev server ...). Yerel sunucu açtıysan iş bitince kapat.
- Arka uç `reusePort` ile açılır; aynı portta eski bir süreç kalırsa
  istekler ona da gidebilir. Kontrol: `lsof -nP -iTCP:<port> -sTCP:LISTEN`.
- Müşteri adına mail atma ya da gönderme yapma; metni hazırla, founder
  gönderir.
