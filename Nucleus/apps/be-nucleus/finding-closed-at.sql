-- Kapanan bulguya kapanma tarihini veritabanı yazsın.
--
-- Ölçüldü: bulgu 77 ekrandan "Kapandı" yapıldı, satır kapandı, `completed_at`
-- BOŞ kaldı. Veritabanındaki 65 bulgunun hiçbirinde bu kolon dolu değil.
-- Oysa raporlar ucu (src/routes/reports.ts) ortalama kapanma süresini tam bu
-- kolondan hesaplıyor:
--     avg(completed_at - detected_date) WHERE completed_at IS NOT NULL
-- Kolon hiç dolmadığı için o metrik hiçbir zaman bir değer üretemedi —
-- müşteri raporda hep boş bir kutu görüyordu.
--
-- Neden tetikleyici, neden ekran değil: bulguyu kapatan tek bir yer yok.
-- Bulgular ekranı, çevrimdışı kuyruğun tekrar oynattığı istekler ve API'yi
-- doğrudan kullanan saha sorumlusu aynı satıra yazıyor. Nucleus'un yazmadan
-- önce gövdeye dokunabileceğin bir kancası yok (onRequest gövdeyi
-- değiştiremiyor), bu yüzden damga hepsinin altında, tek noktada duruyor.
--
-- Saat dilimi: `completed_at` bir DATE. Havuz `-c timezone=UTC` ile açılıyor,
-- dolayısıyla düz `now()::date` akşam 21:00'den sonra kapatılan bir bulguyu
-- BİR ÖNCEKİ güne yazardı. Tarih, işin yapıldığı yerin takvimine göre
-- anlamlı olduğu için tesisin saatine çevriliyor.

CREATE OR REPLACE FUNCTION main.five_s_stamp_closed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tz text := coalesce(current_setting('biltim.local_tz', true), 'Europe/Istanbul');
BEGIN
  IF NEW.status = 'closed' THEN
    -- Kapanıyor: tarihi yoksa bugünü yaz. Zaten bir tarih taşıyorsa (içeri
    -- aktarılmış geçmiş kayıt) ona dokunma.
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := (now() AT TIME ZONE tz)::date;
    END IF;
  ELSE
    -- Yeniden açıldı: kapanma tarihi artık yalan söyler, temizlensin.
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS five_s_findings_closed_at ON main.five_s_findings;
CREATE TRIGGER five_s_findings_closed_at
  BEFORE INSERT OR UPDATE OF status, completed_at ON main.five_s_findings
  FOR EACH ROW
  EXECUTE FUNCTION main.five_s_stamp_closed_at();

-- Geçmişe dönük doldurma: SADECE kanıtı olanlar.
--
-- Denetim kaydı, durumu 'closed' yapan isteği tarihiyle birlikte tutuyor.
-- Kanıtı olmayan (içeri aktarılmış ya da tohumlanmış) kapalı bulgulara tarih
-- UYDURULMUYOR; rapor zaten tarihi olmayanı hesaba katmıyor.
UPDATE main.five_s_findings f
SET completed_at = sub.kapanma
FROM (
  SELECT a.entity_id,
         min((a.created_at AT TIME ZONE coalesce(current_setting('biltim.local_tz', true),'Europe/Istanbul'))::date) AS kapanma
  FROM main.audit_logs a
  WHERE a.new_values->>'status' = 'closed'
  GROUP BY a.entity_id
) sub
WHERE f.id = sub.entity_id
  AND f.status = 'closed'
  AND f.completed_at IS NULL;

SELECT status,
       count(*) FILTER (WHERE completed_at IS NOT NULL) AS tarihli,
       count(*) AS toplam
FROM main.five_s_findings
GROUP BY status
ORDER BY status;
