-- Çevrimdışı kuyruğun aynı denetimi iki kez yazmasını engelle.
--
-- Sahada denetim formu internet yokken tarayıcıda kuyruğa alınıyor. Bağlantı
-- gelince kuyruk şöyle oynatılıyor: önce denetim oluşturuluyor, sonra
-- bulgular. Bir bulgu düşerse gönderim kuyrukta kalıyordu ve bir SONRAKİ
-- deneme yine "denetim oluştur" adımından başlıyordu — tek bir hatalı bulgu,
-- her denemede aynı puanları taşıyan yeni bir denetim üretiyordu.
--
-- Ölçüldü: `five_s_audits.client_submission_id` kolonu tam bu iş için var ama
-- 8 denetimin HİÇBİRİNDE dolu değildi; kuyruk bu alanı hiç göndermiyordu.
-- 65 bulgunun 5'inde `client_finding_id` vardı. Tabloların hiçbirinde
-- tekillik kısıtı yoktu, yani kopyayı hiçbir şey durdurmuyordu.
--
-- Asıl düzeltme istemcide: senkron artık kaldığı yerden devam ediyor,
-- baştan başlamıyor. Buradaki kısıtlar son emniyet — iki sekme aynı anda
-- senkron etse bile ikincisi hata alır, sessizce kopya yazmaz.
--
-- Kısmi (WHERE NOT NULL) indeksler: eski kayıtların hepsinde bu kolonlar boş
-- ve boş kalmaya devam edebilir; kısıt yalnız damgalı satırlar için geçerli.

CREATE UNIQUE INDEX IF NOT EXISTS five_s_audits_client_submission_uq
  ON main.five_s_audits (client_submission_id)
  WHERE client_submission_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS five_s_findings_client_finding_uq
  ON main.five_s_findings (client_finding_id)
  WHERE client_finding_id IS NOT NULL;

SELECT indexname FROM pg_indexes
WHERE schemaname = 'main'
  AND indexname IN ('five_s_audits_client_submission_uq', 'five_s_findings_client_finding_uq');
