# Biltim 5S — backend (nucleus-core-ts)

Elle yazılmış eski backend'in yerini alır. Jenerik CRUD, kimlik doğrulama,
yetkilendirme, denetim kaydı, dosya ve bildirim artık `nucleus-core-ts`
paketinden geliyor ve `config.json` ile tanımlanıyor. Elde kalan kod yalnızca
framework'ün ifade edemediği iki uç: rapor toplamları ve Excel çıktısı.

| | |
|---|---|
| Paket | `nucleus-core-ts@0.9.951` |
| Port | 1001 |
| Dokümantasyon | `http://localhost:1001/docs` |
| Sağlık | `http://localhost:1001/health` |

## Yerel çalıştırma

Depo kökünden (`Nucleus/`) tek komut backend ve frontend'i birlikte açar:

```bash
bun run dev
```

Şema `config.json`'dan üretiliyor. Config'i değiştirdikten sonra:

```bash
bun --cwd apps/be-nucleus run gen
```

## Müşteri veritabanına geçiş

Mevcut şema ve veri KORUNUR. Sıra önemli:

**1. Yedek al**

```bash
pg_dump "$DATABASE_URL" > biltim-gecis-oncesi.sql
```

**2. Hazırlık DDL'i — backend'i başlatmadan ÖNCE**

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/be-nucleus/migrate.sql
```

Üç şey yapar: `claims.mode` kolonuna varsayılan koyar (yoksa nucleus'un claim
seed'inin tamamı `23502` ile düşer), kullanılmayan boş `verification*`
tablolarını düşürür (satır bulursa durur), ve sistem tablolarının
`created_at`/`updated_at` kolonlarını `AT TIME ZONE 'UTC'` ile açıkça
`timestamptz`'ye çevirir.

> Son madde kritik: bu dönüşümü nucleus'a bırakırsan sonuç ALTER'ı çalıştıran
> oturumun saat dilimine bağlı kalır. `Europe/Istanbul` oturumunda her damga
> **3 saat geri** kayıyor. Betik bunu açıkça yapar, sunucu saati ne olursa olsun
> sonuç aynıdır.

**3. Backend'i başlat.** Açılışta eksik kolon ve tabloları kendisi ekler
(ölçüm: 62 kolon + 14 tablo, hepsi ek — hiçbir kolon silinmez veya değişmez).

**4. Rol → claim eşlemesi — backend açıldıktan SONRA**

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/be-nucleus/grant-roles.sql
```

Eski `users.read` biçimindeki claim'lerin nucleus'taki `get.users` karşılığını
her role bağlar. Kimseye yeni yetki eklemez, kimseden almaz.

**5. Doğrula**

```bash
psql "$DATABASE_URL" -c "select count(*) from main.users"
psql "$DATABASE_URL" -c "set timezone='UTC'; select created_at from main.users limit 1"
```

Damga göç öncesiyle aynı olmalı.

## Dikkat edilecekler

- **Şifreler taşınır.** Nucleus `Bun.password.verify` kullanıyor; mevcut
  `$argon2id$` ve bcrypt hash'leri olduğu gibi doğrulanır.
- **`jwtClaimsMode: 'resolve'` bilerek seçildi.** Varsayılan `embed` bütün
  claim'leri JWT'ye gömüyor; godmin'de erişim çerezi 4828 bayta çıkıyor ve
  tarayıcı 4096 sınırını aşan çerezi sessizce atıyor — giriş başarılı görünüp
  her istek 401 alıyor. `resolve` modunda çerez 312 bayt. Bu mod Redis ister.
- **Cookie adları** eski isimlere sabitlendi (`nucleus_access_token` …), aksi
  hâlde müşterinin açık oturumları düşer.
- **Domain tabloları `add_base_columns: false`** ile tanımlı; taban kolonlar
  müşterideki tipleriyle (saat dilimsiz `timestamp`) korunuyor. Bunu `true`
  yaparsan nucleus 15 tabloyu daha dönüştürmek ister.
- **`.env.docker` içindeki jetonlar yer tutucu** — teslimat öncesi değiştir.

## Bekleyen işler

- GitHub / Azure OAuth düğmeleri bağlı değil; `authentication.oauth` config'i
  ve sağlayıcı anahtarları gerekiyor (eski kurulumda da anahtar yoktu).
- Eski verification tasarımcısı ekranları nucleus'un yeni akış modeline göre
  yazılmayı bekliyor. İlgili tabloların hepsi boştu.
- `apps/be` (eski backend) silinmedi, yalnız `dev` görevi devre dışı bırakıldı.
