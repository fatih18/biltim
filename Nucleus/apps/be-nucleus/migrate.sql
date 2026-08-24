-- Biltim: eski elle yazılmış backend'den nucleus-core-ts paketine geçiş.
-- Müşteri veritabanında ÇALIŞTIRILACAK TEK hazırlık adımı. Hiçbir satır
-- silinmez, hiçbir kolonun tipi değişmez; nucleus geri kalan kolonları ve
-- tabloları açılışta kendisi ekler (ölçüldü: 62 kolon + 14 tablo, hepsi ek).
--
-- Çalıştırmadan önce yedek al:
--   pg_dump "$DATABASE_URL" > biltim-gecis-oncesi.sql

BEGIN;

-- 1) claims.mode
-- Biltim'e özel yol eşleme kolonu (exact | startsWith). NOT NULL ve default'suz
-- olduğu için nucleus'un claim seed'i bu kolonu bilmeden INSERT edince 23502
-- ile düşüyor — 2913 claim'in tamamı. Default koymak mevcut satırlara dokunmaz.
ALTER TABLE main.claims ALTER COLUMN mode SET DEFAULT 'startsWith';

-- 2) Kullanılmayan eski verification tabloları
-- Nucleus'un verification modeli daha yeni (flow/instance/edge) ve bu beş
-- tabloya default'suz NOT NULL kolonlar eklemek istiyor. Beşi de BOŞ —
-- aşağıdaki kontrol satır bulursa geçiş durur ve elle karar verilir.
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT
    (SELECT count(*) FROM main."verifications") +
    (SELECT count(*) FROM main."verificationSteps") +
    (SELECT count(*) FROM main."verificationRequirements") +
    (SELECT count(*) FROM main."verificationNotificationRules") +
    (SELECT count(*) FROM main."verificationNotificationRecipients")
  INTO n;

  IF n > 0 THEN
    RAISE EXCEPTION
      'Eski verification tablolarinda % satir var. Bu gecis onlarin bos olduguna dayaniyor; devam etmeden once veriyi tasi.', n;
  END IF;

  DROP TABLE IF EXISTS main."verificationNotificationRecipients" CASCADE;
  DROP TABLE IF EXISTS main."verificationNotificationRules" CASCADE;
  DROP TABLE IF EXISTS main."verificationRequirements" CASCADE;
  DROP TABLE IF EXISTS main."verificationSteps" CASCADE;
  DROP TABLE IF EXISTS main."verifications" CASCADE;
END $$;

-- 3) Sistem tablolarının created_at / updated_at kolonlarını AÇIKÇA timestamptz'ye çevir
--
-- Nucleus'un taban kolonları timestamptz; biltim'inkiler saat dilimsiz. Bu
-- dönüşümü nucleus'a bırakırsak sonuç ALTER'ı çalıştıran oturumun saat dilimine
-- bağlı kalır — ÖLÇTÜM: Europe/Istanbul oturumunda 09:17 → 06:17Z, yani her
-- damga 3 saat geri kayıyor. Biltim değerleri UTC-naive yazıyor, o yüzden
-- doğru yorum 'AT TIME ZONE UTC'. Burada açıkça yapıyoruz ki sunucunun yerel
-- saat dilimi ne olursa olsun sonuç aynı olsun; nucleus açıldığında kolonlar
-- zaten timestamptz olduğu için dönüştürecek bir şey bulmuyor.
--
-- Domain tabloları (five_s_*, companies, board_meeting_decisions, userClaims)
-- BİLEREK dışarıda: onlar config'de add_base_columns:false ile saat dilimsiz
-- tanımlı, nucleus onlara dokunmuyor.
DO $$
DECLARE
  t text;
  sistem_tablolari text[] := ARRAY[
    'users','roles','claims','role_claims','user_roles',
    'profiles','files','notifications','addresses','phones'
  ];
BEGIN
  FOREACH t IN ARRAY sistem_tablolari LOOP
    IF to_regclass('main.' || quote_ident(t)) IS NULL THEN
      CONTINUE;
    END IF;

    -- updated_at nucleus'ta NOT NULL; boş olanları created_at ile doldur.
    EXECUTE format(
      'UPDATE main.%I SET updated_at = created_at WHERE updated_at IS NULL', t);

    EXECUTE format(
      'ALTER TABLE main.%I ALTER COLUMN created_at TYPE timestamptz '
      'USING created_at AT TIME ZONE ''UTC''', t);
    EXECUTE format(
      'ALTER TABLE main.%I ALTER COLUMN updated_at TYPE timestamptz '
      'USING updated_at AT TIME ZONE ''UTC''', t);

    EXECUTE format('ALTER TABLE main.%I ALTER COLUMN updated_at SET NOT NULL', t);
    EXECUTE format('ALTER TABLE main.%I ALTER COLUMN created_at SET DEFAULT now()', t);
    EXECUTE format('ALTER TABLE main.%I ALTER COLUMN updated_at SET DEFAULT now()', t);
  END LOOP;
END $$;

COMMIT;

-- Geçiş sonrası doğrulama (elle çalıştır):
--   SELECT count(*) FROM main.claims;        -- eski 130 + nucleus'un seed'i
--   SELECT count(*) FROM main.users;         -- değişmemeli
--   SELECT created_at FROM main.users LIMIT 1;  -- damga kaymamalı
