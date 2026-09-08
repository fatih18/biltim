-- Biltim: rol ayrımı. Her rol, ekranlarda YAPABİLDİĞİ işin gerektirdiği kadar.
--
-- NEDEN. Bu veritabanında beş rolün yetki kümesi birebir AYNIYDI (aynı md5):
-- denetçiyle süper admin arasında arka uçta hiçbir fark yoktu. Ayrım yalnızca
-- ekranlarda, rol adına bakılarak yapılıyordu — yani API'ye doğrudan giden
-- herkes her şeyi yapabiliyordu. Ölçüldü: denetçi hesabı 23 silme yetkisi
-- taşıyordu, delete.users ve delete.roles dahil.
--
-- NEREDEN ÇIKARILDI. Uydurulmadı: her satır, ilgili rolün o ekranda ulaşabildiği
-- bir kontrolden geliyor. routeAccess kuralları hangi rolün hangi ekrana
-- girdiğini, ekranların kendi kapıları (isAuditor, canCloseFinding,
-- canCreateSingleFinding, hasPrivilege) da o ekranda ne yapabildiğini söylüyor.
--
-- KOLON DÜZEYİ. Nucleus put.<tablo>.<kolon> yetkilerini de uyguluyor
-- (allowedFields). Denetçi bulguyu güncelleyebilir ama DURUMUNU değiştiremez —
-- ekrandaki isAuditor kapısının arka uçtaki karşılığı budur.
--
-- Yalnızca nucleus sözlüğüne (get./post./put./patch./delete.) dokunur; eski
-- sözlükteki satırlar olduğu gibi kalır. Tekrar çalıştırmak güvenlidir.

BEGIN;

-- Nucleus sözlüğündeki mevcut atamaları sıfırla; aşağıdaki küme tek kaynaktır.
DELETE FROM main.role_claims rc
USING main.claims c, main.roles r
WHERE rc.claim_id = c.id AND rc.role_id = r.id
  AND c.action ~ '^(get|post|put|patch|delete)\.'
  AND r.name IN ('Auditor','Field Manager','Manager','Content Manager Core Team','Super Admin');

CREATE TEMP TABLE wanted(role_name text, action text) ON COMMIT DROP;

-- ── Herkesin okuduğu ────────────────────────────────────────────────────────
-- Denetim formu, bulgu listesi, raporlar ve ana sayfa bu tabloları okur; ad
-- çözmek için users/profiles de gerekir.
INSERT INTO wanted
SELECT r, 'get.'||t FROM
  unnest(ARRAY['Auditor','Field Manager','Manager','Content Manager Core Team','Super Admin']) r,
  unnest(ARRAY['five_s_actions','five_s_audit_answers','five_s_audit_drafts','five_s_audit_plans',
               'five_s_audit_team_members','five_s_audit_teams','five_s_audits','five_s_finding_types',
               'five_s_findings','five_s_locations','five_s_questions','five_s_steps',
               'board_meeting_decisions','files','notifications','users','profiles']) t;

-- ── Denetçi: denetimi doldurur, bulgu kaydeder ──────────────────────────────
-- Formu kaydetmek denetim + yanıt + bulgu yazar; taslak çevrimdışı için.
INSERT INTO wanted
SELECT 'Auditor', a FROM unnest(ARRAY[
  'post.five_s_audits','post.five_s_audit_answers','post.five_s_findings','post.five_s_audit_drafts',
  'post.files','post.notifications',
  'put.five_s_audit_drafts','patch.five_s_audit_drafts','delete.five_s_audit_drafts',
  -- Bulguyu güncelleyebilir (fotoğraf, açıklama) ama durum kolonu YOK:
  -- ekrandaki isAuditor kapısının arka uçtaki karşılığı.
  'put.five_s_findings','patch.five_s_findings'
]) a;

-- ── Saha sorumlusu: bulguyu kapatan roldür ──────────────────────────────────
INSERT INTO wanted
SELECT 'Field Manager', a FROM unnest(ARRAY[
  'post.files','post.notifications',
  'put.five_s_findings','patch.five_s_findings','put.five_s_findings.status','patch.five_s_findings.status'
]) a;

-- ── Müdür ve Merkez Ekip: ana veri, planlama, ekipler, sorular ──────────────
-- routeAccess "master-data" ikisini de içeri alıyor; Sorular sekmesi de.
INSERT INTO wanted
SELECT r, m||'.'||t FROM
  unnest(ARRAY['Manager','Content Manager Core Team']) r,
  unnest(ARRAY['post','put','patch','delete']) m,
  unnest(ARRAY['five_s_actions','five_s_finding_types','five_s_locations','five_s_questions',
               'five_s_steps','five_s_audit_plans','five_s_audit_teams','five_s_audit_team_members',
               'board_meeting_decisions']) t;
-- Bulgu durumunu değiştirebilirler (kapatma yetkisi saha sorumlusundadır ama
-- müdür bulguyu yönetir), bulgu silme dahil.
INSERT INTO wanted
SELECT r, a FROM unnest(ARRAY['Manager','Content Manager Core Team']) r,
  unnest(ARRAY['post.five_s_findings','put.five_s_findings','patch.five_s_findings',
               'delete.five_s_findings','put.five_s_findings.status','patch.five_s_findings.status',
               'post.files','post.notifications','put.notifications','patch.notifications']) a;

-- ── Süper Admin: sistem ekranları da onda ───────────────────────────────────
-- /users, /claims, /logs, /sistem-durumu routeAccess'te super admin'e açık.
INSERT INTO wanted
SELECT 'Super Admin', m||'.'||t FROM
  unnest(ARRAY['get','post','put','patch','delete']) m,
  unnest(ARRAY['five_s_actions','five_s_audit_answers','five_s_audit_drafts','five_s_audit_plans',
               'five_s_audit_team_members','five_s_audit_teams','five_s_audits','five_s_finding_types',
               'five_s_findings','five_s_locations','five_s_questions','five_s_steps',
               'board_meeting_decisions','files','notifications','users','profiles',
               'roles','claims','user_roles','role_claims','audit_logs','user_sessions']) t;

INSERT INTO main.role_claims (role_id, claim_id)
SELECT r.id, c.id
FROM wanted w
JOIN main.roles r  ON r.name = w.role_name
JOIN main.claims c ON c.action = w.action
WHERE NOT EXISTS (SELECT 1 FROM main.role_claims rc WHERE rc.role_id = r.id AND rc.claim_id = c.id);

COMMIT;

SELECT r.name,
       count(*) FILTER (WHERE c.action LIKE 'get.%')    AS okuma,
       count(*) FILTER (WHERE c.action LIKE 'post.%')   AS ekleme,
       count(*) FILTER (WHERE c.action ~ '^(put|patch)\.') AS guncelleme,
       count(*) FILTER (WHERE c.action LIKE 'delete.%') AS silme
FROM main.roles r
LEFT JOIN main.role_claims rc ON rc.role_id = r.id
LEFT JOIN main.claims c ON c.id = rc.claim_id AND c.action ~ '^(get|post|put|patch|delete)\.'
GROUP BY r.name ORDER BY 2 DESC NULLS LAST;
