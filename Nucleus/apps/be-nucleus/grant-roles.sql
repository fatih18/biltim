-- Biltim rol→claim eşlemesi. migrate.sql'den FARKLI olarak bu, backend'in İLK
-- açılışından SONRA çalıştırılır: nucleus kendi claim'lerini açılışta seed ediyor,
-- bu betik de mevcut rollere onların karşılıklarını bağlıyor.
--
--   1) migrate.sql   -> backend'i başlat  -> 2) grant-roles.sql
--
-- Eski claim adlandırması `users.read` / `users.write` (varlık.fiil) idi; nucleus
-- `get.users` / `post.users` (metot.varlık) kullanıyor. Eşleme mekanik: her rolün
-- ELİNDE OLAN eski claim'in method+varlık karşılığı neyse o veriliyor — kimseye
-- yeni yetki eklenmiyor, kimseden alınmıyor.
--
-- ⚠️ ÖNEMLİ: eski backend AUTHZ_PERMISSIVE=1 ile çalışıyordu, yani bu 500
-- rol-claim satırı pratikte HİÇ uygulanmıyordu; giriş yapan herkes her şeyi
-- yapabiliyordu. Nucleus bunları gerçekten uyguluyor. Aşağıdaki eşleme mevcut
-- KAYITLI niyeti birebir taşır; rolleri daraltmak ayrı bir ürün kararıdır.

BEGIN;

-- Eski claim satırlarından (varlık, metot) çiftini çıkar.
-- path '/api/users' -> 'users'; alt yollu özel claim'ler ('/api/users/verify' gibi)
-- nucleus tarafında karşılığı olmadığı için dışarıda kalır.
WITH eski AS (
  SELECT
    rc.role_id,
    lower(c.method) || '.' ||
      regexp_replace(c.path, '^/api/', '') AS nucleus_action
  FROM main.role_claims rc
  JOIN main.claims c ON c.id = rc.claim_id
  WHERE c.path ~ '^/api/[a-zA-Z_]+$'          -- yalnız düz varlık yolları
    AND c.method IN ('GET','POST','PUT','PATCH','DELETE')
),
hedef AS (
  SELECT DISTINCT e.role_id, c2.id AS claim_id
  FROM eski e
  JOIN main.claims c2 ON c2.action = e.nucleus_action
)
INSERT INTO main.role_claims (role_id, claim_id)
SELECT h.role_id, h.claim_id
FROM hedef h
WHERE NOT EXISTS (
  SELECT 1 FROM main.role_claims rc
  WHERE rc.role_id = h.role_id AND rc.claim_id = h.claim_id
);

COMMIT;

-- Kontrol: her rolün kaç claim'i olduğu
--   SELECT r.name, count(*) FROM main.roles r
--   JOIN main.role_claims rc ON rc.role_id = r.id GROUP BY r.name ORDER BY 1;
