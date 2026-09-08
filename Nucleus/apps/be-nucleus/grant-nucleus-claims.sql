-- Biltim: rol yetkilerini nucleus'un okuduğu sözlüğe taşı.
--
-- SORUN. Veritabanında iki yetki sözlüğü var. Eskisi (bu uygulamanın önceki
-- arka ucundan) `five_s_audit_plans.read` biçiminde; nucleus ise
-- `get.five_s_audit_plans` biçimini okuyor. Beş rolün de taşıdığı 100 yetkinin
-- TAMAMI eski sözlükte, nucleus sözlüğünde SIFIR. Nucleus'un ürettiği 2715
-- yetki ise hiçbir role atanmamış.
--
-- SONUÇ. godmin dışında hiç kimse hiçbir tabloyu okuyamıyor. Denetçi, ekibine
-- planlanmış denetimi göremiyor: sunucu "No access to GET five_s_audit_plans"
-- diyor, ekran boş liste alıyor ve bunu "size denetim planlanmamış" diye
-- gösteriyor. Ürünün ana akışı, tam da onun için var olan rol için çalışmıyor.
--
-- BU BETİK NE YAPAR. Yeni politika icat etmez. Her rolün ZATEN sahip olduğu
-- eski yetkinin nucleus'taki birebir karşılığını ekler:
--     X.read   -> get.X
--     X.write  -> post.X
--     X.update -> put.X ve patch.X
--     X.delete -> delete.X
-- Kolon düzeyindeki (get.X.kolon) yetkiler kapsam dışıdır; tablo düzeyi yeter.
-- Eski kayıtlara dokunulmaz, tekrar çalıştırmak güvenlidir.
--
-- NOT (karar senin): beş rolün kümesi birebir AYNI. Yani bu çeviri, bugünkü
-- kayıtlı niyeti aynen taşır — rol ayrımı getirmez. Ayrım istiyorsan bunu
-- uyguladıktan sonra rol bazında kısmak gerekir.

BEGIN;

WITH mapping AS (
    SELECT rc.role_id,
           regexp_replace(c.action, '\.(read|write|update|delete)$', '') AS tbl,
           substring(c.action from '\.(read|write|update|delete)$')      AS verb
    FROM main.role_claims rc
    JOIN main.claims c ON c.id = rc.claim_id
    WHERE c.action ~ '\.(read|write|update|delete)$'
      AND c.action !~ '^(get|post|put|patch|delete)\.'
),
wanted AS (
    SELECT role_id, 'get.'    || tbl AS action FROM mapping WHERE verb = 'read'
    UNION SELECT role_id, 'post.'   || tbl FROM mapping WHERE verb = 'write'
    UNION SELECT role_id, 'put.'    || tbl FROM mapping WHERE verb = 'update'
    UNION SELECT role_id, 'patch.'  || tbl FROM mapping WHERE verb = 'update'
    UNION SELECT role_id, 'delete.' || tbl FROM mapping WHERE verb = 'delete'
)
INSERT INTO main.role_claims (role_id, claim_id)
SELECT w.role_id, c.id
FROM wanted w
JOIN main.claims c ON c.action = w.action
WHERE NOT EXISTS (
    SELECT 1 FROM main.role_claims rc
    WHERE rc.role_id = w.role_id AND rc.claim_id = c.id
);

COMMIT;

-- Sonuç: her rol için iki sözlükteki yetki sayısı.
SELECT r.name,
       count(*) FILTER (WHERE c.action ~ '^(get|post|put|patch|delete)\.') AS nucleus_sozlugu,
       count(*) FILTER (WHERE c.action !~ '^(get|post|put|patch|delete)\.') AS eski_sozluk
FROM main.roles r
LEFT JOIN main.role_claims rc ON rc.role_id = r.id
LEFT JOIN main.claims c ON c.id = rc.claim_id
GROUP BY r.name ORDER BY 2 DESC;
