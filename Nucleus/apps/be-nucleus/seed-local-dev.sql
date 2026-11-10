-- Yerel geliştirme için en küçük başlangıç verisi. CANLIDA ÇALIŞTIRMA.
--
-- Boş bir veritabanında nucleus açılışta tabloları, claim'leri ve godmin
-- hesabını kendisi kurar; ama Biltim'in rolleri ve 5S soruları eski
-- veriden geliyordu, boş kurulumda yoklar (form açılır ama soru yok, kimseye
-- rol verilemez). Bu dosya onları ekler. Gizli bilgi yok; tekrar
-- çalıştırmak güvenlidir (her satır doğal anahtarıyla, yoksa eklenir).
--
-- Sorular yer tutucudur, müşterinin gerçek soru metinleri değil. Puan
-- kurallarının denenebilmesi için 5. adımda 5 soru var: 5.5 orta/kötü ise
-- toplamdan %10 düşer, 5.1 orta/kötü ise 5. adım 0. (2.3 kuralı 22.10
-- notlarıyla kaldırıldı; 2. adımdaki 3. soru yalnız yer tutucu.)
--
-- Sıra (CLAUDE.md > Komutlar > Yeni bilgisayarda yerel veritabanı):
--   1. arka ucu BİR KEZ başlat ve kapat (tablolar + claim'ler + godmin)
--   2. psql -d biltim_v2 -f seed-local-dev.sql
--   3. psql -d biltim_v2 -f roles-nucleus-claims.sql
--   4. arka ucu yeniden başlat (boot.ts GRANTS rollere ek yetkileri verir)

BEGIN;

INSERT INTO main.roles (name, alias, description, is_system)
SELECT v.name, v.alias, v.description, v.is_system
FROM (VALUES
  ('Super Admin', 'Super Admin', 'Full system access - God mode equivalent for non-god users', true),
  ('Content Manager Core Team', 'Merkez Ekip', 'Ana veri yönetimi ve bulgu onay.', false),
  ('Manager', 'Müdür', 'Kullanıcı rol ataması ve bulguların status değişimi.', true),
  ('Field Manager', 'Saha Sorumlusu', 'Açık bulgu kapatabilir ve sonrası fotoğraf yükleyebilir.', false),
  ('Auditor', 'Denetçi', 'Denetim kaydı açabilir. Termin tarihi girebilir.', false)
) AS v(name, alias, description, is_system)
WHERE NOT EXISTS (SELECT 1 FROM main.roles r WHERE r.name = v.name);

INSERT INTO main.five_s_steps (code, title, max_score, "order")
SELECT v.code, v.title, 20, v.ord
FROM (VALUES
  ('S1', '1 - Sınıflandırma', 1),
  ('S2', '2 - Düzenleme', 2),
  ('S3', '3 - Temizlik', 3),
  ('S4', '4 - Standartlaştırma', 4),
  ('S5', '5 - Sürdürme', 5)
) AS v(code, title, ord)
WHERE NOT EXISTS (SELECT 1 FROM main.five_s_steps s WHERE s.code = v.code);

INSERT INTO main.five_s_questions (step_id, external_id, "order", text, max_score, require_explanation)
SELECT s.id, v.external_id, v.ord, v.text, 10, true
FROM (VALUES
  ('S1', 'S1-Q1', 1, '1.1 Sınıflandırma sorusu (yer tutucu)'),
  ('S1', 'S1-Q2', 2, '1.2 Sınıflandırma sorusu (yer tutucu)'),
  ('S2', 'S2-Q1', 1, '2.1 Düzenleme sorusu (yer tutucu)'),
  ('S2', 'S2-Q2', 2, '2.2 Düzenleme sorusu (yer tutucu)'),
  ('S2', 'S2-Q3', 3, '2.3 Düzenleme sorusu (yer tutucu)'),
  ('S3', 'S3-Q1', 1, '3.1 Temizlik sorusu (yer tutucu)'),
  ('S3', 'S3-Q2', 2, '3.2 Temizlik sorusu (yer tutucu)'),
  ('S4', 'S4-Q1', 1, '4.1 Standartlaştırma sorusu (yer tutucu)'),
  ('S4', 'S4-Q2', 2, '4.2 Standartlaştırma sorusu (yer tutucu)'),
  ('S5', 'S5-Q1', 1, '5.1 Orta/kötü ise 5. adım 0 puan (kural sorusu)'),
  ('S5', 'S5-Q2', 2, '5.2 Sürdürme sorusu (yer tutucu)'),
  ('S5', 'S5-Q3', 3, '5.3 Sürdürme sorusu (yer tutucu)'),
  ('S5', 'S5-Q4', 4, '5.4 Sürdürme sorusu (yer tutucu)'),
  ('S5', 'S5-Q5', 5, '5.5 Orta/kötü ise toplamdan %10 düşer (kural sorusu)')
) AS v(step_code, external_id, ord, text)
JOIN main.five_s_steps s ON s.code = v.step_code
WHERE NOT EXISTS (SELECT 1 FROM main.five_s_questions q WHERE q.external_id = v.external_id);

INSERT INTO main.five_s_locations (name, department_name)
SELECT v.name, v.department_name
FROM (VALUES
  ('Test Üretim Sahası', 'Üretim'),
  ('Test Depo', 'Lojistik')
) AS v(name, department_name)
WHERE NOT EXISTS (SELECT 1 FROM main.five_s_locations l WHERE l.name = v.name);

INSERT INTO main.five_s_finding_types (name)
SELECT v.name FROM (VALUES ('Temizlik çizelgesi yok'), ('Tanımlamalar eksik'), ('Ayıklama eksik')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM main.five_s_finding_types t WHERE t.name = v.name);

INSERT INTO main.five_s_actions (name)
SELECT v.name FROM (VALUES ('Çizelge oluşturulacak'), ('Tanımlanacak'), ('Ayıklanacak')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM main.five_s_actions a WHERE a.name = v.name);

COMMIT;
