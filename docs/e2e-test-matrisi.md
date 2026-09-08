# Biltim — uçtan uca test matrisi

Koddan çıkarıldı: 8 ekran, 393 senaryo.
Her satır arayüzden izlenebilir bir adım dizisidir; "beklenen" sütunu neyin kanıt sayılacağını söyler.

## Raporlar (/raporlar) — "5S Raporları"  (36 senaryo)

1. **Ekranı açma ve otomatik yükleme**  _[düşük · okur]_
   - Adımlar: Oturum açtıktan sonra üst menüden "Raporlar" başlığına tıklayın (veya adres çubuğuna /raporlar yazın). Hiçbir şeye dokunmadan bekleyin.
   - Beklenen: Başlık "5S Raporları" ve altında "Denetim, bulgu ve aksiyon verilerine ait tüm raporlar." görünür. Tek bir GET /reports/dashboard isteği (tarih parametresiz) atılır ve 5 özet kart + tüm grafik/tablo kartları dolar. Ağ sekmesinde bu isteğin SADECE BİR KEZ atılması kritik: fetchData'nın bağımlılığı yalnızca [dateFrom, dateTo] olduğu için sekme açık kaldıkça istek tekrarlanmamalı (eski hâlinde tek sayfa açılışında 211 istek ölçülmüştü).
   - Roller: Oturum açmış her kullanıcı. routeAccess.ROUTE_REQUIREMENTS içinde /raporlar için kural YOK, dolayısıyla canAccessRoute true döner (app/_utils/routeAccess/index.ts:66-119, :131).

2. **"Yenile" butonu ile yeniden çekme**  _[düşük · okur]_
   - Adımlar: Filtre çubuğundaki "Yenile" butonuna tıklayın.
   - Beklenen: Buton ikonu dönen spinner'a döner ve buton soluklaşır; yeni bir GET /reports/dashboard isteği atılır; cevap gelince ikon tekrar yenile okuna döner ve kartlardaki sayılar tazelenir. Aradan bir bulgu kapatılmışsa "Açık Bulgu" düşer, "Kapalı Bulgu" artar.
   - Roller: Oturum açmış her kullanıcı; rol kontrolü yok.

3. **Yenile butonunun yüklenirken kilitlenmesi**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlatın (throttling) ve "Yenile" butonuna arka arkaya 3-4 kez tıklayın.
   - Beklenen: İlk tıklamadan sonra buton disabled olur (opacity düşer) ve sonraki tıklamalar iş yapmaz: ağ sekmesinde yalnızca 1 adet GET /reports/dashboard görünür.
   - Roller: Oturum açmış her kullanıcı.

4. **"Başlangıç" tarihi ile filtreleme**  _[düşük · okur]_
   - Adımlar: "Başlangıç" etiketli tarih alanına tıklayın, açılan takvimden geçmişte bir tarih seçin (örn. bugünden 30 gün önce). Butona basmayın.
   - Beklenen: Seçim yapılır yapılmaz (Yenile'ye basmadan) yeni bir GET /reports/dashboard?date_from=YYYY-MM-DD isteği atılır. "Bölge / Bulgu Tipi Dağılımı", "Açık / Kapalı Bulgu Sayıları", "Bölge / 5S Adımı Dağılımı" ve "Termin Tarihi Geçmiş Aksiyonlar" five_s_findings.detected_date >= seçilen tarih ile; "5S Puan Trendi", "Bölge Bazında Puanlar", "Denetim Başına Ortalama Bulgu", "Müdürlük Bazlı Özet" ise five_s_audits.audit_date >= seçilen tarih ile daralır. Tarihten eski bir bulgu artık "Termin Tarihi Geçmiş Aksiyonlar" listesinde görünmemeli.
   - Roller: Oturum açmış her kullanıcı.

5. **"Bitiş" tarihi ile filtreleme ve gün sonu sınırı**  _[düşük · okur]_
   - Adımlar: "Bitiş" etiketli alana tıklayın ve BUGÜNÜN tarihini seçin. Bugün saat 14:00'te kaydedilmiş bir denetimin sayıldığını kontrol edin.
   - Beklenen: GET /reports/dashboard?date_to=YYYY-MM-DD atılır. Bulgular f.detected_date <= tarih ile kesilir; denetimler ise audit_date <= "tarih 23:59:59" ile kesildiği için bugün gün içinde girilmiş denetim "Toplam Denetim" sayısına DAHİL olur (saat 00:00 sınırı yüzünden düşmez).
   - Roller: Oturum açmış her kullanıcı.

6. **Tarih alanlarını temizleyip tüm veriye dönme**  _[düşük · okur]_
   - Adımlar: Önce "Başlangıç" ve "Bitiş" alanlarını doldurun, sayıların düştüğünü görün. Sonra her iki alanın içeriğini takvimden/klavyeden silin (boşaltın).
   - Beklenen: Her boşaltma bir istek tetikler ve son istek hiçbir sorgu parametresi taşımaz (URL'de date_from/date_to yok); özet kartlar filtresiz ilk açılıştaki değerlere geri döner. Boş dize payload'a hiç eklenmez.
   - Roller: Oturum açmış her kullanıcı.

7. **Takvim seçicinin alana tıklayınca açılması**  _[düşük · okur]_
   - Adımlar: "Başlangıç" alanının kutusuna — takvim ikonuna değil, kutunun herhangi bir yerine — tıklayın.
   - Beklenen: Tarayıcının yerel tarih seçicisi açılır ve alan odaklanır (input'un showPicker'ı çağrılır). Aynısı "Bitiş" için de geçerli.
   - Roller: Oturum açmış her kullanıcı.

8. **Tarih filtresinin etkilemediği iki kart**  _[düşük · okur]_
   - Adımlar: Önce "Denetim Planına Uyum" tablosundaki satır sayılarını ve "Fabrika Krokisi — Bulgu Isı Haritası" üzerindeki balon sayılarını not edin. Sonra "Başlangıç" ve "Bitiş" alanlarına çok dar bir aralık (örn. aynı gün) girin.
   - Beklenen: Diğer tüm kartlar daralırken bu iki kart HİÇ değişmez: backend'de planCompliance ve mapHeat sorguları tarih parametresi almıyor. Bu, test edilmesi gereken kasıtlı/kasıtsız bir davranış farkıdır.
   - Roller: Oturum açmış her kullanıcı.

9. **Hata durumu ve "Tekrar dene"**  _[düşük · okur]_
   - Adımlar: Backend'i durdurun (veya ağı kesin) ve "Yenile"ye basın. Kırmızı hata kutusu çıkınca backend'i geri açıp kutunun içindeki altı çizili "Tekrar dene" bağlantısına tıklayın.
   - Beklenen: Önce tüm dashboard yerine kırmızı zeminli tek bir kutu görünür; içinde sunucunun hata mesajı ya da mesaj yoksa "Rapor verisi alınamadı" yazar; konsola "dashboard report error" düşer. "Tekrar dene"ye basınca hata temizlenir ve tüm kartlar geri gelir. Dikkat: hata varken filtre çubuğu ve "Yenile" butonu da ekranda değildir — tek çıkış yolu "Tekrar dene".
   - Roller: Oturum açmış her kullanıcı.

10. **Özet kartların toplamları**  _[düşük · okur]_
   - Adımlar: "Toplam Denetim", "Son Dönem Ort. Puan", "Açık Bulgu", "Kapalı Bulgu", "Termin Geçmiş" kartlarındaki beş değeri okuyun ve alttaki "Müdürlük Bazlı Özet" tablosunun sütun toplamlarıyla karşılaştırın.
   - Beklenen: "Toplam Denetim" = Müdürlük tablosundaki "Denetim" sütununun toplamı; "Açık Bulgu" = "Açık" sütun toplamı; "Kapalı Bulgu" = "Kapalı" sütun toplamı; "Termin Geçmiş" = "Termin Tarihi Geçmiş Aksiyonlar" tablosundaki satır sayısı; "Son Dönem Ort. Puan" = "5S Puan Trendi" grafiğindeki EN SON dönemin ortalama puanı, tek ondalıkla. Veri yoksa "-" gösterir.
   - Roller: Oturum açmış her kullanıcı.

11. **"Son Dönem Ort. Puan" 75 eşiği rengi**  _[düşük · okur]_
   - Adımlar: Son dönem ortalaması 75'in altında olan bir tarih aralığı seçin, sonra 75 ve üzeri çıkan bir aralık seçin.
   - Beklenen: Değer 75'in altındayken kart rakamı amber/sarı, 75 ve üzerindeyken yeşil (emerald) renkte yazılır. Tam 75 değeri YEŞİL olmalı (>= karşılaştırması).
   - Roller: Oturum açmış her kullanıcı.

12. **"Termin Geçmiş" sıfır/pozitif rengi**  _[düşük · okur]_
   - Adımlar: Termini geçmiş açık bulgu bulunan bir aralık seçin, sonra hiç olmayan bir aralık seçin.
   - Beklenen: Sayı 0'dan büyükken rakam kırmızı (rose), 0 iken yeşil (emerald) yazılır ve aynı anda alttaki "Termin Tarihi Geçmiş Aksiyonlar" tablosu boş duruma geçer.
   - Roller: Oturum açmış her kullanıcı.

13. **"5S Puan Trendi" grafiği ve Hedef 75 çizgisi**  _[düşük · okur]_
   - Adımlar: "5S Puan Trendi" kartındaki çizgi grafiğin üzerine bir dönem noktasının üstüne gelin (hover). Lejanttaki "Ortalama Puan" ve "Hedef" yazılarını okuyun.
   - Beklenen: Koyu zeminli bir ipucu kutusu açılır ve o dönemin (YYYY-AA biçimli period) "Ortalama Puan" ile "Hedef" değerlerini gösterir. Grafikte y=75'te turuncu kesik çizgi ve sol üstünde "Hedef 75" etiketi vardır; y ekseni her zaman 0-100 arasıdır (veri 40'ta bile eksen 100'e kadar gider).
   - Roller: Oturum açmış her kullanıcı.

14. **"Bölge / Bulgu Tipi Dağılımı" yığılı grafiği**  _[düşük · okur]_
   - Adımlar: "Bölge / Bulgu Tipi Dağılımı" kartında bir çubuğun üzerine gelin; lejanttaki bulgu tipi adlarını okuyun; x ekseninde -25 derece eğik lokasyon adlarını kontrol edin.
   - Beklenen: Her lokasyon için tek bir yığılı çubuk çıkar; yığın dilimleri bulgu tipleridir ve ipucu kutusunda her tip için sayı görünür. Bir bulgunun lokasyon adı veya tipi boşsa o dilim "Bilinmiyor" adıyla gruplanır. Dilim toplamı = o lokasyonun toplam bulgu sayısı.
   - Roller: Oturum açmış her kullanıcı.

15. **"Açık / Kapalı Bulgu Sayıları" durum etiketleri**  _[düşük · okur]_
   - Adımlar: "Açık / Kapalı Bulgu Sayıları" kartının lejandına ve bir çubuğun ipucuna bakın.
   - Beklenen: Seriler İngilizce status değeriyle değil Türkçe gösterilir: 'open' → "Açık" (kırmızı), 'in_progress' → "Devam Ediyor" (sarı), diğer her şey → "Kapalı" (yeşil). Dikkat edilecek nokta: 'closed' dışındaki bilinmeyen bir status da "Kapalı" grubuna düşer.
   - Roller: Oturum açmış her kullanıcı.

16. **"Bölge Bazında Puanlar" ve hedef çizgisi**  _[düşük · okur]_
   - Adımlar: "Bölge Bazında Puanlar" kartındaki bir çubuğun üzerine gelin; 75 seviyesindeki kesik çizgiyi kontrol edin.
   - Beklenen: Her bölüm (department_name) için tek çubuk, ipucunda "Ort. Puan" değeri. y ekseni 0-100 sabit; 75'te turuncu kesik referans çizgisi var (bu kartta etiketsiz). Çubuğun bu çizginin altında/üstünde kalması, hedefin tutup tutmadığını gösterir.
   - Roller: Oturum açmış her kullanıcı.

17. **"Bölge / 5S Adımı Dağılımı" ve boş adım kodu**  _[düşük · okur]_
   - Adımlar: "Bölge / 5S Adımı Dağılımı" kartındaki lejanta bakın; adım kodu (step_code) boş bırakılmış bir bulgu oluşturulmuş bir lokasyonu inceleyin.
   - Beklenen: Yığılı çubuklar S adımlarına (S1..S5 vb.) göre bölünür; step_code boş/NULL olan bulgular "Bilinmiyor" adlı ayrı bir dilimde toplanır ve lejantta "Bilinmiyor" görünür.
   - Roller: Oturum açmış her kullanıcı.

18. **"Denetim Başına Ortalama Bulgu" ve Ekipsiz grubu**  _[düşük · okur]_
   - Adımlar: "Denetim Başına Ortalama Bulgu" kartındaki iki seriyi ("Ort. Bulgu / Denetim" mor, "Denetim Sayısı" mavi) inceleyin; ekibe bağlı olmayan (plan_id'siz ya da takımsız) bir denetim olup olmadığına bakın.
   - Beklenen: Her ekip için yan yana iki çubuk. Ekibi çözülemeyen denetimler "Ekipsiz" adlı tek bir grupta toplanır. Bir ekibin "Ort. Bulgu / Denetim" değeri = o ekibin bulgu sayısı / denetim sayısı (2 ondalık); denetimi 0 olan ekipte 0 gösterilir.
   - Roller: Oturum açmış her kullanıcı.

19. **"Denetim Planına Uyum" tablosu**  _[düşük · okur]_
   - Adımlar: "Denetim Planına Uyum" kartındaki tabloyu okuyun; sütun başlıkları "Durum", "Plan", "Denetçi Katıldı", "Saha Sor. Katıldı", "Saha Sor. Katılmadı".
   - Beklenen: Her plan durumu bir satır ve durum Türkçeleşmiş gelir: 'planned' → "Planlandı", 'completed' → "Tamamlandı", 'cancelled' → "İptal"; tanımsız bir durum ham değeriyle basılır. Katılım sayıları yeşil, katılmayan sayısı kırmızı. Tabloya yalnızca lokasyonu VEYA atanmış ekibi olan planlar girer (ikisi de boş olan plan hiçbir satıra sayılmaz).
   - Roller: Oturum açmış her kullanıcı.

20. **"Denetim Planına Uyum" boş durumu**  _[düşük · okur]_
   - Adımlar: Hiç planı olmayan bir kurulumda (ya da five_s_audit_plans tablosunda uygun satır yokken) ekranı açın.
   - Beklenen: Tablo gövdesinde 5 sütunu kaplayan tek bir satır: ortalanmış gri "Veri yok." metni.
   - Roller: Oturum açmış her kullanıcı.

21. **"Müdürlük Bazlı Özet" tablosu ve puan rengi**  _[düşük · okur]_
   - Adımlar: "Müdürlük Bazlı Özet" tablosunda "Müdürlük", "Denetim", "Ort. Puan", "Açık", "Kapalı", "Geciken" sütunlarını okuyun. Ortalaması 75 altında ve üstünde olan iki satırı karşılaştırın.
   - Beklenen: "Ort. Puan" 75 ve üzerindeyse yeşil, altındaysa amber kalın yazılır; puan NULL ise "-" görünür, aksi hâlde tek ondalıkla yazılır. "Açık" kırmızı, "Kapalı" yeşil, "Geciken" amber. Lokasyon eşlemesi bulunamayan denetimler "Tanımsız" müdürlüğünde toplanır (eşleme five_s_locations.name ile department_name'in küçük harf + trim karşılaştırmasından gelir).
   - Roller: Oturum açmış her kullanıcı.

22. **"Müdürlük Bazlı Özet" boş durumu**  _[düşük · okur]_
   - Adımlar: Hiç denetim bulunmayan bir tarih aralığı seçin (örn. gelecekteki bir gün için "Başlangıç" ve "Bitiş").
   - Beklenen: Tabloda 6 sütunu kaplayan tek bir "Veri yok." satırı çıkar ve aynı anda "Toplam Denetim" kartı 0, "Son Dönem Ort. Puan" kartı "-" olur.
   - Roller: Oturum açmış her kullanıcı.

23. **"Termin Tarihi Geçmiş Aksiyonlar" listesi**  _[düşük · okur]_
   - Adımlar: "Termin Tarihi Geçmiş Aksiyonlar" kartındaki tabloyu "No", "Lokasyon", "Tip", "Aksiyon", "Termin", "Gecikme", "Sorumlu" sütunlarıyla okuyun. Termini dün olan açık bir bulgu ile termini yarın olan açık bir bulguyu karşılaştırın.
   - Beklenen: Yalnızca status='open', due_date dolu ve due_date < bugün olan bulgular listelenir; termini yarın olan bulgu listede YOKTUR. Satırlar termine göre en eskiden yeniye sıralıdır. "Gecikme" sütunu kırmızı kalın "N gün" biçiminde (CURRENT_DATE - due_date). "Termin" hücresi tarihin ilk 10 karakteri (saat kısmı kırpılmış). Sorumlu boşsa "-". En fazla 500 satır döner.
   - Roller: Oturum açmış her kullanıcı.

24. **Termin geçmiş tablosunun kaydırılması ve sabit başlığı**  _[düşük · okur]_
   - Adımlar: Termini geçmiş 20+ bulgu varken "Termin Tarihi Geçmiş Aksiyonlar" tablosunun içinde aşağı kaydırın.
   - Beklenen: Kart yüksekliği sabit kalır (max-h-80) ve yalnızca tablo içeriği kayar; "No / Lokasyon / Tip / Aksiyon / Termin / Gecikme / Sorumlu" başlık satırı üstte yapışık (sticky) kalır ve altındaki satırların üstünü kapatan opak zemini vardır.
   - Roller: Oturum açmış her kullanıcı.

25. **Uzun aksiyon metninin kısaltılması ve ipucu**  _[düşük · okur]_
   - Adımlar: Termini geçmiş bulgulardan birinin "Yapılacak Aksiyon" alanına 240px'i aşacak uzunlukta metin girilmiş olsun. "Aksiyon" hücresinin üzerine imleci getirip bekleyin.
   - Beklenen: Hücrede metin "..." ile kırpılmış görünür, ancak fare üstünde beklenince tarayıcının yerel ipucunda METNİN TAMAMI çıkar. Aksiyon boşsa hücrede "-" yazar.
   - Roller: Oturum açmış her kullanıcı.

26. **Termin geçmiş boş durumu**  _[düşük · okur]_
   - Adımlar: Termini geçmiş açık bulgusu olmayan bir tarih aralığı seçin (veya hepsini kapatın).
   - Beklenen: Tabloda 7 sütunu kaplayan tek satır: "Termini geçmiş açık aksiyon yok. 🎉" ve üstteki "Termin Geçmiş" kartı 0 ve yeşil olur.
   - Roller: Oturum açmış her kullanıcı.

27. **Fabrika krokisi ısı haritası balonları**  _[düşük · okur]_
   - Adımlar: "Fabrika Krokisi — Bulgu Isı Haritası" kartında, Ana Veri Yönetimi'nde map_x/map_y girilmiş bir lokasyonun balonunun üzerine gelin.
   - Beklenen: 16:9 çerçeve içinde, sol üstte "Fabrika Krokisi (lokasyon koordinatları Ana Veri Yönetimi'nden girilebilir)" yazısı ve arkada soluk 8x4 ızgara vardır. Balon map_x/map_y yüzdesine yerleşir, içinde açık bulgu sayısı yazar, altında lokasyon adı görünür. Fare üstünde ipucu: "<Lokasyon> — Açık: N, Toplam: M" ve kapanmış bulgu varsa ", Ort. kapama: X gün". Balon rengi en yüksek açık sayısına orana göre: >=%66 kırmızı, >=%33 sarı, altı yeşil; çapı 28px + min(açık,10)*2 px, yani 10'dan sonra büyümez.
   - Roller: Oturum açmış her kullanıcı.

28. **Koordinatsız lokasyon rozetleri**  _[düşük · okur]_
   - Adımlar: map_x veya map_y'si girilmemiş en az bir aktif lokasyon varken "Fabrika Krokisi — Bulgu Isı Haritası" kartının krokinin ALTINDAKİ rozet şeridine bakın ve bir rozetin üstüne gelin.
   - Beklenen: Kroki dışında, her koordinatsız lokasyon için "<Ad> (N)" biçiminde küçük bir rozet çıkar; solunda aynı kırmızı/sarı/yeşil renk noktası vardır. Fare üstünde ipucu: "Kroki koordinatı girilmemiş". Koordinatsız lokasyon yoksa şerit hiç render edilmez.
   - Roller: Oturum açmış her kullanıcı.

29. **Kroki tamamen boş durumu**  _[düşük · okur]_
   - Adımlar: Hiçbir lokasyona koordinat girilmemiş bir kurulumda ekranı açıp "Fabrika Krokisi — Bulgu Isı Haritası" kartına bakın.
   - Beklenen: Kroki çerçevesinin ortasında "Henüz koordinatı girilmiş lokasyon yok." yazar; buna rağmen alttaki rozet şeridi tüm lokasyonları listeler.
   - Roller: Oturum açmış her kullanıcı.

30. **"Önce / Sonra Fotoğraflı Bulgular" yüklenmesi**  _[düşük · okur]_
   - Adımlar: Sayfanın en altına inip "Önce / Sonra Fotoğraflı Bulgular" kartını izleyin.
   - Beklenen: Önce kısa süre "Yükleniyor..." yazısı görünür. Ayrı bir GET /five_s_findings isteği gider (sayfa 1, limit 30, created_at desc, status='closed' filtresi). Sonra en fazla 12 kutu ızgarası çıkar; her kutuda sol üstte lokasyon adı, sağ üstte "#<bulgu no>", altında "Önce" (kırmızı etiket) ve "Sonra" (yeşil etiket) başlıklı iki görsel, en altta bulgu tipi. Dikkat: bu kart sayfanın tarih filtresine BAĞLI DEĞİLDİR — "Başlangıç"/"Bitiş" değiştirilse de yeniden çekilmez, çünkü isteği yalnızca ilk render'da atılıyor.
   - Roller: Oturum açmış her kullanıcı; ancak liste five_s_findings okuma iznine bağlıdır — izinsiz rolde istek hata döner, loading kapanır ve kart boş metne düşer (hata mesajı gösterilmez).

31. **Fotoğrafı eksik bulguların listeden düşmesi**  _[düşük · okur]_
   - Adımlar: Sadece "önce" fotoğrafı olan kapatılmış bir bulgu ile hem "önce" hem "sonra" fotoğrafı olan bir bulgu hazırlayın, ekranı yenileyin.
   - Beklenen: Yalnızca İKİ fotoğrafı da olan bulgu kutusu görünür; tek fotoğraflı olan hiç çizilmez. Ayrıca status='closed' olmayan (açık/devam eden) bulgular fotoğrafları tam olsa bile listeye girmez.
   - Roller: Oturum açmış her kullanıcı (five_s_findings okuma izniyle).

32. **Fotoğraf adresinin çözülmesi (eski URL dahil)**  _[düşük · okur]_
   - Adımlar: Bir "Önce" görselinin üstünde sağ tık > görsel adresini kopyala (veya DevTools'ta img src'sini okuyun). Hem yeni yüklenmiş (file_id'li) hem eski sistemden gelen (url'li) bir bulguda deneyin.
   - Beklenen: Adres her iki durumda da /cdn/<uuid> biçimindedir: file_id varsa doğrudan, yoksa eski URL içindeki UUID ayıklanıp /cdn/'e çevrilir; hiç UUID yoksa URL olduğu gibi kullanılır. Görsel gerçekten çizilir (JSON gelmez). Adres çözülemezse resmin yerine boş gri kutu görünür, kırık görsel ikonu değil.
   - Roller: Oturum açmış her kullanıcı.

33. **"Önce / Sonra" boş durumu**  _[düşük · okur]_
   - Adımlar: Öncesi/sonrası fotoğrafı olan kapatılmış bulgu bulunmayan bir kurulumda kartı görüntüleyin.
   - Beklenen: Kart gövdesinde tek satır gri metin: "Öncesi/sonrası fotoğraflı kapatılmış bulgu bulunamadı." Kart başlığı ve alt açıklaması yine görünür.
   - Roller: Oturum açmış her kullanıcı.

34. **Erişim: oturumsuz kullanıcı**  _[YÜKSEK · okur]_
   - Adımlar: Çıkış yapın (veya gizli sekmede) doğrudan /raporlar adresine gidin.
   - Beklenen: Ekran hiç boyanmaz: önce "Loading..." yükleyicisi, ardından /login?returnUrl=%2Fraporlar adresine yönlendirme. Giriş yapıldıktan sonra tekrar Raporlar ekranına dönülür. Hiçbir /reports/dashboard isteği atılmamalıdır.
   - Roller: Oturumsuz — erişim yok.

35. **Erişim: her rol Raporlar'ı görebilir**  _[YÜKSEK · okur]_
   - Adımlar: Sırasıyla godmin, super admin, manager, field manager ve SADECE "Denetçi"/auditor rolü olan bir hesapla giriş yapın; üst menüde "Raporlar" başlığını arayın ve tıklayın.
   - Beklenen: Beş hesabın hepsinde "Raporlar" menü başlığı görünür ve ekran tam içerikle açılır — /raporlar için routeAccess'te hiçbir kural tanımlı değil ve header'ın gizleme filtreleri yalnızca kullanıcılar/ana-veri/iyileştirici ve bulgular menülerine bakıyor. Özellikle sadece Denetçi rolündeki hesap "Bulgular" menüsünü göremezken Raporlar'da aynı bulguları "Termin Tarihi Geçmiş Aksiyonlar" ve "Önce / Sonra Fotoğraflı Bulgular" kartlarında görebilir — bu kasıtlı mı diye doğrulanmalı.
   - Roller: godmin, super admin, manager, field manager, content manager + core team, auditor/denetçi — hepsi. Kısıtlama yok.

36. **Ana sayfadan Raporlar'a geçiş**  _[düşük · okur]_
   - Adımlar: Ana sayfayı (/) açın ve rapor özet bölümündeki "Tüm raporlar →" bağlantısına tıklayın.
   - Beklenen: /raporlar adresine geçilir ve tam sürüm açılır: ana sayfada gizli olan "Fabrika Krokisi — Bulgu Isı Haritası" ve "Önce / Sonra Fotoğraflı Bulgular" kartları burada görünür (ana sayfa compact modda render ediyor, bu ekran etmiyor).
   - Roller: Oturum açmış her kullanıcı.


## Bulgular (5S Bulguları) — /bulgular  (37 senaryo)

1. **Sayfayı açma ve ilk listeyi görme**  _[düşük · okur]_
   - Adımlar: Giriş yaptıktan sonra üst menüden "Bulgular"a tıkla (ya da doğrudan /bulgular adresine git). Hiçbir filtreye dokunma.
   - Beklenen: Başlıkta "5S Bulguları" ve "Denetimlerde tespit edilen bulguların listesini burada görüntüleyebilirsiniz." görünür. Tablo dolarken önce 6 satırlık gri iskelet çizgi (Skeleton) çıkar, sonra en fazla 25 satır gelir. Sağ üstte "Toplam Bulgu: N" ve "25 kayıt yüklendi", liste üstünde "N bulgu · 25 tanesi yüklendi" yazar. Ağdaki istek: GET /fiveSFindings?page=1&limit=25&sort=[{"field":"finding_no","direction":"desc"}] — five_s_findings tablosundan okur.
   - Roller: Giriş yapmış herkes. TEK istisna: rolleri arasında "auditor"/"denetçi" olup {super admin, godmin, manager, field manager, content manager … core team} rollerinden hiçbiri olmayan hesap — o hesap sayfayı hiç görmez.

2. **Sadece-denetçi hesabın sayfadan atılması**  _[YÜKSEK · okur]_
   - Adımlar: Rolü yalnızca "auditor" (veya "denetçi") olan bir hesapla giriş yap. Üst menüde "Bulgular" girişinin olmadığını gör, sonra adres çubuğuna elle /bulgular yaz ve Enter'a bas.
   - Beklenen: Sayfanın hiçbir karesi çizilmez (null render) ve tarayıcı ana sayfaya (/) yönlenir. Üst menüde "Bulgular" bağlantısı da hiç basılmaz.
   - Roller: Kapıyı kuran kural: app/_utils/routeAccess/index.ts:97-111. auditor + {super admin | godmin | manager | field manager | content manager…core team} birleşimi geçer; tek başına auditor geçmez. isGod bayrağı her şeyi aşar.

3. **Lokasyon filtresi**  _[düşük · okur]_
   - Adımlar: Filtreler bölümündeki "Lokasyon" açılır listesini aç ve "Tümü" yerine bir lokasyon adı seç (seçenekler five_s_locations tablosundan sayfa açılışında çekilir).
   - Beklenen: ~300 ms sonra liste kendiliğinden 1. sayfadan yeniden okunur; istek GET /fiveSFindings?...&search=<lokasyon adı> olur ve üstteki "N bulgu · M tanesi yüklendi" sayacı değişir. DİKKAT: bu alan sunucuya `search` olarak gider (kelime-başı serbest metin araması), `location_name` eşitliği olarak değil — açıklaması/tipi o kelimeyle başlayan bulgular da listede kalır.
   - Roller: Sayfayı açabilen herkes

4. **Lokasyon seçeneklerinin yüklenmesi**  _[düşük · okur]_
   - Adımlar: Sayfaya ilk girişte "Lokasyon" açılır listesini aç ve içindeki seçenekleri say.
   - Beklenen: "Tümü" dışındaki seçenekler five_s_locations tablosundaki ada göre A→Z sıralı, adı boş olmayan kayıtlardır (istek: GET /fiveSLocations?page=1&limit=500&orderBy=name&orderDirection=asc). İstek başarısız olursa liste sessizce sadece "Tümü" ile kalır — hata mesajı çıkmaz.
   - Roller: Sayfayı açabilen herkes

5. **Durum filtresi**  _[düşük · okur]_
   - Adımlar: "Durum" açılır listesinden sırasıyla "Açık", "Devam ediyor", "Kapandı" seç.
   - Beklenen: Her seçimde liste kendiliğinden 1. sayfadan yeniden okunur; istek filters=[{field:'status',operator:'eq',value:'open'|'in_progress'|'closed'}] taşır. Tablodaki Durum sütununda yalnız o rozet rengi/etiketi kalır (Açık=kırmızı, Devam ediyor=sarı, Kapandı=yeşil) ve sayaçlar düşer.
   - Roller: Sayfayı açabilen herkes

6. **Tespit tarihi aralığı ile filtreleme**  _[düşük · okur]_
   - Adımlar: "Tespit Tarihi (Başlangıç)" alanına tıkla (tıklayınca tarih seçici kendiliğinden açılır) ve bir tarih seç. Sonra "Tespit Tarihi (Bitiş)" alanına aynısını yap.
   - Beklenen: Her iki seçimde de liste yeniden okunur; istek filters=[{field:'detected_date',operator:'gte',value:'YYYY-MM-DD'},{field:'detected_date',operator:'lte',...}] taşır. Tablodaki "Tespit Tarihi" sütununda aralık dışı gün kalmaz. Alanı boşaltmak o koşulu tamamen kaldırır (boş metin filtreye dönüşmez).
   - Roller: Sayfayı açabilen herkes

7. **"Filtreleri Uygula" düğmesi**  _[düşük · okur]_
   - Adımlar: Herhangi bir filtreyi ayarla, sonra mavi "Filtreleri Uygula" düğmesine bas.
   - Beklenen: 1. sayfa yeniden okunur (serverList.reload) ve o ana kadar sonsuz kaydırmayla eklenmiş sayfalar atılır: "M tanesi yüklendi" sayacı 25'e (PAGE_SIZE) döner. Not: filtre değişimi zaten kendiliğinden yeniden okuduğu için bu düğme ikinci bir istek üretir.
   - Roller: Sayfayı açabilen herkes

8. **"Yenile" düğmesi ve yükleniyor durumu**  _[düşük · okur]_
   - Adımlar: Filtrelerin sağındaki çerçeveli "Yenile" düğmesine bas.
   - Beklenen: Düğmenin yazısı istek uçarken "Yükleniyor..." olur ve düğme tıklanamaz hale gelir (disabled, soluk), liste üstündeki satır da "Yükleniyor..." yazar; cevap gelince liste 1. sayfadan tazelenir ve yazı "Yenile"ye döner.
   - Roller: Sayfayı açabilen herkes

9. **"Temizle" düğmesi**  _[düşük · okur]_
   - Adımlar: Dört filtreyi de doldur (Lokasyon, Durum, iki tarih), sonra "Temizle" düğmesine bas.
   - Beklenen: Lokasyon ve Durum "Tümü"ye, iki tarih alanı boşa döner ve liste filtresiz olarak 1. sayfadan yeniden okunur; "N bulgu" sayacı filtresiz toplama çıkar.
   - Roller: Sayfayı açabilen herkes

10. **Açık Bulgu Raporu (Excel) indirme**  _[düşük · okur]_
   - Adımlar: Sağ üstteki yeşil "Açık Bulgu Raporu (Excel)" düğmesine bas.
   - Beklenen: Düğme yazısı "Hazırlanıyor..." olur ve dönen spinner çıkar, düğme tıklanamaz olur; sonra tarayıcı `5s-acik-bulgu-raporu-<YYYY-MM-DD>.xlsx` adlı bir dosya indirir (lokasyon seçiliyse ad `5s-acik-bulgu-raporu-<lokasyon>-<tarih>.xlsx`). İstek GET /reports/open-findings.xlsx. Dosyada "Açık Bulgular" adlı tek sayfa ve şu başlıklar var: Bulgu No, Tespit Tarihi, Lokasyon, Bulgu Tipi, 5S Adımı, Açıklama, Yapılacak Aksiyon, Termin, Sorumlu, Denetçi, Durum. Yalnızca status='open' ve is_active=true satırlar, finding_no ARTAN sırada.
   - Roller: Sayfayı açabilen herkes. Backend'de /reports için ayrı bir claim/rol kapısı YOK — yalnızca oturum aranıyor (be-nucleus/src/index.ts:36).

11. **Excel raporunun filtreleri devralması**  _[düşük · okur]_
   - Adımlar: Önce "Lokasyon" listesinden bir lokasyon ve iki tarih alanını doldur, sonra "Açık Bulgu Raporu (Excel)" düğmesine bas.
   - Beklenen: İstek /reports/open-findings.xlsx?location_name=<lokasyon>&date_from=<tarih>&date_to=<tarih> olur. İnen dosyadaki Lokasyon sütununda YALNIZ o lokasyon vardır — backend burada lower(trim(location_name)) TAM EŞİTLİK arar, oysa ekrandaki liste aynı değeri serbest metin araması olarak kullanır: aynı ayarla ekrandaki satır sayısı ile Excel'deki satır sayısı kasten farklı olabilir. Durum filtresi Excel'e HİÇ geçmez, dosya her zaman sadece açık bulguları taşır.
   - Roller: Sayfayı açabilen herkes

12. **Excel indirmesinin başarısız olması**  _[düşük · okur]_
   - Adımlar: Ağı kes (ya da backend'i durdur) ve "Açık Bulgu Raporu (Excel)" düğmesine bas.
   - Beklenen: Liste üstünde kırmızı çerçeveli kutuda "Excel raporu indirilemedi." yazısı belirir; düğme "Hazırlanıyor..." halinden "Açık Bulgu Raporu (Excel)"ye geri döner (finally). Dosya inmez.
   - Roller: Sayfayı açabilen herkes

13. **Liste okunamayınca çıkan hata kutusu**  _[düşük · okur]_
   - Adımlar: Backend'i durdur (veya oturumu düşür) ve "Yenile" düğmesine bas.
   - Beklenen: Tablonun üstünde kırmızı kutuda "Bulgular yüklenirken bir hata oluştu." yazar. İstek düzelip liste tekrar geldiğinde bu kutu kendiliğinden kaybolur.
   - Roller: Sayfayı açabilen herkes

14. **Boş sonuç ekranı**  _[düşük · okur]_
   - Adımlar: Filtreleri hiçbir kaydın karşılamayacağı şekilde ayarla — örneğin "Tespit Tarihi (Başlangıç)" olarak gelecek bir tarih seç.
   - Beklenen: Tablo gövdesinde tüm sütunlara yayılan tek hücrede pano ikonu (ClipboardCheck), kalın "Gösterilecek bulgu yok" başlığı ve altında "Seçili filtrelere uyan bir bulgu bulunmuyor. Filtreleri genişletmeyi deneyin ya da denetim yapıldıkça bulgular burada toplanır." açıklaması çıkar. Bu blok yalnız istek bittikten sonra görünür; istek uçarken yerinde iskelet satırlar durur.
   - Roller: Sayfayı açabilen herkes

15. **Sonsuz kaydırma ile sonraki sayfa**  _[düşük · okur]_
   - Adımlar: 25'ten fazla bulgu olacak şekilde filtreleri geniş bırak ve sayfanın en altına kaydır.
   - Beklenen: Tablonun altındaki gözcü görünür olunca "Yükleniyor…" yazısı çıkar ve 25 satır daha eklenir; "M tanesi yüklendi" sayacı 25→50→75 diye artar. Aynı bulgu iki kez basılmaz (id'ye göre tekilleştirilir). Sunucu "başka sayfa yok" dediğinde alt satır "<M> bulgunun tamamı gösteriliyor" yazısına döner.
   - Roller: Sayfayı açabilen herkes

16. **Sabit sıralama (kullanıcı sıralama denetimi yok)**  _[düşük · okur]_
   - Adımlar: Tablo başlıklarına (No, Tespit Tarihi, Lokasyon, Tip, Durum, Faaliyet, Termin, Sorumlu, Denetçi) tek tek tıklamayı dene.
   - Beklenen: Hiçbir başlık tıklanabilir değildir — bu ekranda sıralama denetimi YOKTUR. "No" sütunu her zaman finding_no'ya göre BÜYÜKTEN KÜÇÜĞE gelir (sunucuya sabit sort=[{field:'finding_no',direction:'desc'}] gider), yani en yeni bulgu en üsttedir.
   - Roller: Sayfayı açabilen herkes

17. **Tabloyu yana kaydırma ipucu**  _[düşük · okur]_
   - Adımlar: Tarayıcı penceresini tablonun sığmayacağı kadar daralt (ya da dar ekranda aç) ve tabloyu yatay kaydır.
   - Beklenen: Tablonun sağ üstünde "Tabloyu yana kaydırın →" ipucu belirir ve içeriğin devam ettiği kenarda soluklaşan bir gölge çıkar; tablo tamamen sığdığında ipucu ve gölge kaybolur.
   - Roller: Sayfayı açabilen herkes

18. **Mükerrer açık bulguların tek satırda toplanması**  _[düşük · okur]_
   - Adımlar: Aynı soruya (question_id) ve aynı lokasyona ait, durumu "Açık" olan birden fazla bulgu bulunan bir listeyi aç ve "Tip" sütununa bak.
   - Beklenen: Bu bulgular tek satırda gösterilir; "Tip" değerinin yanında sarı rozette "+N tekrar" yazar ve üstüne gelince "Aynı soru ve lokasyon için tekrar eden açık bulgular tekilleştirildi" ipucu çıkar. Bu tamamen tarayıcıda yapılır: sunucudan gelen satır sayısı değişmez, dolayısıyla üstteki "N bulgu · M tanesi yüklendi" sayacı tablodaki satır sayısından FAZLA olur. Kapanmış/devam eden bulgular ve question_id'si olmayanlar hiç birleştirilmez.
   - Roller: Sayfayı açabilen herkes

19. **Bulgu durumunu "Devam ediyor" yapma**  _[orta · yazar]_
   - Adımlar: Bir satırın "Durum" sütunundaki açılır listeyi aç ve "Devam ediyor"u seç.
   - Beklenen: Rozet anında sarıya döner, altında "Kaydediliyor..." yazısı belirir ve kaybolur. İstek PUT /fiveSFindings/<id> gövdesi {status:'in_progress'}; five_s_findings.status sütunu 'in_progress' olur ve audit_logs tablosuna UPDATE kaydı düşer. "Yenile"ye bastığında değer korunur. Hata dönerse liste 1. sayfadan yeniden okunur ve rozet eski değerine geri düşer.
   - Roller: Sayfayı açabilen HERKES — bu geçiş için ekranda rol kontrolü yok (yalnızca backend claim'i geçerli).

20. **Bulguyu kapatma (yetkili + sonrası fotoğraf var)**  _[orta · yazar]_
   - Adımlar: "Saha Sorumlusu" (field manager) / manager / super admin / godmin hesabıyla gir. "Foto (Sonra)" sütununda en az bir fotoğrafı olan bir satır bul, "Durum" listesini aç ve "Kapandı"yı seç.
   - Beklenen: "Kapandı" seçeneği tıklanabilirdir; seçilince rozet yeşile döner, altında "Kaydediliyor..." görünüp kaybolur. İstek PUT /fiveSFindings/<id> {status:'closed'}; five_s_findings.status='closed' olur ve audit_logs'a UPDATE satırı düşer. Kapandıktan sonra Durum hücresinin altındaki uyarı yazıları kaybolur.
   - Roller: canCloseFinding = hasPrivilege(rol, ["field manager","super admin","manager"]) → bu üçü + godmin (hasPrivilege godmin'i her zaman geçirir). Diğer roller için "Kapandı" seçeneği disabled.

21. **Kapatma yetkisi olmayan hesapta "Kapandı"nın kilitli olması**  _[YÜKSEK · okur]_
   - Adımlar: canCloseFinding listesinde OLMAYAN bir rolle (örn. "content manager core team") gir. Durumu "Açık" olan bir satırın "Durum" listesini aç ve "Kapandı"yı seçmeyi dene; ayrıca farenle listenin üstünde bekle.
   - Beklenen: "Kapandı" seçeneği soluk ve seçilemez (disabled); listenin altında gri küçük yazı "Yalnızca Saha Sorumlusu kapatabilir." görünür ve listenin title ipucu "Bulgu kapatma işlemi yalnızca Saha Sorumlusu tarafından yapılabilir." der. Hiçbir istek gitmez, five_s_findings.status değişmez. (Aynı metin hata kutusunda da yazılıdır ama seçenek kilitli olduğu için UI'dan tetiklenemez.)
   - Roller: canCloseFinding false olan her rol; content manager core team dahil (silebilir ama kapatamaz)

22. **Sonrası fotoğrafı olmayan bulgunun kapatılamaması**  _[YÜKSEK · okur]_
   - Adımlar: Kapatma yetkisi olan bir rolle gir. "Foto (Sonra)" sütununda hiç fotoğrafı olmayan (yalnızca "Ekle" düğmesi görünen) bir satırın "Durum" listesini aç.
   - Beklenen: "Kapandı" seçeneği soluk ve seçilemez; listenin altında kırmızı yazı: Kapatmak için "Sonrası Fotoğraf" zorunlu. Fare listenin üstündeyken ipucu: Kapatmak için "Sonrası Fotoğraf" yükleyin. Hiçbir yazma isteği gitmez. Aynı satıra bir sonrası fotoğraf yükledikten sonra bu yazı kaybolur ve "Kapandı" seçilebilir hale gelir.
   - Roller: canCloseFinding olan roller (field manager, manager, super admin, godmin)

23. **Durumu "Kapandı" olup fotoğrafı olmayan satırın uyarısı**  _[düşük · okur]_
   - Adımlar: Durum filtresini "Kapandı" yap ve "Foto (Sonra)" sütunu boş olan bir satır ara.
   - Beklenen: O satırın "Foto (Sonra)" hücresinde kırmızı çerçeveli "Sonrası foto zorunlu" rozeti görünür. Bu yalnızca bir uyarıdır, hiçbir şeyi engellemez.
   - Roller: Sayfayı açabilen herkes

24. **Denetçi rolüyle durum sütununun kilitlenmesi**  _[YÜKSEK · okur]_
   - Adımlar: Rolleri arasında "auditor" bulunan ama OVERRIDE listesindekilerden (super admin / manager / content manager core team / field manager / godmin) TAM eşleşmeyen bir hesapla gir — örneğin rol adı "Content Manager - Core Team" gibi yazılmışsa (sayfa kapısı bunu içerik eşleşmesiyle geçirir, sayfa içi kontrol tam eşitlik arar). "Durum" listesine tıkla.
   - Beklenen: Durum açılır listesi tamamen tıklanamazdır, %50 saydam ve imleç "yasak" olur; title ipucu "Denetçi rolüyle bulgu durumu güncellenemez." der. Alttaki hiçbir uyarı yazısı ("Kapatmak için…", "Yalnızca Saha Sorumlusu…") basılmaz. Hiçbir PUT gitmez.
   - Roller: isAuditor = auditor rolü VAR ve ["super admin","manager","content manager core team","field manager"] listesinden hiçbiri (ve godmin de) YOK. Sayfa kapısı ile bu liste arasındaki yazım farkı bu dalın tek gerçek giriş yoludur.

25. **Termin (due_date) tarihini satır içinde değiştirme**  _[orta · yazar]_
   - Adımlar: Bir satırın "Termin" sütunundaki tarih kutusuna tıkla (tıklayınca seçici açılır) ve bir tarih seç.
   - Beklenen: Kutuda yeni tarih anında görünür, altında "Kaydediliyor..." belirip kaybolur. İstek PUT /fiveSFindings/<id> {due_date:'YYYY-MM-DD'}; five_s_findings.due_date güncellenir ve audit_logs'a UPDATE satırı düşer. "Yenile"den sonra da yeni tarih durur. Hata dönerse liste 1. sayfadan yeniden okunur ve eski tarih geri gelir.
   - Roller: Sayfayı açabilen HERKES — bu alanda hiçbir rol/yetki kontrolü yok, denetçi kilidi bile uygulanmıyor.

26. **Termin tarihini boşaltma**  _[orta · yazar]_
   - Adımlar: Dolu bir "Termin" kutusunu seç ve içeriğini sil (tarih girdisini boşalt).
   - Beklenen: Kutu boşalır ve PUT /fiveSFindings/<id> {due_date:null} gider; five_s_findings.due_date NULL olur. "Yenile"den sonra hücre boş kalır.
   - Roller: Sayfayı açabilen herkes

27. **Tek "önce" fotoğrafını görüntüleme**  _[düşük · okur]_
   - Adımlar: "Foto (Önce)" sütununda mavi "Görüntüle" düğmesi bulunan bir satırda o düğmeye tıkla.
   - Beklenen: Yeni sekmede /cdn/<dosya-id> adresi açılır ve fotoğraf görüntülenir (JSON değil, gerçek görsel). Hiç fotoğrafı olmayan satırlarda bu hücre tamamen boştur — düğme de uyarı da basılmaz.
   - Roller: Sayfayı açabilen herkes

28. **Birden fazla "önce" fotoğrafını açıp kapama**  _[düşük · okur]_
   - Adımlar: "Foto (Önce)" sütununda "3 Foto ⌄" gibi yazan düğmeye tıkla, sonra aynı düğmeye tekrar tıkla.
   - Beklenen: İlk tıklamada ok yukarı döner ve altında "Foto 1", "Foto 2", "Foto 3" bağlantılarını taşıyan bir kutu açılır; her bağlantı yeni sekmede /cdn/<id> açar. İkinci tıklamada kutu kapanır. Aynı anda yalnız BİR kutu açık kalır: başka bir satırın foto düğmesine basınca önceki kendiliğinden kapanır. "Önce" fotoğraflarında silme (X) düğmesi YOKTUR.
   - Roller: Sayfayı açabilen herkes

29. **"Sonra" fotoğraflarını görüntüleme ve listeyi açma**  _[düşük · okur]_
   - Adımlar: "Foto (Sonra)" sütununda yeşil "Görüntüle" (tek foto) ya da "2 Foto ⌄" (çoklu) düğmesine tıkla.
   - Beklenen: Tek fotoğrafta yeni sekmede /cdn/<id> açılır. Çokluda "Foto 1…N" bağlantılarını ve her birinin yanında bir X düğmesini taşıyan kutu açılır; ikinci tıklamada kapanır. Önce/Sonra kutuları aynı anda ikisi birden açık kalamaz.
   - Roller: Sayfayı açabilen herkes

30. **Sonrası fotoğraflardan tek birini silme**  _[YÜKSEK · yazar]_
   - Adımlar: "Foto (Sonra)" sütununda "2 Foto" düğmesine bas, açılan listede "Foto 1" satırının sağındaki X düğmesine tıkla.
   - Beklenen: Onay sorulmadan o fotoğraf listeden anında düşer ve düğme "1 Foto"ya iner (tek kalırsa "Görüntüle"ye döner). İstek PUT /fiveSFindings/<id> ile photo_after_files dizisi bir eleman eksik gider; photo_after_file_id/photo_after_url dizinin SON elemanına göre yeniden yazılır. five_s_findings.photo_after_files jsonb sütunu kısalır, audit_logs'a UPDATE satırı düşer. Dizinin tamamı silinirse o satır artık kapatılamaz hale gelir.
   - Roller: Sayfayı açabilen HERKES — onay diyaloğu yok, rol kontrolü yok.

31. **Sonrası fotoğraf seçme (kuyruğa alma)**  _[düşük · okur]_
   - Adımlar: Bir satırın "Foto (Sonra)" sütunundaki kamera ikonlu "Ekle" etiketine tıkla ve dosya seçicide 2 görsel seç (çoklu seçim ve yalnız image/* kabul edilir).
   - Beklenen: Altında yeşil rozette "2 seçildi" ve yanında "Yükle" düğmesi belirir. Henüz hiçbir istek gitmez, veritabanı değişmez. "Ekle"ye tekrar basıp AYNI dosyaları seçersen sayı artmaz (ad+boyut+değiştirilme tarihi ile tekilleştirilir); farklı dosya seçersen kuyruğa eklenir ("3 seçildi").
   - Roller: Sayfayı açabilen herkes

32. **Sonrası fotoğrafları yükleme**  _[orta · yazar]_
   - Adımlar: "Ekle" ile 1-2 görsel seç, sonra yeşil "Yükle" düğmesine bas.
   - Beklenen: "Ekle" etiketi "Yükleniyor..." (dönen spinner) olur ve dosya girişi kilitlenir. Önce her dosya için POST /files/ (multipart: files + type=image) gider ve dönen id alınır; ardından tek bir PUT /fiveSFindings/<id> ile photo_after_files dizisine eklenir. Bitince "N seçildi" rozeti ve "Yükle" düğmesi kaybolur, üstte "Görüntüle" ya da "N Foto" düğmesi belirir ve varsa hata kutusu temizlenir. five_s_findings.photo_after_files uzar, photo_after_file_id/photo_after_url son yüklenene işaret eder, audit_logs'a UPDATE satırı düşer. Sonrasında o satırın "Kapandı" seçeneği tıklanabilir hale gelir.
   - Roller: Sayfayı açabilen HERKES — yükleme için rol kontrolü yok. Tek tek dosya yüklemesi patlarsa hata yalnız konsola yazılır, ekranda görünmez; kalan dosyalar yüklenmeye devam eder.

33. **Tüm sonrası fotoğrafları silme**  _[YÜKSEK · yazar]_
   - Adımlar: En az bir sonrası fotoğrafı olan bir satırda kırmızı "Tümünü Sil" düğmesine bas (ipucu: "Tüm sonrası fotoğrafları sil"). Açılan pencerede kırmızı "Sil" düğmesine bas.
   - Beklenen: Ekranın ortasında "Sonrası fotoğraflarını sil" başlıklı, "Bu bulgunun tüm 'Sonrası' fotoğrafları silinecek. Bu işlem geri alınamaz." metinli, "Vazgeç" ve kırmızı "Sil" düğmeli pencere açılır. "Sil"e basınca hücredeki bütün foto düğmeleri ve "Tümünü Sil" kaybolur, yalnız "Ekle" kalır. İstek PUT /fiveSFindings/<id> {photo_after_files:[], photo_after_file_id:null, photo_after_url:null}; five_s_findings'te bu üç sütun boşalır ve audit_logs'a UPDATE satırı düşer. Satır "Kapandı" ise hücrede "Sonrası foto zorunlu" uyarısı belirir.
   - Roller: Sayfayı açabilen HERKES — bu yıkıcı işlem için rol kontrolü yok.

34. **Fotoğraf silme onayından vazgeçme**  _[düşük · okur]_
   - Adımlar: "Tümünü Sil" düğmesine bas; açılan pencerede sırasıyla üç yolu dene: (a) "Vazgeç" düğmesi, (b) Esc tuşu, (c) pencerenin dışındaki karartılmış alana tıklama.
   - Beklenen: Üç durumda da pencere kapanır, hiçbir istek gitmez ve fotoğraflar hücrede olduğu gibi kalır; five_s_findings.photo_after_files değişmez. Pencere açıkken arkadaki sayfa kaydırılamaz.
   - Roller: Sayfayı açabilen herkes

35. **Bulguyu kalıcı silme**  _[YÜKSEK · yazar]_
   - Adımlar: Silme yetkisi olan bir rolle gir. Tablonun en sağındaki "Sil" sütununda, silmek istediğin satırın çöp kutusu ikonlu "Sil" düğmesine bas (ipucu: "Bulguyu sil (Merkez Ekip)"). Açılan pencerede kırmızı "Sil"e bas.
   - Beklenen: "Bulguyu sil" başlıklı, "#<no> numaralı bulgu kalıcı olarak silinecek. Bu işlem geri alınamaz." metinli pencere çıkar. Onaydan sonra düğme spinner'a döner ve tıklanamaz olur, ardından satır tablodan kaybolur. İstek DELETE /fiveSFindings/<id>; five_s_findings satırı veritabanından GERÇEKTEN silinir (soft-delete değil) ve audit_logs tablosuna operation='DELETE' ve satırın tam ön-imgesini taşıyan old_values ile bir kayıt düşer. Üstteki "Toplam Bulgu" sayacı yeniden okunana kadar eski değerde kalır.
   - Roller: canDeleteFinding = hasPrivilege(rol, ["super admin","manager","content manager core team"]) + godmin. Diğer rollerde "Sil" sütunu hiç basılmaz.

36. **Silme yetkisi olmayan hesapta "Sil" sütununun yokluğu**  _[YÜKSEK · okur]_
   - Adımlar: canDeleteFinding listesinde olmayan bir rolle (örn. field manager) gir ve tablo başlıklarını sağa doğru oku.
   - Beklenen: Tablo başlıklarında "Sil" sütunu HİÇ YOKTUR — başlık sırası No…Foto (Önce), Foto (Sonra) ile biter (11 sütun; yetkilide 12). Boş sonuç ve iskelet satırları da 11 sütuna göre çizilir. Satırlarda çöp kutusu düğmesi bulunmaz, DELETE isteği tetiklenemez.
   - Roller: super admin / manager / content manager core team / godmin DIŞINDAKİ tüm roller

37. **Bulgu silinemediğinde hata mesajı**  _[orta · okur]_
   - Adımlar: Silme düğmesi görünen ama backend claim'i olmayan bir hesapla (ya da backend'i durdurup) "Sil" → "Sil" akışını tamamla.
   - Beklenen: Satır tablodan KAYBOLMAZ, spinner durur ve liste üstünde kırmızı kutuda "Bulgu silinemedi. Yetkinizi kontrol edin." yazar. five_s_findings satırı yerinde kalır.
   - Roller: canDeleteFinding true olan roller (ekran kapısı ile backend claim'i ayrışırsa görünür)


## Kullanicilar (/users)  (42 senaryo)

1. **Ekranı açma ve listenin ilk yüklenmesi**  _[düşük · okur]_
   - Adımlar: Menüde Sistem > Kullanıcılar'a tıkla (veya /users adresine git). Sayfanın yüklenmesini bekle.
   - Beklenen: Başlıkta 'Kullanıcılar' ve 'Platform hesaplarını, doğrulama ve erişim kontrollerini yönetin.' yazısı görünür. Tablo önce 'Kullanıcılar yükleniyor...' spinner'ını, sonra Kullanıcı / E-posta / Doğrulama / Erişim / Son Giriş / İşlemler başlıklı satırları gösterir. Ağ sekmesinde GET /users?page=1&limit=10&orderBy=created_at&orderDirection=desc çağrısı görülür. İstek düşerse 'Kullanıcı listesi getirilemedi.' toast'ı çıkar.
   - Roller: super admin, godmin (is_god), Merkez Ekip (adı 'content manager' + 'core team' içeren rol). Diğer roller ekranı hiç göremez.

2. **Yetkisiz rolle adresi elle yazma**  _[YÜKSEK · okur]_
   - Adımlar: Denetçi / Saha Sorumlusu / manager gibi bir rolle giriş yap. Üst menüde Sistem açılırında 'Kullanıcılar' maddesinin OLMADIĞINI doğrula. Sonra tarayıcı adres çubuğuna doğrudan /users yaz ve Enter'a bas.
   - Beklenen: Ekran hiç boyanmaz (bir kare bile), tarayıcı ana sayfaya (/) döner. Menüde 'Kullanıcılar' maddesi hiç listelenmez.
   - Roller: Gate'in kendisi: izin verilen super admin / godmin / Merkez Ekip; reddedilen herkes. Menü kopyası: Header/ClientSide/index.tsx:402-410.

3. **Yenile butonu**  _[düşük · okur]_
   - Adımlar: Sağ üstteki 'Yenile' butonuna tıkla.
   - Beklenen: Buton anında 'Yenileniyor…' yazısına döner ve tıklanamaz olur, yeni bir GET /users isteği gider, cevap gelince tekrar 'Yenile' olur.
   - Roller: Ekranı görebilen herkes (super admin, godmin, Merkez Ekip)

4. **Sonsuz kaydırma sonrası Yenile sayfa 1'i tazelemiyor**  _[düşük · okur]_
   - Adımlar: Listeyi aşağı kaydırıp en az 2. sayfayı yükle (satır sayısı 10'dan fazla olsun). Sonra başka bir sekmeden/başka bir kullanıcıyla listedeki bir kaydı değiştir. Şimdi 'Yenile' butonuna tıkla.
   - Beklenen: Giden istek page=1 DEĞİL, o anki page değeriyle (ör. page=2) gider; cevap ilk sayfa olmadığı için mevcut listeye EKLENİR, id'si zaten var olan satırlar elenir. Sonuç: ekrandaki ilk 10 satır tazelenmez, eski değerleriyle kalır.
   - Roller: Ekranı görebilen herkes

5. **Arama kutusuyla filtreleme**  _[düşük · okur]_
   - Adımlar: 'E-posta, ad veya izin ile ara…' kutusuna bir e-posta parçası yaz (ör. 'ahmet').
   - Beklenen: Her tuş vuruşunda sayfa 1'e dönülür ve GET /users?search=ahmet&page=1 isteği gider; tablo yalnızca eşleşen satırları gösterir, hiç eşleşme yoksa 'Kullanıcı bulunamadı' boş durumu çıkar. Debounce YOKTUR — harf başına bir istek beklenir.
   - Roller: Ekranı görebilen herkes

6. **Hızlı yazınca aramanın düşmesi (uçuşan istek kilidi)**  _[düşük · okur]_
   - Adımlar: Arama kutusuna hızlıca ve kesintisiz 6-8 karakter yaz (ör. 'mehmet'), ilk istek dönmeden yazmayı bitir. Kutudaki metinle tablodaki sonuçları karşılaştır.
   - Beklenen: Arama kutusunda 'mehmet' yazarken tablo daha eski bir arama terimine (ör. 'me') ait sonuçları gösterebilir; son tuş vuruşu için yeni istek HİÇ atılmaz — çünkü bir istek uçuştayken effect erken dönüyor ve tekrar denemiyor. 'Yenile'ye basınca doğru sonuç gelir.
   - Roller: Ekranı görebilen herkes

7. **Filtreler panelini aç/kapat**  _[düşük · okur]_
   - Adımlar: Arama kutusunun sağındaki 'Filtreler' butonuna tıkla, sonra tekrar tıkla.
   - Beklenen: İlk tıkta buton yeşil vurgulanır ve altında 'Durum' ile 'Kilit Durumu' açılır kutularını taşıyan panel belirir. İkinci tıkta panel kaybolur, buton gri hâline döner. Hiç ağ isteği gitmez.
   - Roller: Ekranı görebilen herkes

8. **Durum filtresi (Aktif / Pasif)**  _[düşük · okur]_
   - Adımlar: 'Filtreler'i aç. 'Durum' açılır kutusundan 'Aktif'i seç; sonra 'Pasif'i seç; sonra 'Tümü'ne dön.
   - Beklenen: 'Aktif' seçilince istek filters.is_active=true, 'Pasif' seçilince filters.is_active=false ile page=1'den gider; 'Tümü'nde is_active anahtarı hiç gönderilmez. Satır sayısı değişir. DİKKAT: tablodaki 'Erişim' rozeti is_locked'a bakar, is_active'e değil — Pasif filtresinde bile rozet 'Aktif' yazabilir; doğrulamayı Detay çekmecesindeki 'Aktif/Pasif' rozetinden yap.
   - Roller: Ekranı görebilen herkes

9. **Kilit Durumu filtresi (Açık / Kilitli)**  _[düşük · okur]_
   - Adımlar: 'Filtreler'i aç. 'Kilit Durumu' açılır kutusundan 'Kilitli'yi seç; sonra 'Açık'ı seç.
   - Beklenen: 'Kilitli'de istek filters.is_locked=true ile gider ve dönen her satırın 'Erişim' sütununda kırmızı 'Kilitli' rozeti bulunur; 'Açık'ta is_locked=false gider ve tüm satırlarda yeşil 'Aktif' rozeti görünür.
   - Roller: Ekranı görebilen herkes

10. **Sıfırla butonu aramayı temizlemiyor**  _[düşük · okur]_
   - Adımlar: Arama kutusuna bir metin yaz VE 'Filtreler'den Durum='Pasif', Kilit Durumu='Kilitli' seç. Sonra 'Sıfırla'ya tıkla.
   - Beklenen: İki açılır kutu da 'Tümü'ne döner ve yeni istekte is_active/is_locked gönderilmez; ancak arama kutusundaki metin OLDUĞU GİBİ KALIR ve istek hâlâ search=... taşır.
   - Roller: Ekranı görebilen herkes

11. **Sonsuz kaydırma ile sonraki sayfa**  _[düşük · okur]_
   - Adımlar: 10'dan fazla kullanıcı varken sayfayı tablonun altına kadar kaydır (tablonun 400px altında tetiklenir).
   - Beklenen: Yeni bir GET /users?page=2 isteği gider, mevcut satırların ALTINA yeni satırlar eklenir (liste yenilenmez), aynı id iki kez görünmez. Yükleme sırasında listenin altında 'Yükleniyor…' yazısı belirir.
   - Roller: Ekranı görebilen herkes

12. **Listenin sonu etiketi**  _[düşük · okur]_
   - Adımlar: Tüm sayfalar yüklenene kadar kaydırmaya devam et (hasNext false olana kadar).
   - Beklenen: Listenin altında 'N kullanıcının tamamı gösteriliyor' yazısı çıkar; N ekranda görünen satır sayısına eşittir ve artık yeni istek gitmez.
   - Roller: Ekranı görebilen herkes

13. **Boş sonuç durumu**  _[düşük · okur]_
   - Adımlar: Arama kutusuna hiçbir kullanıcıyla eşleşmeyecek bir metin yaz (ör. 'zzzzqq').
   - Beklenen: Tablo yerine ünlem ikonu, 'Kullanıcı bulunamadı' başlığı ve 'Arama kriterlerini veya filtreleri düzenleyip tekrar deneyin.' metni görünür; alttaki sonsuz kaydırma etiketi de kaybolur.
   - Roller: Ekranı görebilen herkes

14. **Tabloyu yana kaydırma ipucu**  _[düşük · okur]_
   - Adımlar: Tarayıcı penceresini dar bir genişliğe (ör. 900px) küçült ve tabloya bak.
   - Beklenen: Tablonun üstünde sağa yaslı 'Tabloyu yana kaydırın →' ipucu belirir ve taşan kenarda gölge/fade görünür; pencere genişletilip tablo sığdığında ipucu kaybolur.
   - Roller: Ekranı görebilen herkes

15. **Kullanıcı ID'sinin tam hâlini görme**  _[düşük · okur]_
   - Adımlar: Bir satırda ad-soyadın altındaki kısaltılmış id metninin üzerine imleci getir ve bekle.
   - Beklenen: Hücrede id '…' ile kesilmiş görünür; tooltip'te 36 karakterlik tam UUID okunur.
   - Roller: Ekranı görebilen herkes

16. **Kullanıcı Ekle modalını açma ve rollerin yüklenmesi**  _[düşük · okur]_
   - Adımlar: Sağ üstteki yeşil 'Kullanıcı Ekle' butonuna tıkla.
   - Beklenen: 'Kullanıcı Oluştur' başlıklı modal açılır; E-posta, Geçici Şifre, Ad, Soyad alanları BOŞ gelir. Roller kutusunda önce 'Roller yükleniyor...' spinner'ı, sonra rol satırları (alias + açıklama, sistem rollerinde 'Sistem' rozeti) listelenir. GET /roles?page=1&limit=100 çağrısı gider. Hata olursa 'Roller getirilemedi.' toast'ı, boş dönerse 'Rol bulunamadı.' yazısı çıkar.
   - Roller: Ekranı görebilen herkes

17. **Yeni kullanıcı oluşturma (mutlu yol)**  _[YÜKSEK · yazar]_
   - Adımlar: 'Kullanıcı Ekle' > E-posta: benzersiz bir adres, Geçici Şifre: en az 8 karakter, Ad ve Soyad'ı doldur, Roller listesinden TEK bir rol işaretle, 'Kullanıcı Oluştur' butonuna bas.
   - Beklenen: Buton 'Oluşturuluyor…' olur, modal kapanır ve liste yenilenir. Sıralama created_at DESC olduğu için yeni satır listenin EN ÜSTÜNDE görünür; Doğrulama sütununda sarı 'Bekliyor', Erişim'de yeşil 'Aktif', Son Giriş'te '—' yazar. Veritabanında users tablosuna 1 satır (is_god=false), profiles tablosuna 1 satır (user_id + first_name + last_name), user_roles tablosuna 1 satır eklenir; audit_logs'a CREATE kaydı düşer.
   - Roller: super admin, godmin, Merkez Ekip. Backend ayrıca rol atamasını denetler: godmin rolü verme girişimi 403 (roleAssignAuthz.ts:72-74).

18. **İzin verilen ikili rolle oluşturma (Denetçi + Saha Sorumlusu)**  _[YÜKSEK · yazar]_
   - Adımlar: 'Kullanıcı Ekle' modalında alanları doldur. Roller listesinden önce 'Denetçi' (Auditor), sonra 'Saha Sorumlusu' (Field Manager) kutucuklarını işaretle. 'Kullanıcı Oluştur'a bas.
   - Beklenen: İkinci işaret kabul edilir (toast çıkmaz), diğer TÜM rol kutucukları soluklaşıp tıklanamaz olur. Gönderimden sonra user_roles tablosunda bu kullanıcı için İKİ satır oluşur. Aynı akış 'Denetçi + Merkez Ekip' için de geçerlidir.
   - Roller: super admin, godmin, Merkez Ekip

19. **Yasak rol kombinasyonu seçme**  _[düşük · okur]_
   - Adımlar: 'Kullanıcı Ekle' modalında önce 'Denetçi' DIŞINDA bir rol işaretle (ör. 'Merkez Ekip' değil, ör. 'Manager'). Sonra ikinci bir rol işaretlemeyi dene.
   - Beklenen: Diğer tüm rol satırları %50 saydamlıkta ve 'cursor-not-allowed' ile tıklanamaz olur; işaretlenemez. Zorlanan bir durumda 'Aynı anda yalnızca "Denetçi + Saha Sorumlusu" (Auditor + Field Manager) birlikte seçilebilir. Diğer roller yalnızca tek seçilebilir.' toast'ı çıkar ve seçim eski hâline döner.
   - Roller: Ekranı görebilen herkes

20. **Rol seçmeden gönderim engeli**  _[düşük · okur]_
   - Adımlar: 'Kullanıcı Ekle' modalını aç, E-posta/Şifre/Ad/Soyad'ı doldur ama hiçbir rol işaretleme. 'Kullanıcı Oluştur' butonuna bakmayı ve tıklamayı dene.
   - Beklenen: Buton soluk ve tıklanamaz (disabled); tıklama hiçbir istek üretmez. Roller kutusunun altında 'Rol seçimi zorunludur. Çoklu seçimde yalnızca Denetçi + Saha Sorumlusu veya Denetçi + Merkez Ekip birlikte seçilebilir.' notu okunur.
   - Roller: Ekranı görebilen herkes

21. **Aynı e-posta ile ikinci kez kayıt**  _[orta · yazar]_
   - Adımlar: 'Kullanıcı Ekle' modalında listede ZATEN var olan bir e-postayı gir, şifre/ad/soyad doldur, bir rol seç ve 'Kullanıcı Oluştur'a bas.
   - Beklenen: 'Aynı mail adresiyle iki kere kayıt yapılamaz.' toast'ı çıkar. Modal AÇIK KALIR, alanlar korunur, liste değişmez ve users tablosuna yeni satır eklenmez (email üzerinde unique index var).
   - Roller: super admin, godmin, Merkez Ekip

22. **Alan doğrulamaları (tarayıcı kuralları)**  _[düşük · okur]_
   - Adımlar: 'Kullanıcı Ekle' modalında E-posta'ya 'abc' (@ yok) yaz, Geçici Şifre'ye 7 karakter yaz, bir rol seç ve 'Kullanıcı Oluştur'a bas. Sonra Ad veya Soyad'ı boş bırakıp tekrar dene.
   - Beklenen: Tarayıcı yerel uyarı balonu çıkarır ve form gönderilmez: e-posta biçim hatası, şifre için 'en az 8 karakter' (alanın altında zaten 'Şifre en az 8 karakter olmalıdır.' notu yazar), boş Ad/Soyad için zorunlu alan uyarısı. Hiçbir ağ isteği gitmez.
   - Roller: Ekranı görebilen herkes

23. **Oluşturma modalını kapatma ve alanların sıfırlanması**  _[düşük · okur]_
   - Adımlar: 'Kullanıcı Ekle' modalında tüm alanları doldur ve bir rol seç. 'Vazgeç'e (veya sağ üstteki × işaretine) bas. Sonra tekrar 'Kullanıcı Ekle'ye bas.
   - Beklenen: Modal kapanır, hiçbir kayıt oluşmaz. Yeniden açıldığında E-posta, Geçici Şifre, Ad, Soyad BOŞ ve hiçbir rol işaretli değildir; rol listesi baştan yüklenir.
   - Roller: Ekranı görebilen herkes

24. **Detay çekmecesini açma**  _[düşük · okur]_
   - Adımlar: Bir satırda İşlemler sütunundaki 'Detay' bağlantısına tıkla.
   - Beklenen: Sağdan kayarak bir çekmece açılır; başlıkta ad-soyad, e-posta ve rozetler (Aktif/Pasif, kilitliyse 'Kilitli', is_god ise 'Yönetici') görünür. 'Hesap Bilgileri' (Kullanıcı ID, E-posta, Ad Soyad, Oluşturulma, Güncelleme, Son Giriş) ve 'Güvenlik ve Erişim' (E-posta Doğrulama, Giriş Sayısı, Hesap Durumu, Kilit Bitiş, Başarısız Deneme, Yönetici Erişimi) kartları dolar; boş tarihler '—' gösterir.
   - Roller: Ekranı görebilen herkes

25. **Çekmecedeki koleksiyon bölümlerinin boş durumları**  _[düşük · okur]_
   - Adımlar: Adres/telefon/dosya kaydı olmayan bir kullanıcı için Detay çekmecesini aç ve 'Adresler', 'Telefon Numaraları', 'Dosyalar' bölümlerine kadar kaydır.
   - Beklenen: Sırasıyla 'Kayıtlı adres yok', 'Kayıtlı telefon yok', 'Kayıtlı dosya yok' yazıları görünür. Kaydı olan bir kullanıcıda ise her biri kart olarak listelenir (adreste şehir/il/ülke ve 'Posta Kodu:', telefonda ülke kodu, 'Tür:' ve 'Dahili:', dosyada 'Tür:' + mime).
   - Roller: Ekranı görebilen herkes

26. **Çekmecede rollerin ve izinlerin listelenmesi**  _[düşük · okur]_
   - Adımlar: Rolü olan bir kullanıcı için Detay çekmecesini aç ve 'Roller' bölümüne kadar kaydır.
   - Beklenen: Önce 'Roller yükleniyor...' spinner'ı görünür; GET /userRoles?filters[user_id]=<id> ve ardından relations=claims ile GET /roles çağrıları gider. Sonra her rol için kart açılır: rol adı, açıklaması, sistem rolüyse 'Sistem' rozeti ve altında 'aksiyon · METHOD /yol' satırlarıyla claim listesi. İzin yoksa 'Bu role atanmış izin yok.', hiç rol yoksa 'Atanmış rol yok' yazar.
   - Roller: Ekranı görebilen herkes

27. **Rolleri okuma izni olmayan kullanıcıda 403 dalı**  _[düşük · okur]_
   - Adımlar: GET /roles veya GET /userRoles claim'i olmayan bir hesapla (ör. claim'i kısıtlanmış Merkez Ekip) ekranı aç ve bir kullanıcının Detay çekmecesindeki 'Roller' bölümüne bak.
   - Beklenen: Rol kartları yerine kırmızı 'Bu kullanıcının rollerini görüntüleme izniniz yok.' metni görünür; spinner takılı kalmaz.
   - Roller: Ekranı görebilen ama roles/userRoles claim'i olmayan roller (Merkez Ekip senaryosu); super admin/godmin'de görünmez

28. **Çekmeceyi kapatma (× ve arka plan)**  _[düşük · okur]_
   - Adımlar: Detay çekmecesini aç, sağ üstteki × düğmesine bas. Tekrar aç, bu kez çekmecenin solundaki karartılmış arka plana tıkla.
   - Beklenen: Her iki yolda da çekmece sağa doğru kayarak kapanır (yaklaşık 300ms), seçili kullanıcı temizlenir ve açıksa 'Rolleri Yönet' modalı da kapanır. Tablo olduğu gibi kalır.
   - Roller: Ekranı görebilen herkes

29. **Rolleri Yönet modalını açma**  _[düşük · okur]_
   - Adımlar: Bir kullanıcının Detay çekmecesini aç, 'Roller' bölümündeki 'Rolleri ve İzinleri Yönet' butonuna tıkla.
   - Beklenen: Üstte 'Rolleri Yönet' başlıklı modal açılır ve 'Bu kullanıcı için rol atayın veya kaldırın. Rol izinleri claim'lerden gelir.' yazar. Yükleme sırasında 'İşleniyor, lütfen bekleyin...' ve 'Roller yükleniyor...' görünür. Sonra her rol için kart çıkar: 'Sistem Rolü'/'Özel Rol' etiketi, rol adı, ve sağda kullanıcıda varsa yeşil 'Atandı', yoksa gri 'Ata' butonu. Buton başlığı 'İzinleri' dese de yalnızca ROL modalı açılır.
   - Roller: Ekranı görebilen herkes

30. **Rolleri Yönet içinde rol arama**  _[düşük · yazar]_
   - Adımlar: 'Rolleri Yönet' modalında 'İsim veya açıklamaya göre rol ara...' kutusuna bir rol adının parçasını yaz; sonra hiçbir role uymayan bir metin yaz.
   - Beklenen: Liste ANINDA daralır — yeni ağ isteği gitmez, filtreleme istemci tarafında rol adı ve açıklaması üzerinde yapılır. Eşleşme yoksa 'Mevcut filtrelerle rol bulunamadı.' kutusu görünür. Yükleme sürerken arama kutusu tıklanamaz.
   - Roller: Ekranı görebilen herkes

31. **Kullanıcıya rol atama**  _[YÜKSEK · yazar]_
   - Adımlar: 'Rolleri Yönet' modalında atanmamış bir rolün sağındaki gri 'Ata' butonuna tıkla.
   - Beklenen: Buton dönen spinner'a döner ve tıklanamaz olur; POST /userRoles (user_id + role_id) gider. Başarıda buton yeşil 'Atandı'ya döner, kartın kenarlığı yeşile boyanır. user_roles tablosuna yeni satır düşer, audit_logs'a CREATE kaydı yazılır. Modalı kapatıp çekmeceye dönünce 'Roller' bölümü yeniden yüklenir ve yeni rol kartı orada belirir.
   - Roller: super admin, godmin, Merkez Ekip. Backend ek olarak: godmin rolünü atamak veya godmin bir kullanıcıya dokunmak yalnızca godmin'e açık (roleAssignAuthz.ts:67-83).

32. **Kullanıcıdan rol kaldırma**  _[YÜKSEK · yazar]_
   - Adımlar: 'Rolleri Yönet' modalında yeşil 'Atandı' yazan bir rolün butonuna tıkla.
   - Beklenen: Buton spinner'a döner; DELETE /userRoles/<ilişki-id> gider. Başarıda buton gri 'Ata'ya döner ve kartın yeşil kenarlığı kaybolur. user_roles tablosundan o satır SİLİNİR (geri alınamaz), audit_logs'a DELETE kaydı yazılır. Çekmecedeki 'Roller' bölümünden de kaybolur.
   - Roller: super admin, godmin, Merkez Ekip; godmin kullanıcının rolünü sökmek yalnızca godmin'e açık

33. **Rol yazma reddedildiğinde sessiz başarısızlık**  _[YÜKSEK · yazar]_
   - Adımlar: godmin OLMAYAN bir super admin ile giriş yap. Bir kullanıcının 'Rolleri Yönet' modalını aç ve 'godmin' rolünde 'Ata'ya tıkla. Tarayıcı konsolunu ve Ağ sekmesini açık tut.
   - Beklenen: POST /userRoles 403 döner. Ekranda HİÇBİR toast/uyarı çıkmaz — buton spinner'dan sessizce eski hâline ('Ata') döner ve kullanıcı işlemin başarısız olduğunu yalnızca konsoldaki 'Add user role failed:' satırından anlar. user_roles tablosuna satır eklenmez.
   - Roller: godmin olmayan super admin ve Merkez Ekip; godmin'de 403 çıkmaz

34. **Rolleri Yönet modalını kapatma ve çekmecenin tazelenmesi**  _[düşük · okur]_
   - Adımlar: 'Rolleri Yönet' modalında bir rol ata, sonra sağ üstteki × düğmesine bas.
   - Beklenen: Modal kapanır, arkadaki Detay çekmecesi görünür kalır ve 'Roller' bölümü YENİDEN yüklenir (spinner + yeni GET /userRoles ve GET /roles?relations=claims); yeni atanan rol kartı, kendi claim listesiyle birlikte orada belirir. Yükleme sürerken × düğmesi tıklanamaz.
   - Roller: Ekranı görebilen herkes

35. **Silme onay modalını açma ve iptal**  _[düşük · okur]_
   - Adımlar: Kendinden BAŞKA bir kullanıcının satırında 'Sil'e tıkla. Açılan modalda 'İptal'e bas.
   - Beklenen: 'Kullanıcıyı Sil' başlıklı, 'Bu kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.' uyarılı modal açılır; kırmızı kutuda 'Silinecek kullanıcı: <e-posta>' yazar. 'İptal' modalı kapatır, seçimi temizler, hiçbir istek gitmez ve satır tabloda kalır.
   - Roller: Ekranı görebilen herkes

36. **Kullanıcıyı silme (kalıcı)**  _[YÜKSEK · yazar]_
   - Adımlar: Başka bir kullanıcının satırında 'Sil' > açılan modalda kırmızı 'Kullanıcıyı Sil' butonuna bas.
   - Beklenen: Buton 'Siliniyor…' olur; DELETE /users/<id> gider. Modal kapanır, satır tablodan ANINDA kaybolur ve alttaki 'N kullanıcının tamamı gösteriliyor' sayısı 1 azalır, ardından liste yeniden çekilir. users tablosundan satır KALICI olarak silinir (soft delete yok), audit_logs'a DELETE kaydı (old_values ile) yazılır ve bağlı hesap kapatılır. Zaten silinmiş bir kaydı silmek 404, aktif bir onay zincirindeki kaydı silmek 409 döner ve 'Kullanıcı silinemedi.' benzeri hata toast'ı çıkar.
   - Roller: super admin, godmin, Merkez Ekip (backend DELETE /users claim'i olan herkes)

37. **Kendi hesabını silme engeli**  _[YÜKSEK · okur]_
   - Adımlar: Giriş yaptığın hesabın kendi satırını listede bul (e-postasından) ve o satırdaki 'Sil'e tıkla.
   - Beklenen: Onay modalı HİÇ AÇILMAZ; ekranda 'Kendi hesabını silemezsin.' toast'ı çıkar, hiçbir istek gitmez, satır yerinde kalır. (Aynı koruma modal onayında da var: 'Kendi hesabını silemezsin. Başka bir admin ile silmeyi dene.' — bu ikinci dal ancak oturum bilgisi henüz yüklenmemişse devreye girer, o yüzden yavaş ağda sayfa açılır açılmaz Sil'e basmayı da dene.)
   - Roller: Ekranı görebilen herkes

38. **Oturum düşmüşken silme (tek seferlik yeniden deneme)**  _[orta · yazar]_
   - Adımlar: Ekran açıkken oturum çerezini geçersiz kıl / token'ın süresi dolsun. Sonra bir kullanıcı için 'Sil' > 'Kullanıcıyı Sil' akışını çalıştır ve Ağ sekmesini izle.
   - Beklenen: İlk DELETE /users/<id> 401 veya 403 döner; istemci aynı isteği BİR KEZ daha atar. İkinci deneme de düşerse modal kapanır, seçim temizlenir ve backend mesajını (yoksa 'Kullanıcı silinemedi.') taşıyan hata toast'ı çıkar; sayfa kilitlenmez, 'Siliniyor…' takılı kalmaz.
   - Roller: Ekranı görebilen herkes

39. **E-postasını Doğrula butonu hiçbir şey yapmıyor**  _[düşük · okur]_
   - Adımlar: Doğrulama sütununda sarı 'Bekliyor' rozeti olan bir satır bul. İşlemler sütunundaki yeşil 'E-postasını Doğrula' bağlantısına tıkla. Ağ sekmesini ve ekranı izle.
   - Beklenen: HİÇBİR ŞEY olmaz: modal açılmaz, toast çıkmaz, istek gitmez, rozet 'Bekliyor' olarak kalır. Doğrulama modalı sayfada yorum satırına alınmış durumda, yani buton ölü bir uçtur.
   - Roller: Ekranı görebilen herkes

40. **İzinleri Yönet modalının hiç açılamaması**  _[düşük · okur]_
   - Adımlar: Bir kullanıcının Detay çekmecesini aç ve 'Rolleri ve İzinleri Yönet' butonuna tıkla. Açılan pencerenin başlığını ve içeriğini oku; 'İzinleri Yönet' başlıklı, 'Aksiyon veya yola göre izin ara...' kutulu bir ekran ara.
   - Beklenen: Yalnızca 'Rolleri Yönet' modalı açılır. Ekranın hiçbir yerinde 'İzinleri Yönet' başlığı, izin arama kutusu ya da 'Atandı / Atanmadı / Bekliyor' rozetli alt bilgi görünmez — bu bileşen kaynak ağacında var ama hiçbir yerden çağrılmıyor, izinler yalnızca çekmecede SALT OKUNUR listeleniyor.
   - Roller: Ekranı görebilen herkes

41. **Sıralama sabit, kontrolü yok**  _[düşük · okur]_
   - Adımlar: Tablo başlıklarına (Kullanıcı, E-posta, Doğrulama, Erişim, Son Giriş) tek tek tıkla. Sonra yeni bir kullanıcı oluşturup listeye dön.
   - Beklenen: Başlıklara tıklamak hiçbir şey yapmaz — tıklanabilir sıralama kontrolü YOKTUR ve hiçbir istek gitmez. Sıralama her zaman orderBy=created_at, orderDirection=desc olarak gider; kanıtı, yeni oluşturulan kullanıcının listenin en üstünde çıkmasıdır.
   - Roller: Ekranı görebilen herkes

42. **Profil oluşturma düşerse kullanıcı adsız kalır**  _[orta · yazar]_
   - Adımlar: ADD_PROFILE isteğini engelle (POST /profiles'ı ağ katmanında başarısız kıl veya profiles yazma claim'i olmayan bir hesapla dene). Sonra 'Kullanıcı Ekle' akışını sonuna kadar çalıştır.
   - Beklenen: 'Kullanıcı profili oluşturulamadı.' toast'ı çıkar AMA modal yine de kapanır ve kullanıcı OLUŞUR: listede yeni satırda Kullanıcı sütununda ad-soyad yerine '—' görünür, e-posta doludur. users tablosunda satır var, profiles tablosunda yok. Aynı biçimde rol yazımı düşerse 'Rol eklenemedi.' toast'ı çıkar ve kullanıcı rolsüz kalır.
   - Roller: super admin, godmin, Merkez Ekip


## Ana sayfa (/) — 5S Denetimler listesi + (yetkiliyse) 5S Rapor Özeti  (67 senaryo)

1. **Açılışta beş listenin yüklenmesi**  _[düşük · okur]_
   - Adımlar: Giriş yaptıktan sonra ana sayfayı (/) aç. "Denetimler" başlıklı panelin altında satırların gelmesini bekle.
   - Beklenen: Ağ sekmesinde tek seferde 6 istek görünür: /auth/me, /fiveSAuditPlans (limit 500, planned_date desc, is_active=true), /fiveSLocations (limit 200), /fiveSAuditTeams (limit 1000), /fiveSAuditTeamMembers (limit 5000), /users (limit 2000). Tablo satırlarında Tarih/Lokasyon/Ekip alanları dolu gelir. Hiçbir yazma isteği çıkmaz.
   - Roller: Giriş yapmış her rol (sayfa LoginChecker arkasında, routeAccess'te "/" için kural yok)

2. **Yükleme iskeleti**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlat (DevTools Slow 3G) ve ana sayfayı yenile. "Denetimler" panelinin gövdesine bak.
   - Beklenen: Satırların yerine 6 sütunlu, 4 satırlık gri parlayan iskelet çizilir; veri gelince iskelet kaybolup gerçek satırlar aynı yükseklikte yerleşir (sayfa zıplamaz).
   - Roller: Tüm roller

3. **Okuma hatasında TEK uyarı**  _[düşük · okur]_
   - Adımlar: Backend'i durdur (ya da DevTools ile /fiveS* isteklerini blokla) ve ana sayfayı yenile.
   - Beklenen: Sağ üstte tek bir kırmızı toast çıkar: "Ana sayfa verileri yüklenemedi. Sayfayı yenilemeyi deneyin." — beş istek de düşse bile ikinci toast ÇIKMAZ. Konsolda ayrı ayrı GET_FIVE_S_* error satırları görünür.
   - Roller: Tüm roller

4. **"Yenile" ile listeyi tazeleme**  _[düşük · okur]_
   - Adımlar: Başka bir sekmede bir denetim planının tarihini değiştir. Ana sayfada panelin sağ üstündeki "Yenile" butonuna bas.
   - Beklenen: Beş GET isteği yeniden atılır, buton istek boyunca soluklaşır (disabled) ve satırdaki tarih yeni değere döner. Yazma isteği yok.
   - Roller: Tüm roller

5. **Yükleme sırasında "Yenile" kilitli**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlat, sayfayı yenile ve veriler gelmeden "Yenile" butonuna tıklamayı dene.
   - Beklenen: Buton %50 opaklıkta ve tıklama yeni istek üretmez; veriler gelince buton normale döner.
   - Roller: Tüm roller

6. **"Plan / Yaklaşan" sekmesi ve sayacı**  _[düşük · okur]_
   - Adımlar: Ana sayfada sol üstteki sekmelerden "Plan / Yaklaşan (N)" butonuna bas.
   - Beklenen: Sekme koyulaşır (aktif); listede yalnızca location_id'si olan ve durumu "Tamamlandı" OLMAYAN planlar (Planlandı ve İptal edildi) görünür; parantez içindeki N bu satır sayısına eşittir. Satırlar tarihe göre ARTAN sıralıdır (en yakın tarih üstte).
   - Roller: Tüm roller

7. **"Tamamlanan" sekmesi ve sayacı**  _[düşük · okur]_
   - Adımlar: Sekmelerden "Tamamlanan (N)" butonuna bas.
   - Beklenen: Yalnızca durumu "Tamamlandı" olan planlar listelenir, tarihe göre AZALAN sıralı (en yeni üstte); parantezdeki N satır sayısına eşittir. "Denetimi Başlat" butonu bu sekmede hiçbir satırda görünmez.
   - Roller: Tüm roller

8. **Sekme değişince açık tarih düzenlemesi iptal olur**  _[düşük · okur]_
   - Adımlar: Ekip lideri olarak gir, "Plan / Yaklaşan" sekmesinde bir satırda "Düzenle (2 hak)" bağlantısına bas, tarih alanı açılsın. Kaydetmeden "Tamamlanan" sekmesine geç, sonra "Plan / Yaklaşan"a dön.
   - Beklenen: Geri dönüldüğünde satır düz metin tarihine dönmüştür; tarih alanı, "Kaydet" ve "İptal" butonları kapanmıştır ve girilen tarih hiçbir yere yazılmamıştır.
   - Roller: Tüm roller (yalnızca düzenleme açabilen ekip liderinde gözlemlenebilir)

9. **Ana plan (dönem) satırı listede görünmez**  _[düşük · okur]_
   - Adımlar: Ana Veri Yönetimi'nden location_id'si olmayan bir çeyrek/ana plan (quarter + date_range_start/end dolu) oluştur. Ana sayfada her iki sekmeye de bak.
   - Beklenen: Bu ana plan hiçbir sekmede satır olarak listelenmez; yalnızca alt planların "Dönem" sütununda çeyrek rozeti ve başlık olarak görünür.
   - Roller: Tüm roller

10. **Pasif plan listeye girmez**  _[düşük · okur]_
   - Adımlar: Bir denetim planının is_active değerini false yap, ana sayfada "Yenile"ye bas.
   - Beklenen: Plan her iki sekmeden de kaybolur (istek filters.is_active=true ile gidiyor); sekme sayaçları bir azalır.
   - Roller: Tüm roller

11. **Boş durum**  _[düşük · okur]_
   - Adımlar: Hiç aktif denetim planı olmayan bir kurulumda ana sayfayı aç (veya "Tamamlanan" sekmesinde hiç kayıt yokken bak).
   - Beklenen: Tablo yerine ortalanmış pano ikonu, "Henüz denetim yok" başlığı ve "Planlanan ve tamamlanan denetimler burada listelenir. Yeni bir denetim planlandığında bu listede görünür." açıklaması çıkar.
   - Roller: Tüm roller

12. **Roller yüklenmeden liste boş görünür**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlat ve ana sayfayı yenile; store.isLoginChecked true olmadan önceki ana ekran karesine bak.
   - Beklenen: Roller çözülene kadar visiblePlans boş döndüğü için kısa süre "Henüz denetim yok" görünür, roller gelince satırlar belirir. (Kalıcı boşluk değil, geçici olmalı.)
   - Roller: Tüm roller

13. **Yetkisiz rol yalnızca kendi denetimlerini görür**  _[YÜKSEK · okur]_
   - Adımlar: Yalnızca "Denetçi" (veya "Saha Sorumlusu") rolü olan bir kullanıcı ile gir. Ana sayfadaki satırları, veritabanındaki toplam plan sayısıyla karşılaştır.
   - Beklenen: Yalnızca (a) üyesi/lideri olduğu ekibe atanmış planlar ve (b) müdürü/saha sorumlusu olduğu lokasyonların planları listelenir. Başka ekibin/lokasyonun planı hiçbir sekmede görünmez; sekme sayaçları da bu daraltılmış sayıyı gösterir.
   - Roller: Denetçi / Saha Sorumlusu ve isPrivilegedUser listesinde olmayan tüm roller

14. **Yetkili rol tüm denetimleri görür**  _[YÜKSEK · okur]_
   - Adımlar: Rol adı tam olarak "Super Admin", "godmin", "Manager" olan ya da hem "content manager" hem "core team" içeren (Merkez Ekip) bir kullanıcı ile gir.
   - Beklenen: Ana sayfada veritabanındaki TÜM aktif planlar listelenir (ekip/lokasyon daraltması uygulanmaz) ve altta "5S Rapor Özeti" bölümü açılır.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip (content manager + core team)

15. **Ekip lideri / üye açılır kutusu**  _[düşük · okur]_
   - Adımlar: Bir satırda "Ekip / Lider" sütunundaki, lider adı ve yanında "Üyeler" yazan butona tıkla.
   - Beklenen: Butonun altında portal ile açılan koyu bir kutu belirir: "Ekip üyeleri" başlığı, madde işaretli üye adları listesi ve altta "Kapatmak için dışarı tıkla ya da tekrar tıkla." notu. Lider adı listenin başında yer alır.
   - Roller: Tüm roller

16. **Üyesiz ekipte boş metin**  _[düşük · okur]_
   - Adımlar: five_s_audit_team_members'ta aktif kaydı olmayan bir ekibe atanmış planın satırında "Üyeler" butonuna tıkla.
   - Beklenen: Kutuda "Ekip üyeleri" başlığının altında yalnızca lider adı görünür; lideri de olmayan bir ekipte "Üye bulunamadı." yazar ve buton metninde lider yerine "—" çıkar.
   - Roller: Tüm roller

17. **Açılır kutuyu kapatma (dışarı tıklama / tekrar tıklama)**  _[düşük · okur]_
   - Adımlar: "Üyeler" kutusunu aç, sayfanın boş bir yerine tıkla. Sonra tekrar aç ve aynı butona ikinci kez tıkla.
   - Beklenen: Her iki durumda da kutu kaybolur; DOM'da body altındaki portal düğümü kalmaz.
   - Roller: Tüm roller

18. **Açılır kutu kaydırma/boyutlandırmada yeniden konumlanır**  _[düşük · okur]_
   - Adımlar: Listenin en alt satırında "Üyeler" kutusunu aç; kutu açıkken sayfayı kaydır ve tarayıcı penceresini daralt.
   - Beklenen: Kutu ankraja yapışık kalır: alta sığmıyorsa butonun ÜSTÜNDE açılır, sağdan taşarsa sola kayar ve ekran kenarından en az 8px içeride durur.
   - Roller: Tüm roller

19. **"Düzenle (N hak)" yalnızca ekip liderinde**  _[YÜKSEK · okur]_
   - Adımlar: Aynı planı üç farklı kullanıcıyla aç: (1) planın atandığı ekibin lideri, (2) aynı ekibin sıradan üyesi, (3) Super Admin.
   - Beklenen: Sadece (1)'de tarihin altında mavi "Düzenle (2 hak)" bağlantısı görünür. (2) ve (3)'te — Super Admin dahil — bağlantı yoktur. Panelin altındaki not bunu doğrular: "Not: “Düzenle” butonu sadece ilgili ekibin liderinde görünür."
   - Roller: Yalnızca planın assigned_team_id'sinin leader_user_id'si olan kullanıcı; rol adı önemsiz

20. **Satır içi tarih düzenlemeyi açma**  _[düşük · okur]_
   - Adımlar: Ekip lideri olarak "Plan / Yaklaşan" sekmesinde bir satırda "Düzenle (2 hak)" bağlantısına bas.
   - Beklenen: Tarih hücresi bir tarih girişine (date input) dönüşür ve mevcut planlanan tarih dolu gelir; altında "Kaydet" ve "İptal" butonları çıkar. Planın ana planı varsa "Aralık: YYYY-MM-DD – YYYY-MM-DD" satırı görünür.
   - Roller: Yalnızca atanan ekibin lideri

21. **Tarih alanına tıklayınca takvim açılır**  _[düşük · okur]_
   - Adımlar: Düzenleme açıkken tarih alanının üzerine (ikonun değil, kutunun herhangi bir yerine) tıkla.
   - Beklenen: Tarayıcının tarih seçici paneli açılır ve alan odaklanır (showPicker). Aynı davranış modaldaki "Denetim Tarihi" ve rapor filtresindeki "Başlangıç"/"Bitiş" alanlarında da geçerlidir.
   - Roller: Tüm roller

22. **Tarihi değiştirip "Kaydet"**  _[orta · yazar]_
   - Adımlar: Ekip lideri olarak "Düzenle (2 hak)" → tarih alanına ana plan aralığı İÇİNDE, çakışmasız bir tarih gir → "Kaydet" butonuna bas.
   - Beklenen: PUT /fiveSAuditPlans/<planId> gider; satır kapanır ve yeni tarihi gösterir, bağlantı "Düzenle (1 hak)" olur. five_s_audit_plans tablosunda o satırın planned_date yeni değere, date_change_count 0'dan 1'e çıkar.
   - Roller: Yalnızca atanan ekibin lideri (FE); backend ayrıca PUT five_s_audit_plans claim'i arar

23. **Tarih düzenlemesini "İptal" ile bırakma**  _[düşük · okur]_
   - Adımlar: Düzenlemeyi aç, tarihi değiştir, sonra "İptal" butonuna bas.
   - Beklenen: Hücre eski (kaydedilmiş) tarihe döner, hiçbir ağ isteği çıkmaz, "Düzenle (2 hak)" sayacı değişmez.
   - Roller: Yalnızca atanan ekibin lideri

24. **Ana plan aralığı dışındaki tarih kaydettirmez**  _[orta · okur]_
   - Adımlar: Ana planı (parent_plan_id) olan bir satırda düzenlemeyi aç, "Aralık: …" satırında yazan başlangıçtan önce veya bitişten sonra bir tarih seç.
   - Beklenen: Alanın kenarı kırmızıya döner, altında "⚠ Seçilen tarih ana plan aralığı dışında" yazar ve "Kaydet" butonu soluk/kilitli olur; tıklama istek üretmez.
   - Roller: Yalnızca atanan ekibin lideri

25. **Boş tarihle kaydetme engeli**  _[düşük · okur]_
   - Adımlar: Düzenlemeyi aç, tarih alanını tamamen temizle, "Kaydet"e bas.
   - Beklenen: "Kaydet" kilitlidir; hiçbir istek gitmez ve satır düzenleme modunda kalır.
   - Roller: Yalnızca atanan ekibin lideri

26. **Aynı ekip çakışma uyarısı**  _[düşük · okur]_
   - Adımlar: Aynı ekibe atanmış, farklı lokasyonda, iptal edilmemiş iki plan olsun. Birinin tarihini diğerinin tarihine eşitle.
   - Beklenen: Tarih alanının altında sarı uyarı çıkar: "\"<Ekip adı>\" ekibi bu tarihte \"<Lokasyon>\" denetiminde görevli." Uyarı ENGELLEMEZ — "Kaydet" tıklanabilir kalır.
   - Roller: Yalnızca atanan ekibin lideri

27. **Ekip lideri çakışma uyarısı**  _[düşük · okur]_
   - Adımlar: Aynı kişinin lider olduğu İKİ farklı ekip kur, ikisine de plan ata. Bir planın tarihini diğerinin tarihine eşitle.
   - Beklenen: Sarı uyarı: "Ekip lideri (<Ad Soyad>) bu tarihte \"<Lokasyon>\" denetiminde (<Diğer ekip>) görevli."
   - Roller: Yalnızca atanan ekibin lideri

28. **Saha sorumlusu çakışma uyarısı**  _[düşük · okur]_
   - Adımlar: İki farklı lokasyonun field_manager_user_ids listesine aynı kullanıcıyı ekle, ikisine de plan aç. Bir planın tarihini diğerinkine eşitle.
   - Beklenen: Sarı uyarı: "Saha sorumlusu (<Ad Soyad>) bu tarihte \"<Diğer lokasyon>\" denetiminde görevli." Birden fazla çakışan lokasyon varsa her biri için ayrı satır çıkar.
   - Roller: Yalnızca atanan ekibin lideri

29. **İptal edilmiş plan çakışma saymaz**  _[düşük · okur]_
   - Adımlar: Bir planı "cancelled" durumuna al. Aynı ekibin başka planında tarihi bu iptal edilmiş planın tarihine eşitle.
   - Beklenen: Hiçbir sarı çakışma uyarısı çıkmaz.
   - Roller: Yalnızca atanan ekibin lideri

30. **İki hak bitince "Tarih kilitli"**  _[YÜKSEK · okur]_
   - Adımlar: Ekip lideri olarak aynı planın tarihini iki kez değiştir ("Düzenle (2 hak)" → "Düzenle (1 hak)" → kaydet). Satıra tekrar bak.
   - Beklenen: Düzenle bağlantısı kaybolur, yerinde gri "Tarih kilitli" yazısı görünür. five_s_audit_plans.date_change_count = 2'dir ve daha fazla PUT tetiklenemez.
   - Roller: Yalnızca atanan ekibin lideri ("Tarih kilitli" metni de sadece ona gösterilir)

31. **"Denetimi Başlat" ile denetim ekranına geçiş**  _[orta · okur]_
   - Adımlar: "Plan / Yaklaşan" sekmesinde durumu "Planlandı" olan bir satırda, Durum sütunundaki mavi "Denetimi Başlat" butonuna bas.
   - Beklenen: Adres çubuğu /denetim?planId=<plan id> olur ve denetim ekranı o planı otomatik seçili açar (denetim/page.tsx:1176 URL'den planId okuyor).
   - Roller: Tüm roller (buton rol kontrolü yok; yalnız sekme=Plan/Yaklaşan ve durum=planned şartı var)

32. **"Denetimi Başlat" iptal/tamamlanan satırda yok**  _[düşük · okur]_
   - Adımlar: Durumu "İptal edildi" olan bir satıra ve "Tamamlanan" sekmesindeki bir satıra bak.
   - Beklenen: Her ikisinde de "Denetimi Başlat" butonu hiç render edilmez; yalnızca durum rozeti görünür.
   - Roller: Tüm roller

33. **Tamamlanmış denetimi düzenleme butonu (yetkiye bağlı)**  _[YÜKSEK · okur]_
   - Adımlar: "Tamamlanan" sekmesine geç. Önce Merkez Ekip/Manager/Super Admin/godmin ile, sonra Denetçi ile bak.
   - Beklenen: Yetkili rollerde audit_id'si dolu satırlarda mor "Düzenle" butonu vardır (üzerine gelince "Tamamlanmış denetimi düzenle (Merkez Ekip)" ipucu çıkar). Denetçi/Saha Sorumlusu'nda buton hiç render edilmez. audit_id boş olan tamamlanmış satırda yetkilide de görünmez.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

34. **Düzenle modalını açma (denetim kaydını çekme)**  _[düşük · okur]_
   - Adımlar: Yetkili rolle "Tamamlanan" sekmesinde bir satırda "Düzenle" butonuna bas.
   - Beklenen: GET /fiveSAudits (limit 1, filters.id=<audit_id>) atılır ve ekranın ortasında "Tamamlanmış Denetimi Düzenle" başlıklı modal açılır; altında "<Bölüm adı> — sadece Merkez Ekip düzenleyebilir." yazar. Alanlar mevcut değerlerle dolu gelir: Denetimi Yapan, Denetim Tarihi, Toplam Puan, S1–S5 Puanı.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

35. **Denetim kaydı bulunamadı**  _[düşük · okur]_
   - Adımlar: Bir planın audit_id'sini five_s_audits'te olmayan bir uuid'e ayarla, sonra o satırda "Düzenle"ye bas.
   - Beklenen: Modal AÇILMAZ; kırmızı toast çıkar: "Denetim kaydı bulunamadı."
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

36. **Denetim kaydı yüklenemedi**  _[düşük · okur]_
   - Adımlar: DevTools ile /fiveSAudits GET isteğini blokla, sonra "Düzenle"ye bas.
   - Beklenen: Modal açılmaz; kırmızı toast: "Denetim kaydı yüklenemedi."
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

37. **Modalda "Denetimi Yapan" alanını değiştirip kaydetme**  _[YÜKSEK · yazar]_
   - Adımlar: Modalda "Denetimi Yapan" kutusunun içeriğini sil, yeni bir ad yaz (başında/sonunda boşluk bırak), "Kaydet" butonuna bas.
   - Beklenen: PUT /fiveSAudits/<id> gider; modal kapanır ve yeşil toast çıkar: "Denetim kaydı güncellendi." five_s_audits.auditor_name kırpılmış (trim edilmiş) yeni ada döner.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip (backend PUT five_s_audits claim'i arar)

38. **Modalda denetim tarihini değiştirme**  _[YÜKSEK · yazar]_
   - Adımlar: Modalda "Denetim Tarihi" alanına yeni bir tarih seç, "Kaydet"e bas.
   - Beklenen: "Denetim kaydı güncellendi." toast'ı çıkar; five_s_audits.audit_date seçilen günün 00:00'ına döner (payload new Date("YYYY-MM-DDT00:00:00") ile gidiyor — kaydedilen değerin gün kaymadığı DB'den doğrulanmalı).
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

39. **Modalda puanları değiştirme (üzerine yazma)**  _[YÜKSEK · yazar]_
   - Adımlar: Modaldaki altı sayı alanından ("Toplam Puan", "S1 Puanı", "S2 Puanı", "S3 Puanı", "S4 Puanı", "S5 Puanı") birkaçını değiştir, "Kaydet"e bas.
   - Beklenen: "Denetim kaydı güncellendi." toast'ı; five_s_audits satırında total_score / score_s1..score_s5 iki ondalıkla (örn. 82.50) YENİ değerlere döner — eski puanlar geri alınamaz biçimde üzerine yazılır. audit_logs tablosunda old_values ile bir update kaydı oluşmalıdır.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

40. **Puan alanı sınırları (min 0 / max 100 / step 0.01)**  _[YÜKSEK · yazar]_
   - Adımlar: "Toplam Puan" alanına -5, sonra 150, sonra 82.555 yaz ve "Kaydet"e bas.
   - Beklenen: Alan number tipi ve min=0 max=100 step=0.01 ile tanımlı — tarayıcı ok tuşlarıyla 0-100 dışına çıkarmaz. Ancak elle yazılan değerde JSX'te ek doğrulama YOKTUR: gönderim Number(...).toFixed(2) ile gider, yani 150 → "150.00" olarak yazılabiliyorsa bu bir kusurdur; boş bırakılırsa "NaN" gider. DB'de five_s_audits.total_score değerini kontrol et.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

41. **Kaydetme sırasında çift gönderim engeli**  _[orta · yazar]_
   - Adımlar: Ağı yavaşlat, modalda bir değeri değiştir ve "Kaydet"e üst üste hızlıca bas.
   - Beklenen: Buton metni "Kaydediliyor..." olur ve soluklaşıp kilitlenir; yalnızca TEK PUT isteği gider.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

42. **Yetkisiz kaydetme reddi**  _[YÜKSEK · okur]_
   - Adımlar: Backend'de PUT five_s_audits claim'i olmayan bir hesapla (ya da isteği 403 döndürecek şekilde) modalda "Kaydet"e bas.
   - Beklenen: Kırmızı toast: "Denetim güncellenemedi. Yetkinizi kontrol edin (sadece Merkez Ekip)." Modal AÇIK kalır, girilen değerler kaybolmaz ve five_s_audits satırı değişmez.
   - Roller: Butonu gören ama backend claim'i olmayan roller

43. **Modalı "İptal" ile kapatma**  _[düşük · okur]_
   - Adımlar: Modalda alanları değiştir, sonra sağ alttaki "İptal" butonuna bas.
   - Beklenen: Modal kapanır, hiçbir istek gitmez, five_s_audits değişmez. Tekrar "Düzenle" ile açıldığında alanlar ESKİ (kaydedilmiş) değerlerle gelir.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

44. **Modalı ✕ ile kapatma**  _[düşük · okur]_
   - Adımlar: Modalın sağ üstündeki ✕ işaretine tıkla.
   - Beklenen: Modal kapanır, istek gitmez. (Not: modal arka planına — siyah örtüye — tıklamak ve ESC tuşu kapatmaz; bunlar bilinçli olarak bağlı değil.)
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

45. **Dönem sütunu (çeyrek rozeti ve başlık)**  _[düşük · okur]_
   - Adımlar: parent_plan_id'si dolu, ana planında quarter ve title bulunan bir plana ve ana planı olmayan bir plana "Dönem" sütununda bak.
   - Beklenen: Birincide mor çerçeveli çeyrek rozeti (örn. "2026-Q1") ve altında ana planın başlığı; quarter boşsa rozet "—" gösterir. Ana planı olmayanda sütunda düz "—" yazar.
   - Roller: Tüm roller

46. **Müdür / Saha Sor. sütunu**  _[düşük · okur]_
   - Adımlar: Lokasyonuna manager_user_id ve field_manager_user_ids atanmış bir satıra, sonra hiçbiri atanmamış bir satıra bak.
   - Beklenen: Birincide "Müdür: <Ad Soyad>" ve "Saha: <Ad1, Ad2>" satırları görünür (adlar users kaydının profile.first_name + last_name'inden kurulur). Hiçbiri yoksa sütunda "—" yazar.
   - Roller: Tüm roller

47. **Pasif lokasyon adı "-" görünür**  _[orta · okur]_
   - Adımlar: Bir lokasyonun is_active değerini false yap, o lokasyona bağlı planın satırında "Lokasyon" sütununa bak ("Yenile"den sonra).
   - Beklenen: Lokasyon adı yerine "-" yazar ve Müdür/Saha sütunu "—" olur — pasif lokasyonlar locInfoById haritasına hiç girmiyor. (Plan satırı yine de listede kalır.)
   - Roller: Tüm roller

48. **Durum rozetinin Türkçe etiketi**  _[düşük · okur]_
   - Adımlar: Durumu planned / completed / cancelled olan üç satıra Durum sütunundan bak.
   - Beklenen: Sırasıyla sarı "Planlandı", yeşil "Tamamlandı", kırmızı "İptal edildi" rozetleri çıkar; sözlükte olmayan bir durum değeri ham İngilizce haliyle gri rozette görünür.
   - Roller: Tüm roller

49. **Mobilde sütun başlığının gizlenmesi**  _[düşük · okur]_
   - Adımlar: Tarayıcıyı 375px genişliğe al (mobil) ve ana sayfayı aç; sonra 1024px'e genişlet.
   - Beklenen: 375px'te "Tarih / Dönem / Lokasyon / Müdür / Saha Sor. / Ekip / Lider / Durum" başlık şeridi HİÇ görünmez; satırlar kendi "Müdür:" / "Saha:" etiketlerini taşır. Geniş ekranda başlık şeridi geri gelir. Yatay kaydırma çubuğu oluşmamalı.
   - Roller: Tüm roller

50. **"5S Rapor Özeti" bölümünün yetkiye bağlı görünürlüğü**  _[YÜKSEK · okur]_
   - Adımlar: Ana sayfayı önce Super Admin / godmin / Manager / Merkez Ekip ile, sonra Denetçi ile aç ve denetim listesinin altına bak.
   - Beklenen: Yetkili rollerde "5S Rapor Özeti" başlığı, sağında "Tüm raporlar →" bağlantısı ve altında rapor panosu (filtre çubuğu + 5 kart + grafikler) render edilir; GET /reports/dashboard isteği atılır. Denetçi'de bölüm hiç yoktur ve /reports/dashboard isteği HİÇ gitmez.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

51. **"Tüm raporlar →" bağlantısı**  _[düşük · okur]_
   - Adımlar: Yetkili rolle "5S Rapor Özeti" başlığının sağındaki "Tüm raporlar →" bağlantısına tıkla.
   - Beklenen: Tarayıcı /raporlar adresine gider (tam sayfa yükleme — <a href>).
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

52. **Rapor tarih filtresi: Başlangıç**  _[düşük · okur]_
   - Adımlar: Rapor panosunun filtre çubuğunda "Başlangıç" alanına bir tarih seç.
   - Beklenen: Alan değişir değişmez otomatik olarak GET /reports/dashboard?date_from=<tarih> isteği gider (fetchData dateFrom'a bağlı) ve kartlar/grafikler o tarihten sonraki bulgu ve denetimlerle yeniden çizilir.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

53. **Rapor tarih filtresi: Bitiş**  _[düşük · okur]_
   - Adımlar: "Bitiş" alanına bir tarih seç ("Başlangıç" ile birlikte de dene).
   - Beklenen: GET /reports/dashboard?date_to=<tarih> (veya iki parametre birlikte) gider; audit_date için üst sınır o günün 23:59:59'unu kapsar, yani bitiş gününde yapılmış denetim "Toplam Denetim" sayısına DAHİL olur.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

54. **Rapor "Yenile" butonu**  _[düşük · okur]_
   - Adımlar: Filtre çubuğundaki döner ok ikonlu "Yenile" butonuna bas.
   - Beklenen: Buton kilitlenir ve ikon dönmeye başlar (Loader2 spin), tek bir GET /reports/dashboard isteği gider, cevap gelince kartlar tazelenir ve buton normale döner.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

55. **Rapor hata durumu ve "Tekrar dene"**  _[düşük · okur]_
   - Adımlar: DevTools ile /reports/dashboard isteğini blokla ve sayfayı yenile; çıkan kırmızı kutudaki "Tekrar dene" bağlantısına bas.
   - Beklenen: Grafiklerin yerine kırmızı çerçeveli kutuda hata metni ("Rapor verisi alınamadı" ya da sunucunun mesajı) ve altı çizili "Tekrar dene" görünür. Bloku kaldırıp "Tekrar dene"ye basınca istek yeniden atılır ve pano normale döner.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

56. **Özet kartlar ve renk tonları**  _[düşük · okur]_
   - Adımlar: Rapor panosunun üstündeki beş karta bak: "Toplam Denetim", "Son Dönem Ort. Puan", "Açık Bulgu", "Kapalı Bulgu", "Termin Geçmiş".
   - Beklenen: Toplam Denetim = Müdürlük Bazlı Özet tablosundaki "Denetim" sütununun toplamı; Açık/Kapalı Bulgu aynı tablonun "Açık"/"Kapalı" toplamları; Termin Geçmiş = "Termin Tarihi Geçmiş Aksiyonlar" tablosunun satır sayısı. Son Dönem Ort. Puan ≥ 75 ise yeşil, altındaysa turuncu; Termin Geçmiş > 0 ise kırmızı, 0 ise yeşil.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

57. **5S Puan Trendi grafiği**  _[düşük · okur]_
   - Adımlar: "5S Puan Trendi" kartındaki çizgilerin üzerine gel; efsanedeki "Ortalama Puan" ve "Hedef" etiketlerini ve turuncu kesikli çizgiyi kontrol et.
   - Beklenen: Y ekseni 0–100 sabittir; 75 hizasında "Hedef 75" etiketli turuncu kesikli çizgi vardır. Bir noktanın üzerine gelince koyu bir ipucu kutusu dönem adı ve iki değerle açılır.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

58. **Bölge / Bulgu Tipi Dağılımı grafiği**  _[düşük · okur]_
   - Adımlar: "Bölge / Bulgu Tipi Dağılımı" kartındaki yığılmış çubukların üzerine gel.
   - Beklenen: Her lokasyon için bir çubuk, bulgu tipi başına bir renkli dilim; ipucu kutusunda tip adı ve adet çıkar. Lokasyon/tip adı boşsa "Bilinmiyor" olarak gruplanır. X ekseni etiketleri -25° eğik ve hepsi görünür.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

59. **Açık / Kapalı Bulgu Sayıları grafiği**  _[düşük · okur]_
   - Adımlar: "Açık / Kapalı Bulgu Sayıları" kartına bak, çubukların üzerine gel.
   - Beklenen: Lokasyon başına üç ayrı çubuk: kırmızı "Açık", sarı "Devam Ediyor", yeşil "Kapalı" — backend'in open / in_progress / closed değerleri Türkçe etikete çevrilmiş olarak.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

60. **Bölge Bazında Puanlar grafiği**  _[düşük · okur]_
   - Adımlar: "Bölge Bazında Puanlar" kartındaki çubuklara ve turuncu kesikli çizgiye bak.
   - Beklenen: Y ekseni 0–100; her bölüm (department_name) için "Ort. Puan" çubuğu ve 75 hizasında kesikli hedef çizgisi. Çubuğun üstüne gelince ipucu kutusu değeri gösterir.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

61. **Bölge / 5S Adımı Dağılımı grafiği**  _[düşük · okur]_
   - Adımlar: "Bölge / 5S Adımı Dağılımı" kartındaki yığılmış çubuklara bak.
   - Beklenen: Lokasyon başına bir çubuk, S adımı kodu (S1…S5) başına bir renkli dilim; ipucunda adım kodu ve adet.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

62. **Denetim Başına Ortalama Bulgu grafiği**  _[düşük · okur]_
   - Adımlar: "Denetim Başına Ortalama Bulgu" kartına bak.
   - Beklenen: Ekip adı başına iki çubuk: mor "Ort. Bulgu / Denetim" ve mavi "Denetim Sayısı"; efsanede bu iki Türkçe etiket okunur.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

63. **Denetim Planına Uyum tablosu ve boş hali**  _[düşük · okur]_
   - Adımlar: "Denetim Planına Uyum" kartındaki tabloyu incele; sonra hiç plan olmayan bir tarih aralığı seçip tekrar bak.
   - Beklenen: Sütunlar: Durum / Plan / Denetçi Katıldı / Saha Sor. Katıldı / Saha Sor. Katılmadı. Durum değerleri Türkçeleşir (planned→Planlandı, completed→Tamamlandı, cancelled→İptal). Veri yoksa tek satırda ortalanmış "Veri yok." yazar.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

64. **Müdürlük Bazlı Özet tablosu ve boş hali**  _[düşük · okur]_
   - Adımlar: "Müdürlük Bazlı Özet" tablosuna bak; dar bir ekranda yatay kaydır; sonra veri döndürmeyen bir tarih aralığı seç.
   - Beklenen: Sütunlar: Müdürlük / Denetim / Ort. Puan / Açık / Kapalı / Geciken. Ort. Puan ≥ 75 ise yeşil, altındaysa turuncu; değer yoksa "-". Tablo kendi içinde yatay kayar, sayfa gövdesi kaymaz. Veri yoksa "Veri yok." satırı çıkar.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

65. **Termin Tarihi Geçmiş Aksiyonlar tablosu**  _[düşük · okur]_
   - Adımlar: "Termin Tarihi Geçmiş Aksiyonlar" kartındaki listeyi kaydır; "Aksiyon" hücresinin üzerine gel; sonra termini geçmiş bulgu kalmayan bir aralık seç.
   - Beklenen: Sütunlar: No / Lokasyon / Tip / Aksiyon / Termin / Gecikme / Sorumlu. Liste en fazla ~320px yükseklikte kendi içinde kayar ve başlık satırı yapışık kalır. Uzun aksiyon metni kısaltılır, üzerine gelince tam metin tarayıcı ipucu olarak çıkar. Gecikme "<N> gün" biçiminde kırmızıdır. Kayıt yoksa "Termini geçmiş açık aksiyon yok. 🎉" yazar.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

66. **Kompakt modda kroki ve foto raporlarının OLMAMASI**  _[düşük · okur]_
   - Adımlar: Ana sayfada rapor bölümünün en altına in ve "Fabrika Krokisi — Bulgu Isı Haritası" ile "Önce / Sonra Fotoğraflı Bulgular" kartlarını ara. Sonra /raporlar sayfasını açıp aynı kartları ara.
   - Beklenen: Ana sayfada bu iki kart HİÇ render edilmez (compact) ve dolayısıyla GET /fiveSFindings (filters.status=closed) isteği ana sayfadan ATILMAZ; /raporlar sayfasında ikisi de görünür.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip

67. **Rapor panosunun tek istek attığının doğrulanması**  _[orta · okur]_
   - Adımlar: Yetkili rolle ana sayfayı aç, DevTools ağ sekmesini temizle ve 30 saniye bekle. /reports/dashboard isteklerini say.
   - Beklenen: Sayfa başına yalnızca 1 istek olur; sürekli artan bir istek dizisi (ölçülmüş regresyon: tek sayfa yüklemesinde 211 istek) görülmemelidir. Filtre değiştirmeden yeni istek çıkmaz.
   - Roller: Super Admin, godmin, Manager, Merkez Ekip


## Denetim formu — 5S Denetim Formu (Sahalar), /denetim  (58 senaryo)

1. **Yükleme durumu**  _[düşük · okur]_
   - Adımlar: /denetim adresini aç, sayfa ilk açılırken ekrana bak.
   - Beklenen: Tek kutuda 'Planlanan denetimler kontrol ediliyor...' yazısı görünür; plan/liste/form hiç render edilmez. Atama çağrıları bitince kutu kaybolur.
   - Roller: Giriş yapmış herkes. /denetim ROUTE_REQUIREMENTS içinde yok, rol kapısı yok (routeAccess/index.ts:66).

2. **Kendi ekibine ait çoklu plan seçim ekranı**  _[düşük · okur]_
   - Adımlar: Kullanıcının üyesi olduğu ekibe is_active=true, status='planned', audit_id=null olan EN AZ İKİ plan atanmışken /denetim aç.
   - Beklenen: 'Denetim Seç' başlığı ve altında 'Ekibinize atanmış birden fazla planlı denetim var. Lütfen hangi denetimi yapacağınızı seçin.' metni; her plan için lokasyon adı, 'Ekip:', 'Tarih:' ve 'Seç →' içeren kart listelenir.
   - Roller: Plana atanmış ekibin üyesi veya lideri (memberSetByTeam, page.tsx:1151-1171).

3. **Yetkiliye tüm açık planların listelenmesi**  _[YÜKSEK · okur]_
   - Adımlar: Hiçbir ekibe üye OLMAYAN ama rolü manager / planner / godmin olan bir hesapla giriş yap, sistemde başka ekiplere planlanmış açık denetim varken /denetim aç.
   - Beklenen: 'Denetim Seç' başlığının altında farklı metin çıkar: 'Ekibinize atanmış planlı bir denetim yok. Yetkiniz olduğu için açık denetimlerin tamamı aşağıda listeleniyor.' ve tüm açık planlar kart olarak listelenir. Aynı hesap 'auditor' veya düz kullanıcı ise bunun yerine 'Ekibinize planlanan bir denetim yok' ekranı gelir.
   - Roller: hasPrivilege(names,['manager','planner','superadmin']) — godmin her zaman geçer. DİKKAT: normalizeRoleName 'Super Admin' rolünü 'super admin' yapar, listede 'superadmin' (bitişik) yazdığı için düz super admin GEÇMEZ; sadece godmin geçer (routeAccess/index.ts:38-48, page.tsx:483-487).

4. **Listeden plan seçme**  _[düşük · okur]_
   - Adımlar: 'Denetim Seç' ekranında bir plan kartına ('Seç →') tıkla.
   - Beklenen: Ekran tam denetim formuna döner; başlıktaki 'Plan:' satırında seçilen planın ekip adı, lokasyonu ve planlanan tarihi görünür; 'Ekip' ve 'Lokasyon' salt-okunur kutuları dolar; 'Denetimi Yapan' listesi o planın ekip üyeleriyle dolar.
   - Roller: Ekran 2'ye ulaşabilen herkes.

5. **URL'den planId ile doğrudan plan açma**  _[orta · okur]_
   - Adımlar: Ana sayfadan bir plana tıkla ya da adres çubuğuna /denetim?planId=<plan uuid> yaz.
   - Beklenen: Plan seçim ekranı hiç gösterilmez, doğrudan o planın formu açılır; başlıktaki 'Plan:' satırı o planın lokasyon/tarihini gösterir. planId kullanıcının KENDİ ekibine ait değilse parametre yok sayılır ve normal akış (seçim ekranı veya 'plan yok' ekranı) gelir.
   - Roller: Yalnızca planın atandığı ekibin üyesi; matched listesinde aranıyor (page.tsx:1179).

6. **Plan yokken 'Tekrar Kontrol Et'**  _[düşük · okur]_
   - Adımlar: 'Ekibinize planlanan bir denetim yok' ekranında 'Tekrar Kontrol Et' düğmesine bas.
   - Beklenen: Atama sorguları yeniden koşar; bu sırada 'Planlanan denetimler kontrol ediliyor...' görünür. Arada ekibe plan açıldıysa ekran forma ya da 'Denetim Seç' listesine döner; hâlâ yoksa aynı boş ekran kalır.
   - Roller: Herkes.

7. **'Tekil Bulgu +' düğmesinin role göre görünmesi**  _[YÜKSEK · okur]_
   - Adımlar: Sırayla şu rollerle /denetim aç ve düğmeyi ara: (a) manager, (b) auditor, (c) content manager core team, (d) yalnızca godmin, (e) rolsüz/düz kullanıcı.
   - Beklenen: (a)(b)(c)'de yeşil 'Tekil Bulgu +' düğmesi görünür; (d) ve (e)'de HİÇ görünmez. Bu kapı hasPrivilege kullanmadığı için godmin muafiyeti çalışmaz — düz godmin hesabı düğmeyi göremez.
   - Roller: Rol adı normalize edilip 'content manager core team' | 'manager' | 'auditor' ile birebir eşleşmeli (page.tsx:470-472). godmin/super admin muafiyeti YOK.

8. **Bulgu listesini 'Yenile'**  _[düşük · okur]_
   - Adımlar: 'Bu Lokasyondaki Bulgular' panelinde 'Yenile' düğmesine bas.
   - Beklenen: Kısa süre 'Bulgular yükleniyor...' yazar, ardından tablo yeniden dolar. Tabloda yalnızca location_name'i başlıktaki lokasyona (Türkçe küçültme + trim ile) eşit five_s_findings satırları listelenir.
   - Roller: Herkes.

9. **Bulgu listesi boş durumu**  _[düşük · okur]_
   - Adımlar: Hiç bulgusu olmayan bir lokasyonun planını aç (veya tekil bulgu modalında böyle bir lokasyon seç) ve bulgu paneline bak.
   - Beklenen: Tablo yerine 'Bu lokasyonda kayıtlı bulgu bulunamadı.' yazısı görünür; 'No / Tarih / Bulgu Tipi / Durum / Termin / Sorumlu / Detay' başlıkları hiç çizilmez.
   - Roller: Herkes.

10. **Bulgu detayını 'Gör'**  _[düşük · okur]_
   - Adımlar: Bulgu tablosunda bir satırın 'Detay' sütunundaki 'Gör' düğmesine bas.
   - Beklenen: 'Bulgu Detayı' modalı açılır; başlıkta bulgu tipi • tespit tarihi, gövdede description metni satır sonları korunarak, altında 'Termin:', 'Sorumlu:', 'Lokasyon:' alanları görünür. Durum sütunundaki değer Türkçeleşmiş olmalı ('open' → 'Açık').
   - Roller: Herkes.

11. **Bulgu fotoğrafını büyütme**  _[düşük · okur]_
   - Adımlar: 'Bulgu Detayı' modalında 'Öncesi Fotoğraflar' başlığı altındaki küçük resimlerden birine tıkla, sonra '✕ Kapat'a bas; ardından aynı resmi açıp koyu zemine (resmin dışına) tıkla.
   - Beklenen: Tam ekran koyu katmanda büyük resim açılır; '✕ Kapat' ve zemine tıklama katmanı kapatır, resmin ÜZERİNE tıklamak kapatmaz. Küçük resimlerin sağ altında sıra numarası (1,2,3) ve altta 'Fotoğrafa tıklayınca büyür.' notu vardır.
   - Roller: Herkes.

12. **Fotoğrafsız bulgu boş durumu**  _[düşük · okur]_
   - Adımlar: photo_before_files ve photo_before_url alanları boş bir bulgunun 'Gör' düğmesine bas.
   - Beklenen: 'Öncesi Fotoğraflar' bloğu hiç çizilmez, yerine 'Öncesi fotoğraf yok.' yazısı görünür.
   - Roller: Herkes.

13. **Tekil bulgu — yetkisiz kullanıcı reddi**  _[YÜKSEK · okur]_
   - Adımlar: canCreateSingleFinding kapsamında OLMAYAN bir rolle plan olmayan ekranda ol; düğme görünmediği için modalı açamazsın. Kapıyı doğrudan sınamak için rolü modal açıkken (React devtools ile değil, rol değiştirip sayfa yenilemeden) düşür ve 'Kaydet'e bas.
   - Beklenen: Kırmızı toast: 'Tekil bulgu girişi için yetkiniz yok.' Hiçbir five_s_audits / five_s_findings satırı oluşmaz.
   - Roller: Yalnızca plansız akışta kontrol ediliyor (isNoPlanFlow). Planlı akışta bu kapı HİÇ çalışmaz.

14. **Tekil bulgu — lokasyon zorunlu (plansız akış)**  _[düşük · okur]_
   - Adımlar: 'Tekil Bulgu +' → modalda 'Lokasyon' seçimini 'Seçiniz'de bırak, diğer alanları doldur, 'Kaydet'e bas.
   - Beklenen: Kırmızı toast: 'Lokasyon alanı zorunludur.' Modal açık kalır, kayıt oluşmaz.
   - Roller: manager / auditor / content manager core team.

15. **Tekil bulgu — Denetimi Yapan zorunlu**  _[düşük · okur]_
   - Adımlar: 'Tekil Bulgu +' → modaldaki 'Denetimi Yapan (zorunlu)' kutusunu tamamen sil, kalan alanları doldur, 'Kaydet'e bas.
   - Beklenen: Kırmızı toast: 'Tekil bulgu kaydı için Denetimi Yapan zorunludur.'
   - Roller: manager / auditor / content manager core team.

16. **Tekil bulgu — bulgu tipi zorunlu**  _[düşük · okur]_
   - Adımlar: 'Tekil Bulgu +' → 'Bulgu Tipi (zorunlu)' seçimini 'Seçiniz'de bırak, diğerlerini doldur, 'Kaydet'.
   - Beklenen: Kırmızı toast: 'Bulgu tipi zorunludur.'
   - Roller: manager / auditor / content manager core team.

17. **Tekil bulgu — açıklama zorunlu**  _[düşük · okur]_
   - Adımlar: 'Tekil Bulgu +' → 'Açıklama (zorunlu)' alanını boş bırak (veya sadece boşluk yaz), 'Kaydet'.
   - Beklenen: Kırmızı toast: 'Açıklama zorunludur.' Yalnızca boşluk yazıldığında da aynı toast çıkmalı (trim ediliyor).
   - Roller: manager / auditor / content manager core team.

18. **Tekil bulgu — alınacak faaliyet zorunlu**  _[düşük · okur]_
   - Adımlar: 'Tekil Bulgu +' → 'Alınacak Faaliyet (zorunlu)' seçimini 'Seçiniz'de bırak, 'Kaydet'.
   - Beklenen: Kırmızı toast: 'Alınacak faaliyet alanı zorunludur.'
   - Roller: manager / auditor / content manager core team.

19. **Tekil bulgu — termin tarihi zorunlu**  _[düşük · okur]_
   - Adımlar: 'Tekil Bulgu +' → 'Termin Tarihi (zorunlu)' alanını temizle, 'Kaydet'.
   - Beklenen: Kırmızı toast: 'Termin tarihi zorunludur.'
   - Roller: manager / auditor / content manager core team.

20. **Tekil bulgu — planlı akışta başlık eksikse reddi**  _[düşük · okur]_
   - Adımlar: Plan seçili haldeyken (tam form açıkken) 'Tekil Bulgu +' aç; header.teamName / department / date üçünden biri boşken 'Kaydet'e bas.
   - Beklenen: Kırmızı toast: 'Tekil bulgu kaydı için ekibinize planlanan bir denetim olmalıdır.'
   - Roller: manager / auditor / content manager core team.

21. **Tekil bulguya fotoğraf ekleme ve yinelenme kontrolü**  _[düşük · okur]_
   - Adımlar: 'Tekil Bulgu +' → 'Fotoğraf(lar) Ekle'ye bas, iki resim seç. Sonra AYNI iki resmi bir kez daha seç.
   - Beklenen: Liste ilk seçimde '1. <ad>' ve '2. <ad>' olarak dolar; ikinci seçimden sonra liste hâlâ 2 satır kalır (ad+boyut+lastModified aynı olanlar tekrar eklenmez). Hiç ekleme yapılmadan önce 'Henüz fotoğraf eklenmedi.' yazısı görünür. Alan accept=image/* ve capture=environment olduğu için mobilde kamera açılır.
   - Roller: manager / auditor / content manager core team.

22. **Tekil bulgu fotoğrafını silme**  _[düşük · okur]_
   - Adımlar: Tekil bulgu modalında iki fotoğraf ekle, ilkinin yanındaki 'Sil' düğmesine bas.
   - Beklenen: Satır listeden kalkar, kalan fotoğraf '1. <ad>' olarak yeniden numaralanır. Tek fotoğraf silinince yeniden 'Henüz fotoğraf eklenmedi.' yazısı çıkar.
   - Roller: manager / auditor / content manager core team.

23. **Tekil bulgu kaydetme (online)**  _[orta · yazar]_
   - Adımlar: 'Tekil Bulgu +' → 'Denetimi Yapan', 'Lokasyon', 'Tarih', 'Bulgu Tipi', 'Açıklama', 'Alınacak Faaliyet', 'Termin Tarihi' doldur, bir fotoğraf ekle, 'Kaydet'.
   - Beklenen: Yeşil toast: 'Tekil bulgu başarıyla kaydedildi.' Modal kapanır, tüm alanları boşalır ve bulgu paneli kendiliğinden yenilenerek yeni satırı gösterir. DB: five_s_audits'e total_score='0.00', score_s1..s5='0.00' olan bir satır; five_s_findings'e o audit_id ile status='open', description'ı 'TEKİL BULGU' ile başlayan bir satır; fotoğraf /files/ üzerinden yüklenip photo_before_file_id / photo_before_files dolar.
   - Roller: manager / auditor / content manager core team (plansız akışta zorunlu kapı); planlı akışta düğmeyi gören herkes.

24. **Tekil bulguyu bir soruya bağlama**  _[orta · yazar]_
   - Adımlar: Tekil bulgu modalında 'Bağlı Soru (opsiyonel)' listesinden bir soru seç (örn. S1-Q1), kalanını doldur, 'Kaydet'.
   - Beklenen: Kaydedilen five_s_findings satırında question_id = seçilen soru id'si, step_code = id'nin ilk parçası (S1) olur; description içinde 'Bağlı Soru: S1-Q1' ve 'Soru Metni: ...' satırları görünür. Boş bırakılırsa question_id/step_code gönderilmez.
   - Roller: Modalı açabilen roller.

25. **Tekil bulgu kaydetme (çevrimdışı)**  _[orta · yazar]_
   - Adımlar: DevTools'tan ağı Offline yap, modalın üstündeki 'Durum:' satırının 'Offline' yazdığını gör, formu doldurup 'Kaydet'e bas.
   - Beklenen: Yeşil toast: 'Offline: Tekil bulgu kuyruğa eklendi. İnternet gelince otomatik gönderilecek.' Modal kapanır; ekranda '• Kuyruk: 1' sayacı ve 'Senkronla (1)' düğmesi belirir. Sunucuda henüz satır YOKTUR; kayıt IndexedDB'deki fiveS_offline_db_v1 → submissions/submissionPhotos tablolarındadır.
   - Roller: Modalı açabilen roller.

26. **Denetimi Yapan çoklu seçim**  _[düşük · okur]_
   - Adımlar: Tam formda 'Denetimi Yapan' kutusuna ('Seçiniz ▾') bas, açılan listeden iki kişiyi işaretle, sonra kutunun dışındaki boş alana tıklayarak listeyi kapat.
   - Beklenen: Kutuda iki isim virgülle birleşmiş görünür ('Ali Veli, Ayşe Yıldız'); tekrar açıp aynı kişiyi kaldırınca isim listeden ve kutudan çıkar. Liste yalnızca planın ekip üyeleri + ekip lideri ile dolar. Altında 'Denetime aktif katılan denetçileri seçin (birden fazla seçilebilir).' notu vardır.
   - Roller: Formu açabilen herkes.

27. **Denetimi Yapan serbest metin (ekip üyesi yoksa)**  _[düşük · okur]_
   - Adımlar: Ekip üyesi ve lideri çözümlenemeyen (teamMemberOptions boş) bir planı aç, 'Denetimi Yapan' alanına bak ve elle isim yaz.
   - Beklenen: Açılır liste yerine 'İsim Soyisim' placeholder'lı düz metin kutusu çıkar ve yazılan değer doğrudan header.auditorName olur.
   - Roller: Formu açabilen herkes.

28. **Soruya 'İyi' verme ve puanın işlemesi**  _[düşük · okur]_
   - Adımlar: Herhangi bir adımda bir sorunun 'İyi' radyosunu işaretle.
   - Beklenen: O satırın 'Puan' hücresi sorunun tam maxScore'unu (örn. 2.50) gösterir; adım başlığındaki 'Adım Puanı' ve sağ üstteki 'Toplam Puan' anında artar; ilerleme çubuğu dolar. Detay modalı AÇILMAZ.
   - Roller: Formu açabilen herkes.

29. **'Orta'/'Kötü' seçince detay modalının otomatik açılması**  _[düşük · okur]_
   - Adımlar: Bir sorunun 'Orta' radyosunu işaretle. Sonra kapat, başka bir soruda 'Kötü' işaretle.
   - Beklenen: Her ikisinde de detay modalı kendiliğinden açılır; başlığı '<Adım kodu> - <soru metni>' olur, altında 'Orta / Kötü değerlendirmeler için detayları doldurun.' yazar. 'Tespit Edildiği Yer' kutusu plandan gelen lokasyonla ön-doludur. Satır puanı 'Orta'da yarım (1.25), 'Kötü'de 0.00 olur.
   - Roller: Formu açabilen herkes.

30. **Detay modalı — bulgu tipi seçimi**  _[düşük · okur]_
   - Adımlar: Detay modalında 'Bulgu Tipi (zorunlu)' listesini aç ve bir değer seç, modalı 'Tamam' ile kapat.
   - Beklenen: Soru satırındaki düğmenin yazısı 'Detay Gir'den 'Detayı Gör / Düzenle'ye döner. Liste five_s_finding_types tablosundan gelir; tablo boşsa/yüklenmediyse yalnızca 'Seçiniz' ve pasif 'Yükleniyor...' seçeneği görünür.
   - Roller: Formu açabilen herkes.

31. **Detay modalı — açıklama yazma**  _[düşük · okur]_
   - Adımlar: Detay modalında 'Açıklama (Orta/Kötü için zorunlu)' alanına metin yaz, 'Tamam' ile kapat, tekrar 'Detayı Gör / Düzenle' ile aç.
   - Beklenen: Yazılan metin korunmuş olarak geri gelir. Boş bırakılıp form kaydedilmeye çalışılırsa o satır kırmızıya boyanır ve '⚠ Yanıt Gerekli' rozeti çıkar.
   - Roller: Formu açabilen herkes.

32. **Detay modalı — fotoğraf ekleme ve silme**  _[düşük · okur]_
   - Adımlar: Detay modalında 'Fotoğraf(lar) Ekle'ye bas, iki resim seç; aynı iki resmi tekrar seç; sonra birinin 'Sil' düğmesine bas.
   - Beklenen: Önce 'Henüz fotoğraf eklenmedi.' yazar; iki seçimden sonra liste 2 satır ('1. ad', '2. ad'), tekrar aynı dosyalar seçilince yine 2 satır kalır; 'Sil' sonrası 1 satır kalır ve numaralar yeniden başlar.
   - Roller: Formu açabilen herkes.

33. **Detay modalı — alınacak faaliyet seçimi**  _[düşük · okur]_
   - Adımlar: Detay modalında 'Alınacak Faaliyet (zorunlu)' listesinden bir değer seç.
   - Beklenen: Seçim kutuda kalır; modal kapanıp açıldığında korunur. Liste five_s_actions tablosundan gelir; boşsa pasif 'Yükleniyor...' seçeneği görünür. Boş bırakılırsa 'Formu Kaydet' o soruyu eksik sayar.
   - Roller: Formu açabilen herkes.

34. **Detay modalı — termin tarihi**  _[orta · okur]_
   - Adımlar: Detay modalında 'Termin Tarihi (zorunlu)' alanını değiştir, 'Tamam', tekrar aç.
   - Beklenen: Seçilen tarih korunur. Hiç dokunulmazsa kutu denetimin tarihini gösterir ama state boş kalır; bu durumda 'Formu Kaydet' o soruyu eksik sayıp satırı kırmızıya boyar.
   - Roller: Formu açabilen herkes.

35. **Detay modalı — Tespit Edildiği Yer ve lokasyon önerileri**  _[düşük · okur]_
   - Adımlar: Detay modalında 'Tespit Edildiği Yer (zorunlu)' kutusuna tıkla ve bir harf yaz.
   - Beklenen: Tarayıcı datalist önerileri açılır; öneriler five_s_locations tablosundaki aktif lokasyon adlarının Türkçe alfabetik sıralı hâlidir. Kutu, modal açılırken planın lokasyonuyla ön-doludur ve serbest metin de kabul eder.
   - Roller: Formu açabilen herkes.

36. **Detay modalını kapatma (Kapat / Tamam / ✕)**  _[düşük · okur]_
   - Adımlar: Detay modalında bir alanı değiştir, sırayla 'Kapat', sonra tekrar açıp 'Tamam', sonra tekrar açıp sağ üstteki '✕' ile kapat.
   - Beklenen: Üç yol da modalı kapatır ve GİRİLEN VERİYİ AYNI ŞEKİLDE KORUR — 'Kapat' bir iptal değildir, hiçbiri değişikliği geri almaz.
   - Roller: Formu açabilen herkes.

37. **'Detaylar' sütununun koşullu görünmesi**  _[düşük · okur]_
   - Adımlar: Bir adımdaki tüm soruları 'İyi' işaretle ve tablonun başlıklarına bak; sonra o adımdaki tek bir soruyu 'Orta' yap ve tekrar bak.
   - Beklenen: Hepsi 'İyi' iken sütun başlıkları 'Madde / Soru / İyi-Orta-Kötü / Puan'dır. Bir soru Orta/Kötü olur olmaz araya 'Detaylar' sütunu eklenir ve yalnızca 'İyi' OLMAYAN satırlarda 'Detay Gir' düğmesi çıkar.
   - Roller: Formu açabilen herkes.

38. **Mobil akordeon aç/kapat**  _[düşük · okur]_
   - Adımlar: Tarayıcı penceresini md altına (<768px) daralt veya mobil cihazda aç; bir soru satırına bas, sonra tekrar bas.
   - Beklenen: Sağdaki etiket 'Aç' ↔ 'Kapat' arasında değişir, ok işareti döner; açıkken 'Değerlendirme' başlığı altında İyi/Orta/Kötü radyoları ve (İyi değilse) 'Detay Gir' düğmesi görünür. Kapalıyken satırda seçim etiketi ('İyi'/'Orta'/'Kötü'/'Seçilmedi') ve puan gösterilir. Masaüstü tablosu bu genişlikte hiç render edilmez.
   - Roller: Formu açabilen herkes.

39. **Adım puanı ve ilerleme çubuğu eşikleri**  _[düşük · okur]_
   - Adımlar: Bir adımdaki soruların hepsini 'Kötü', sonra hepsini 'Orta', sonra hepsini 'İyi' yap ve adım başlığındaki çubuğa bak.
   - Beklenen: Çubuk sırasıyla kırmızı (oran <0.5), amber (0.5–0.75) ve yeşil (≥0.75) olur; 'Adım Puanı: X / 20.00' değeri 0.00 → 10.00 → 20.00 diye ilerler. Soru maxScore toplamı adım maxScore'una eşit olmasa bile adım tavanı aşılmaz (ölçekleme).
   - Roller: Formu açabilen herkes.

40. **Toplam puan ve hedef göstergesi**  _[düşük · okur]_
   - Adımlar: Soruları, toplam 75'in altında kalacak şekilde işaretle; sonra yeterince 'İyi' ekleyerek 75'i geç.
   - Beklenen: Sağ üstteki 'Toplam Puan' sayısı amber renkte ve altında 'Hedef altında' yazarken, 75'e ulaşınca yeşile döner ve 'Hedef üstü' yazar. 'Değerlendirme Özeti' tablosundaki beş adım puanının toplamı 'Toplam (100)' satırıyla birebir aynı olmalı.
   - Roller: Formu açabilen herkes.

41. **Açık bulgu rozeti**  _[düşük · okur]_
   - Adımlar: Bu lokasyonda status='open' ve question_id'si S1-Q1 olan bir five_s_findings satırı varken formu aç, S1-Q1 satırına bak.
   - Beklenen: Soru metninin yanında amber '⚠ Açık bulgu (1)' rozeti çıkar; üstüne gelince 'Bu soruya bağlı henüz kapanmamış bulgu var' ipucu görünür. Aynı soruda iki açık bulgu varsa sayı (2) olur. question_id boş ama description'ında 'Soru ID: S1-Q1' veya 'Bağlı Soru: S1-Q1' geçen bulgular da sayılmalı.
   - Roller: Formu açabilen herkes.

42. **Açık bulguya 'İyi' verince onay diyaloğu**  _[orta · okur]_
   - Adımlar: Açık bulgu rozeti taşıyan bir soruyu 'İyi' işaretle, diğer tüm soruları eksiksiz doldur, 'Formu Kaydet'e bas. Önce 'Vazgeç', sonra tekrar deneyip 'Yine de kaydet' seç.
   - Beklenen: Kırmızı tonlu onay penceresi açılır: başlık 'Kapanmamış bulgu varken "İyi" seçildi', metin 'Aşağıdaki sorularda henüz kapanmamış bulgular var. Yine de denetimi bu haliyle kaydetmek istiyor musunuz?' ve altında soru id'leriyle madde listesi; düğmeler 'Vazgeç' ve 'Yine de kaydet'. 'Vazgeç'te hiçbir kayıt oluşmaz, 'Yine de kaydet'te normal kaydetme akışı devam eder.
   - Roller: Formu açabilen herkes.

43. **Eksik yanıt uyarısı ve kaydet düğmesinin kilitlenmesi**  _[orta · okur]_
   - Adımlar: Birkaç soruyu boş bırakarak 'Formu Kaydet'e bas. Sonra eksikleri tek tek tamamlarken düğmeye ve sayaca bak.
   - Beklenen: Eksik satırlar kırmızı zemin + sol kırmızı çizgi alır, soru metninin yanında '⚠ Yanıt Gerekli' rozeti çıkar; düğmenin üstünde 'N soru yanıt bekliyor — form kaydedilemez.' yazar; 'Formu Kaydet' grileşip devre dışı kalır ve üzerinde kırmızı N rozeti taşır, üstüne gelince 'N soru yanıtlanmadan form kaydedilemez.' ipucu çıkar. Eksikler kapandıkça N azalır, sıfırlanınca düğme tekrar mavi ve tıklanabilir olur. İLK denemeden ÖNCE düğme eksikler varken bile aktiftir.
   - Roller: Formu açabilen herkes.

44. **Formu Kaydet — başlık doğrulaması**  _[düşük · okur]_
   - Adımlar: 'Denetimi Yapan' seçimini tamamen boşalt (çoklu listede tüm kişilerin işaretini kaldır) ve 'Formu Kaydet'e bas.
   - Beklenen: Kırmızı toast: 'Denetimi Yapan alanı zorunludur.' Hiçbir soru kırmızıya boyanmaz, kayıt başlamaz. Ekip/Lokasyon/Tarih plandan geldiği için boş olamaz; boş olsaydı toast 'Ekip, Lokasyon ve Tarih alanları plan üzerinden otomatik gelmelidir.' olurdu.
   - Roller: Formu açabilen herkes.

45. **Formu Kaydet — tam akış (Orta/Kötü bulgularla)**  _[YÜKSEK · yazar]_
   - Adımlar: Bir plana git; en az bir soruya 'Kötü' verip detay modalında bulgu tipi, açıklama, alınacak faaliyet, termin ve tespit yeri gir, bir fotoğraf ekle; kalan tüm soruları 'İyi' yap; 'Denetimi Yapan' seç; 'Formu Kaydet'.
   - Beklenen: Yeşil toast 'Denetim başarıyla kaydedildi.' ardından tarayıcı ana sayfaya ('/') gider. DB: five_s_audits'e department_name/auditor_name/audit_date, total_score, target_score='75.00', score_s1..s5 ve plan_id/location_id/auditor_id dolu bir satır; YANITLANAN HER SORU için five_s_audit_answers'a rating/explanation/finding_type/has_open_finding/answered_at satırı; her 'İyi olmayan + bulgu tipi dolu' yanıt için five_s_findings'e status='open' satır (fotoğraf /files/'a yüklenip photo_before_files'a yazılır); five_s_audit_plans satırı status='completed', audit_id=yeni audit, auditor_attended=true olur. Aynı plan artık 'Denetim Seç' listesinde ÇIKMAMALI.
   - Roller: Formu açabilen herkes; plana atanmış ekip üyesi veya canOpenAnyPlan yetkilisi.

46. **Formu Kaydet — hepsi 'İyi' akışı**  _[YÜKSEK · yazar]_
   - Adımlar: Tüm soruları 'İyi' işaretle, 'Denetimi Yapan' seç, 'Formu Kaydet'.
   - Beklenen: Aynı başarı toast'ı ve '/' yönlendirmesi olur; five_s_audits ve five_s_audit_answers satırları yazılır ama five_s_findings'e HİÇ yeni satır eklenmez; plan yine 'completed' olur.
   - Roller: Formu açabilen herkes.

47. **Saha sorumlusunun katılım damgası**  _[YÜKSEK · yazar]_
   - Adımlar: Lokasyonun field_manager_user_ids ilk kaydındaki kişinin adını 'Denetimi Yapan' listesinde İŞARETLE ve formu kaydet. Sonra başka bir plan için o kişiyi işaretlemeden kaydet.
   - Beklenen: İlk durumda five_s_audit_plans satırında field_manager_attended=true, ikincisinde false olur. Lokasyona hiç saha sorumlusu tanımlı değilse bu kolon hiç gönderilmez (null kalır).
   - Roller: Formu kaydedebilen herkes.

48. **Soru yanıtı yazımı hatası uyarısı**  _[orta · yazar]_
   - Adımlar: five_s_audit_answers yazımını başarısız kıl (örn. DevTools ile /fiveSAuditAnswers POST isteklerini blokla) ve formu kaydet.
   - Beklenen: Kırmızı toast: '<N> soru yanıtı kaydedilemedi. Denetim kaydedildi, ayrıntı için yöneticinize bildirin.' Buna rağmen denetim ve bulgular kaydedilir, plan completed olur ve ana sayfaya yönlendirme yine yapılır — yani kısmi kayıt akışı durdurmaz.
   - Roller: Formu kaydedebilen herkes.

49. **Formu Kaydet — çevrimdışı kuyruğa alma**  _[orta · yazar]_
   - Adımlar: Formu eksiksiz doldur, DevTools'tan ağı Offline yap (başlıkta 'Durum: Offline' yazmalı), 'Formu Kaydet'e bas.
   - Beklenen: Toast: 'İnternet yok veya kayıt hatası oluştu. Form offline kuyruğa eklendi. İnternet gelince otomatik senkronlanır.' Özet bölümünde 'Form offline kuyruğa alındı (internet gelince gönderilecek).' satırı çıkar; başlıkta '• Kuyruk: 1' ve 'Senkronla' düğmesi belirir. Sunucuda five_s_audits satırı YOKTUR; plan hâlâ 'planned' kalır.
   - Roller: Formu açabilen herkes.

50. **Kuyruğu elle senkronlama**  _[YÜKSEK · yazar]_
   - Adımlar: Kuyrukta bekleyen bir gönderim varken ağı tekrar Online yap, 'Senkronla (1)' düğmesine bas. Ayrıca Offline'ken düğmeye basmayı dene.
   - Beklenen: Offline'ken düğme soluk ve tıklanamaz, üstüne gelince 'Offline iken senkron yapılamaz' ipucu çıkar. Online'da düğmenin yazısı 'Senkron...' olur, iş bitince Kuyruk sayacı 0'a düşer ve düğme kaybolur; sunucuda five_s_audits + five_s_findings satırları ve yüklenmiş fotoğraflar oluşur.
   - Roller: Herkes.

51. **Online olunca otomatik senkron**  _[YÜKSEK · yazar]_
   - Adımlar: Offline'ken bir gönderim kuyruğa al, sonra ağı Online'a çevir ve hiçbir düğmeye BASMA.
   - Beklenen: Kuyruk sayacı kendiliğinden 0'a iner ve 'Senkronla' düğmesi kaybolur; sunucuda ilgili five_s_audits/five_s_findings satırları görünür. 'Durum:' etiketi de Offline'dan Online'a döner.
   - Roller: Herkes.

52. **Temizle**  _[YÜKSEK · yazar]_
   - Adımlar: Birkaç soruyu işaretle, detay modallarını doldur, sonra 'Temizle' düğmesine bas.
   - Beklenen: Tüm İyi/Orta/Kötü seçimleri kalkar, her satırın puanı '-' olur, 'Toplam Puan' 0.00'a düşer, mobil akordeonlar kapanır. Ayrıca hem IndexedDB taslağı hem SUNUCUDAKİ five_s_audit_drafts satırı SİLİNİR (DELETE /fiveSAuditDrafts/:id) — onay sorulmaz, geri alınamaz.
   - Roller: Formu açabilen herkes.

53. **Taslağın otomatik kaydedilmesi**  _[orta · yazar]_
   - Adımlar: Bir planı aç, iki soruyu işaretle ve ~1 saniye bekle (yazma 800 ms geciktirmeli).
   - Beklenen: five_s_audit_drafts tablosunda o plan_id için bir satır oluşur; header JSON'unda ekip/lokasyon/denetçi/tarih, answers JSON'unda soru id'si → rating/explanation/findingType/actionToTake/dueDate/locationName bulunur; updated_by_user_id ve updated_by_name dolar. Sonraki değişikliklerde AYNI satır güncellenir, yeni satır açılmaz. Fotoğraflar taslağa YAZILMAZ.
   - Roller: Formu açabilen herkes.

54. **Taslağın başka cihazdan devralınması**  _[orta · okur]_
   - Adımlar: A cihazında bir planı açıp birkaç soru işaretle ve bekle; sonra AYNI ekipten başka bir kullanıcıyla B cihazında/tarayıcısında aynı planı aç.
   - Beklenen: B tarafında sorular A'daki seçimlerle dolu gelir (rating, açıklama, bulgu tipi, faaliyet, termin, tespit yeri); 'Toplam Puan' A'daki değerle aynıdır. Fotoğraflar taşınmaz. Sunucu taslağı yoksa yerel IndexedDB taslağına düşülür.
   - Roller: Aynı planı açabilen herkes — five_s_audit_drafts okuması yalnızca plan_id ile filtreleniyor, ekip kontrolü YOK.

55. **Kaydettikten sonra taslağın silinmesi**  _[YÜKSEK · yazar]_
   - Adımlar: Taslağı olan bir formu eksiksiz doldurup 'Formu Kaydet' ile gönder, sonra aynı planın taslak satırını sorgula.
   - Beklenen: five_s_audit_drafts'ta o plan_id'ye ait satır kalmaz (DELETE atılır) ve yerel IndexedDB drafts kaydı da silinir; çevrimdışı kuyruğa alma yolunda da aynı temizlik yapılır.
   - Roller: Formu kaydedebilen herkes.

56. **Çevrimdışı/çevrimiçi rozeti**  _[düşük · okur]_
   - Adımlar: Form açıkken DevTools ağ ayarını Offline ↔ Online arasında değiştir ve başlıktaki 'Durum:' satırına bak.
   - Beklenen: Etiket sayfa yenilenmeden 'Online' (yeşil) ↔ 'Offline' (amber) arasında değişir. Aynı gösterge tekil bulgu modalında ve 'plan yok' ekranında da bulunur.
   - Roller: Herkes.

57. **Soru/adım listesinin veritabanından gelmesi**  _[düşük · okur]_
   - Adımlar: five_s_questions ve five_s_steps tablolarında kayıt varken formu aç; sonra bu tabloları boşalt (veya isteklerini blokla) ve formu yeniden aç.
   - Beklenen: Tablolar doluyken adım başlıkları, soru metinleri, sıraları ve maksimum puanlar DB'den gelir. Tablolar boş/erişilemez olduğunda ekran hata vermez, constants.ts'teki sabit 5 adım ve 37 soruyla ('1 - Sınıflandırma (Ayıklama)' ... '5 - Sürdürme') çizilir.
   - Roller: Herkes.

58. **Tekil bulgu modalının ana formun denetçisini değiştirmesi**  _[orta · okur]_
   - Adımlar: Tam form açıkken 'Denetimi Yapan' listesinden iki kişi seç; sonra 'Tekil Bulgu +' aç, modaldaki 'Denetimi Yapan' kutusunu tek bir isimle değiştir, 'İptal' ile kapat ve ana formdaki alana bak.
   - Beklenen: Ana formdaki 'Denetimi Yapan' seçimi de modalda yazılan değere düşer — modal ayrı bir alan değil, aynı header.auditorName state'ini yazar; 'İptal' bunu geri almaz. Çoklu seçim kutusu artık yalnızca modalda yazılan isimleri işaretli gösterir.
   - Roller: 'Tekil Bulgu +' düğmesini gören roller (manager / auditor / content manager core team).


## Ana Veri Yönetimi — /ana-veri-yonetimi (4 sekme: Veri Girişi, Denetim Planlama, Denetim Ekipleri, Sorular)  (71 senaryo)

1. **Ekrana erişim — yetkili rol**  _[YÜKSEK · okur]_
   - Adımlar: Üst menüde "Sistem" kategorisini aç, "Ana Veri Yönetimi" tıkla (veya adres çubuğuna /ana-veri-yonetimi yaz). Sırayla: super admin, godmin, manager ve adında hem "content manager" hem "core team" geçen rol ile dene.
   - Beklenen: Sayfa açılır: başlık "Ana Veri Yönetimi", alt yazı "Veriler yönetimi." ve dört sekme "Veri Girişi / Denetim Planlama / Denetim Ekipleri / Sorular" görünür. Varsayılan sekme Veri Girişi.
   - Roller: super admin, godmin, manager, "content manager … core team"

2. **Ekrana erişim reddi — yetkisiz rol**  _[YÜKSEK · okur]_
   - Adımlar: Yalnızca Denetçi (auditor) veya basic rolüyle giriş yap, adres çubuğuna /ana-veri-yonetimi yaz ve Enter'a bas.
   - Beklenen: Sayfa hiç boyanmaz (null render) ve tarayıcı ana sayfaya (/) yönlendirilir; sekmelerin tek bir karesi bile görünmez. Menüde "Ana Veri Yönetimi" satırı da yoktur.
   - Roller: Reddedilen: auditor/denetçi, field manager, basic — routeAccess "master-data" kuralına uymayan herkes

3. **Sekme değiştirme**  _[düşük · okur]_
   - Adımlar: Sağ üstteki sekme şeridinde sırayla "Veri Girişi", "Denetim Planlama", "Denetim Ekipleri", "Sorular" butonlarına tıkla.
   - Beklenen: Tıklanan sekme mavi (bg-sky-500) olur, gövde o sekmenin paneline değişir: Veri Girişi=3 kart, Denetim Planlama="Dönem Planları (Ana Planlar)"+"Denetim Planları", Denetim Ekipleri="Yeni Takım Oluştur"+"Tanımlı Ekipler", Sorular="Soru Listesi".
   - Roller: Sayfaya girebilen herkes

4. **Sekme değişiminde kullanıcı listesinin yeniden çekilmesi**  _[düşük · okur]_
   - Adımlar: Ağ sekmesini aç, sekmeler arasında ileri geri geç.
   - Beklenen: Her sekme değişiminde GET /users (page=1, limit=500) çağrısı yeniden atılır; Müdür / Lider / Denetçi açılır listeleri "Yükleniyor..." gösterip sonra dolar.
   - Roller: Sayfaya girebilen herkes

5. **Veri Girişi ilk yükleme**  _[düşük · okur]_
   - Adımlar: Sayfayı yenile (F5) ve Veri Girişi sekmesinde kal.
   - Beklenen: Üç kart da dolar: "Bulgudan Alınacak Aksiyonlar" (five_s_actions), "Bulgu Tipleri" (five_s_finding_types), "Lokasyonlar" (five_s_locations). Her biri created_at DESC sıralı, limit 200. Kayıt yoksa "Kayıt yok." yazar.
   - Roller: Sayfaya girebilen herkes; arka uçta get.five_s_actions / get.five_s_finding_types / get.five_s_locations claim'i gerekir

6. **Plan okuma hatası görünür oluyor**  _[düşük · okur]_
   - Adımlar: Denetim Planlama sekmesine geç; GET /fiveSAuditPlans çağrısını (DevTools "Block request URL" veya claim'i geri alarak) düşür.
   - Beklenen: Kırmızı toast: "Denetim planları yüklenirken bir hata oluştu." Liste boş kalır ama boşluk artık hatadan ayırt edilebilir.
   - Roller: Sayfaya girebilen herkes

7. **Yeni aksiyon ekle**  _[orta · yazar]_
   - Adımlar: Veri Girişi → "Bulgudan Alınacak Aksiyonlar" kartında "Yeni Ekle"ye bas. Açılan "Yeni Kayıt" modalinde "İsim" alanına örn. "Boyanmalı TEST" yaz, "Kaydet"e bas.
   - Beklenen: Modal kapanır, satır listenin EN ÜSTÜNE yeşil yazıyla eklenir. five_s_actions tablosunda name='Boyanmalı TEST', is_active=true yeni satır; audit_logs'ta CREATE kaydı.
   - Roller: Sayfaya girebilen herkes; arka uçta post.five_s_actions claim'i (godmin atlar)

8. **Aksiyon — aynı isimle ekleme engeli**  _[düşük · okur]_
   - Adımlar: Listedeki mevcut bir aksiyonun adını birebir (veya sadece büyük/küçük harf ve fazladan boşluk farkıyla) yazıp "Kaydet"e bas.
   - Beklenen: Modal KAPANMAZ, altta kırmızı kutuda "Bu isim zaten var." yazar, hiçbir istek atılmaz, listeye satır eklenmez.
   - Roller: Sayfaya girebilen herkes

9. **Aksiyon — boş/boşluk isimle Kaydet kapalı**  _[düşük · okur]_
   - Adımlar: "Yeni Ekle" → İsim alanını boş bırak, sonra sadece boşluk karakteri yaz.
   - Beklenen: "Kaydet" butonu soluk ve tıklanamaz (disabled, opacity-50) kalır. Not: kodda "İsim zorunlu." hata metni var ama bu disabled yüzünden hiç görünmez.
   - Roller: Sayfaya girebilen herkes

10. **Kayıt modalini kapatmanın üç yolu**  _[düşük · okur]_
   - Adımlar: "Yeni Ekle" ile modali aç, İsim'e bir şey yaz. (a) "Vazgeç"e bas. Tekrar aç, (b) sağ üstteki ✕'e bas. Tekrar aç, (c) Escape tuşuna bas.
   - Beklenen: Üçünde de modal kapanır ve hiçbir kayıt oluşmaz. Modali yeniden açtığında İsim alanı boştur (openCreate state'i sıfırlar).
   - Roller: Sayfaya girebilen herkes

11. **Aksiyon düzenle — isim değiştir**  _[orta · yazar]_
   - Adımlar: Bir aksiyon satırında kalem (Düzenle) ikonuna bas. "Kaydı Düzenle" modalinde İsim'i değiştir, "Kaydet"e bas.
   - Beklenen: Modal kapanır, satırdaki metin yerinde güncellenir (satır yeri değişmez). five_s_actions satırında name yeni değer; audit_logs'ta UPDATE kaydı old_values ile.
   - Roller: Sayfaya girebilen herkes; put.five_s_actions claim'i

12. **Aksiyonu pasife alma**  _[orta · yazar]_
   - Adımlar: Kalem ikonu → modalde "Aktiflik" açılır listesinden "Pasif"i seç → "Kaydet".
   - Beklenen: Satır adı kırmızımsı ve ÜSTÜ ÇİZİLİ olur, yanında "(Pasif)" rozeti çıkar, üzerine gelince tooltip "Pasif". five_s_actions.is_active=false. "Aktiflik" alanı yalnız düzenleme modunda görünür, yeni kayıtta yoktur.
   - Roller: Sayfaya girebilen herkes; put.five_s_actions

13. **Aksiyon sil — onayla**  _[YÜKSEK · yazar]_
   - Adımlar: Bir aksiyon satırında çöp kutusu ikonuna bas. Açılan kırmızı onay penceresini oku, "Sil"e bas.
   - Beklenen: Onay penceresi başlığı "Kaydı sil", metni: "<isim>" kalıcı olarak silinecek. Bu işlem geri alınamaz. "Sil"den sonra satır listeden kaybolur; five_s_actions'tan satır silinir; audit_logs'ta DELETE + old_values tam önimge.
   - Roller: Sayfaya girebilen herkes; delete.five_s_actions

14. **Aksiyon sil — vazgeç**  _[düşük · okur]_
   - Adımlar: Çöp kutusu ikonuna bas, açılan pencerede "Vazgeç"e bas (veya Escape'e bas, ya da pencerenin dışındaki karartıya tıkla).
   - Beklenen: Üç yolda da satır listede kalır, hiçbir DELETE isteği atılmaz.
   - Roller: Sayfaya girebilen herkes

15. **Aksiyon arama filtresi**  _[düşük · okur]_
   - Adımlar: "Bulgudan Alınacak Aksiyonlar" kartındaki "Ara (isim)" kutusuna bir kelime parçası yaz; sonra hiçbir kayda uymayan bir metin yaz; sonra kutuyu temizle.
   - Beklenen: Liste anında istemcide daralır (fazladan boşluklar yok sayılır, büyük/küçük harf duyarsız). Eşleşme yoksa "Kayıt yok." görünür. Kutu temizlenince tam liste döner. Arama sunucuya gitmez.
   - Roller: Sayfaya girebilen herkes

16. **Aksiyon listesi boş durumu ve efsane**  _[düşük · okur]_
   - Adımlar: Tüm aksiyonlar silinmişken (veya arama hiçbir şey bulmazken) karta bak.
   - Beklenen: Tablo gövdesinde ortalanmış "Kayıt yok." yazar. Tablonun altında her zaman "● Aktif  ● Pasif" renk efsanesi durur.
   - Roller: Sayfaya girebilen herkes

17. **Bulgu Tipi ekle / düzenle / pasife al / sil**  _[YÜKSEK · yazar]_
   - Adımlar: "Bulgu Tipleri" kartında sırasıyla: "Yeni Ekle" → İsim yaz → "Kaydet"; kalem ikonu → İsim değiştir + "Aktiflik"=Pasif → "Kaydet"; çöp ikonu → "Sil".
   - Beklenen: Aynı üç davranış ama BAŞKA tabloya yazar: five_s_finding_types. Aksiyon kartındaki satırlar etkilenmez. Aynı isim kontrolü de yalnız bu kartın listesine bakar (iki kartta aynı isim serbest).
   - Roller: Sayfaya girebilen herkes; post/put/delete.five_s_finding_types

18. **Yazma hatası artık sessiz değil**  _[düşük · okur]_
   - Adımlar: DevTools'ta POST /fiveSActions isteğini engelle (veya claim'i geri al), "Yeni Ekle" → İsim yaz → "Kaydet".
   - Beklenen: Kırmızı toast: "Kayıt eklenemedi. Lütfen tekrar deneyin." Modal yine de kapanır ve yazılan isim kaybolur; listeye satır eklenmez. Aynı toast metni lokasyon ekleme ve düzenleme hatalarında da çıkar.
   - Roller: Sayfaya girebilen herkes

19. **Silme hatası yanlış metinle bildiriliyor**  _[düşük · okur]_
   - Adımlar: DELETE /fiveSActions/:id isteğini engelle, bir satırda çöp ikonu → "Sil".
   - Beklenen: Toast "Kayıt güncellenemedi. Lütfen tekrar deneyin." çıkar — silme başarısızken GÜNCELLEME metni gösteriliyor. Satır listede kalır.
   - Roller: Sayfaya girebilen herkes

20. **Yeni lokasyon ekle (müdürsüz)**  _[orta · yazar]_
   - Adımlar: "Lokasyonlar" kartında "Yeni Ekle" → "Yeni Lokasyon" modalinde "İsim *" alanına örn. "Depo TEST" yaz, Müdür ve Saha Sorumlusu'na dokunma, "Kaydet".
   - Beklenen: Satır listenin başına gelir; "Müdür" ve "Saha Sorumlusu" sütunlarında "-" yazar. five_s_locations'ta name='Depo TEST', is_active=true, manager_user_id=null, field_manager_user_ids=[]. Yeni kayıt modalinde "Aktiflik" alanı YOKTUR (her zaman aktif oluşturulur).
   - Roller: Sayfaya girebilen herkes; post.five_s_locations

21. **Lokasyona müdür atama**  _[orta · yazar]_
   - Adımlar: "Yeni Ekle" (veya kalem ikonu) → "Müdür" açılır listesini aç, bir isim seç, "Kaydet".
   - Beklenen: Açılır listede yalnızca rolü tam olarak "Manager" olan kullanıcılar vardır; ilk seçenek "Seçiniz (opsiyonel)" (kullanıcılar yüklenirken "Yükleniyor..."). Kaydettikten sonra satırın Müdür sütununda kullanıcının adı görünür; five_s_locations.manager_user_id dolar.
   - Roller: Sayfaya girebilen herkes; post/put.five_s_locations

22. **Saha sorumlusu çoklu seçim**  _[orta · yazar]_
   - Adımlar: Lokasyon modalinde "Saha Sorumlusu" kutusuna tıklayarak listeyi aç, iki kişiyi işaretle, birine tekrar tıklayıp işareti kaldır, "Kaydet".
   - Beklenen: Açılır listede yalnız rolü "Field Manager" olanlar listelenir; seçilen satır yeşile döner ve solundaki kare ✓ ile dolar. Kutunun etiketi seçilenlerin adlarını virgülle birleştirir; altında yeşil çipler belirir. Kayıttan sonra satırın "Saha Sorumlusu" sütununda isimler virgüllü görünür; five_s_locations.field_manager_user_ids jsonb dizisi güncellenir.
   - Roller: Sayfaya girebilen herkes; post/put.five_s_locations

23. **Saha sorumlusu listesi dışarı tıklayınca kapanır**  _[düşük · okur]_
   - Adımlar: Saha Sorumlusu listesini aç, modalin boş bir yerine (listenin dışına) tıkla.
   - Beklenen: Liste kapanır (ok işareti yukarıdan aşağıya döner), seçimler korunur, modal kapanmaz.
   - Roller: Sayfaya girebilen herkes

24. **Saha sorumlusunu çipten çıkarma**  _[orta · yazar]_
   - Adımlar: En az iki saha sorumlusu seçili haldeyken, kutunun altındaki yeşil çiplerden birindeki "×"e tıkla, "Kaydet".
   - Beklenen: Çip kaybolur, kutu etiketi kalan isimlere düşer. Kayıttan sonra satırın Saha Sorumlusu sütununda o isim yoktur; field_manager_user_ids dizisinden çıkarılmıştır.
   - Roller: Sayfaya girebilen herkes; put.five_s_locations

25. **Field Manager rolünde kimse yokken**  _[düşük · okur]_
   - Adımlar: Sistemde "Field Manager" rolünde hiç kullanıcı yokken (veya GET /users rolleri döndürmezken) lokasyon modalinde Saha Sorumlusu listesini aç.
   - Beklenen: Liste yerine gri metin: "Field Manager rolünde kullanıcı yok." Seçim yapılamaz.
   - Roller: Sayfaya girebilen herkes

26. **Lokasyonu pasife alma planlamayı etkiler**  _[orta · yazar]_
   - Adımlar: Bir lokasyonda kalem ikonu → "Aktiflik"=Pasif → "Kaydet". Sonra "Denetim Planlama" sekmesine geç ve "Lokasyon" açılır listesini aç.
   - Beklenen: Lokasyonlar kartında satır üstü çizili + "(Pasif)". Denetim Planlama'daki "Lokasyon" açılır listesinde o lokasyon ARTIK YOKTUR (yalnız aktifler listelenir). Mevcut planların satırlarında adı yine görünmeye devam eder.
   - Roller: Sayfaya girebilen herkes; put.five_s_locations

27. **Lokasyon sil**  _[YÜKSEK · yazar]_
   - Adımlar: Lokasyon satırında çöp kutusu ikonuna bas, onay penceresinde "Sil"e bas.
   - Beklenen: Onay metni: "<lokasyon adı>" kalıcı olarak silinecek. Bu işlem geri alınamaz. Satır kaybolur; five_s_locations'tan silinir. UYARI: bu lokasyona bağlı five_s_audit_plans satırları kalır ve planlama listesinde Lokasyon sütunu "-" gösterir.
   - Roller: Sayfaya girebilen herkes; delete.five_s_locations

28. **Lokasyon arama ve aynı isim engeli**  _[düşük · okur]_
   - Adımlar: Lokasyonlar kartındaki "Ara (isim)" kutusuna yaz; sonra "Yeni Ekle" ile mevcut bir lokasyon adını tekrar yazıp "Kaydet"e bas.
   - Beklenen: Arama listeyi istemcide daraltır, eşleşme yoksa "Kayıt yok.". Aynı isimde: modal kapanmaz, kırmızı kutuda "Bu isim zaten var.", istek atılmaz.
   - Roller: Sayfaya girebilen herkes

29. **Dönem planı formunu aç/kapat**  _[düşük · okur]_
   - Adımlar: Denetim Planlama sekmesinde sağ üstteki "+ Yeni Dönem" butonuna bas, sonra aynı butona tekrar bas.
   - Beklenen: İlk basışta form açılır (Quarter, Başlangıç Tarihi, Bitiş Tarihi, Başlık) ve butonun yazısı "İptal"e döner; ikinci basışta form kapanır ve yazı "+ Yeni Dönem"e döner. Kapatma alanları TEMİZLEMEZ (yazdığın quarter tekrar açınca durur — yalnız başarılı kayıt temizler).
   - Roller: Sayfaya girebilen herkes

30. **Dönem planı (ana plan) oluştur**  _[orta · yazar]_
   - Adımlar: "+ Yeni Dönem" → Quarter'a "2026-Q1", Başlangıç Tarihi'ne 01.01.2026, Bitiş Tarihi'ne 31.03.2026, Başlık'a "Q1 2026 TEST" yaz → "Dönem Planı Oluştur".
   - Beklenen: Yeşil toast: "Denetim planı başarıyla oluşturuldu." Form kapanır ve alanlar temizlenir. Listede yeni satır: mor "2026-Q1" rozeti, altında "2026-01-01 – 2026-03-31", sağda "0 denetim planı" ve "Planlandı" rozeti. five_s_audit_plans'ta quarter/date_range_start/date_range_end dolu, location_id ve assigned_team_id NULL olan satır.
   - Roller: Sayfaya girebilen herkes; post.five_s_audit_plans

31. **Dönem planı — bitiş tarihi başlangıçtan önce**  _[düşük · okur]_
   - Adımlar: "+ Yeni Dönem" → Quarter yaz, Başlangıç 31.03.2026, Bitiş 01.01.2026 seç.
   - Beklenen: Formun altında kırmızı satır: "⚠ Bitiş tarihi başlangıçtan önce olamaz." ve "Dönem Planı Oluştur" butonu soluk/tıklanamaz kalır. Quarter, Başlangıç veya Bitiş'ten biri boşken de buton kapalıdır (Başlık boş olabilir).
   - Roller: Sayfaya girebilen herkes

32. **Dönem satırını genişlet/daralt**  _[düşük · okur]_
   - Adımlar: Bir dönem planı satırına tıkla. Sonra klavyeyle Tab ile satıra odaklan ve Enter'a, ardından boşluk tuşuna bas.
   - Beklenen: Sol taraftaki ok 90° döner ve satırın altında bağlı denetim planları tablosu açılır ("Tarih / Lokasyon / Ekip / Saha Sorumlusu / Durum / İşlem"). Enter ve boşluk da aynı açıp kapamayı yapar; sayfa kaymaz. Bağlı plan yoksa "Bu döneme bağlı denetim planı yok."
   - Roller: Sayfaya girebilen herkes

33. **Dönem planı sil — ONAY YOK**  _[YÜKSEK · yazar]_
   - Adımlar: Bir dönem planı satırının sağındaki "Sil" butonuna TEK tıkla.
   - Beklenen: Hiç onay sorulmadan satır anında kaybolur ve five_s_audit_plans'tan silinir. Alt planlar SİLİNMEZ ama yetim kalır: parent_plan_id'leri artık olmayan bir satırı gösterdiği için ne dönem ağacında ne de "Dönemsiz Planlar" bölümünde görünürler — ekrandan tamamen kaybolurlar. (Ana veri kartlarındaki silme onay sorar, bu sormaz.)
   - Roller: Sayfaya girebilen herkes; delete.five_s_audit_plans

34. **Denetim planı oluştur — döneme bağlı**  _[orta · yazar]_
   - Adımlar: "Denetim Planları" bölümünde "Dönem Planı (opsiyonel)" listesinden bir dönem seç, "Denetim Tarihi"ne dönem aralığı İÇİNDE bir tarih seç, "Lokasyon" ve "Atanan Ekip" seç, "Denetim Planı Oluştur"a bas.
   - Beklenen: Yeşil toast "Denetim planı başarıyla oluşturuldu.", form alanları temizlenir. Seçilen dönem satırındaki sayaç "N denetim planı" bir artar; dönemi genişletince yeni satır orada görünür. five_s_audit_plans'ta planned_date/location_id/assigned_team_id/parent_plan_id dolu, status='planned' satır.
   - Roller: Sayfaya girebilen herkes; post.five_s_audit_plans

35. **Denetim planı oluştur — dönemsiz**  _[orta · yazar]_
   - Adımlar: "Dönem Planı" listesini "— Bağlı dönem yok —" olarak bırak, Tarih + Lokasyon + Atanan Ekip seç, "Denetim Planı Oluştur".
   - Beklenen: Formun altında "Dönemsiz Planlar" başlıklı tablo belirir (daha önce hiç dönemsiz plan yoksa bu bölüm hiç görünmüyordu) ve yeni satır orada listelenir. parent_plan_id NULL.
   - Roller: Sayfaya girebilen herkes; post.five_s_audit_plans

36. **Plan formu zorunlu alanlar**  _[düşük · okur]_
   - Adımlar: "Denetim Planı Oluştur" butonunu; (a) hiçbir alan doluyken değil, (b) yalnız tarih doluyken, (c) tarih+lokasyon doluyken dene.
   - Beklenen: Üç durumda da buton soluk ve tıklanamaz. Ancak Tarih + Lokasyon + Atanan Ekip üçü birden dolduğunda etkinleşir (Not ve Dönem Planı zorunlu değil).
   - Roller: Sayfaya girebilen herkes

37. **Tarih dönem aralığının dışında**  _[düşük · okur]_
   - Adımlar: "Dönem Planı" listesinden aralığı 01.01–31.03 olan bir dönemi seç, "Denetim Tarihi"ne 15.05 gibi aralık DIŞI bir tarih seç.
   - Beklenen: Tarih kutusunun altında gri satır "Dönem aralığı: 2026-01-01 – 2026-03-31", altında kırmızı "⚠ Tarih dönem aralığı dışında"; kutunun kenarlığı kırmızıya döner ve "Denetim Planı Oluştur" butonu kapanır. Tarihi aralığa çekince uyarı kaybolur ve buton açılır.
   - Roller: Sayfaya girebilen herkes

38. **"Not" alanı yazılıyor ama hiç kaydedilmiyor**  _[orta · okur]_
   - Adımlar: Plan formunda Tarih + Lokasyon + Ekip seç, "Not" alanına "NOT TESTI" yaz, "Denetim Planı Oluştur"a bas. Sonra sayfayı yenile ve oluşan satıra bak.
   - Beklenen: Toast başarı der ve satır oluşur, ama satırın altında "Not: NOT TESTI" satırı HİÇ ÇIKMAZ. Sayfa açan kod not'u isteğe koymuyor ve five_s_audit_plans tablosunda note/remarks diye bir kolon da yok — yazılan not sessizce atılıyor.
   - Roller: Sayfaya girebilen herkes

39. **Çakışma uyarısı — ekip aynı gün başka denetimde**  _[düşük · okur]_
   - Adımlar: Önce A ekibi + X lokasyonu + 10.02.2026 ile bir plan oluştur. Sonra formda yine 10.02.2026 tarihini, A ekibini ve BAŞKA bir lokasyonu seç.
   - Beklenen: Form ile buton arasında sarı kutu: başlığı "⚠ Çakışma Uyarısı", içinde: "A" ekibi bu tarihte "X" denetiminde görevli. Uyarı ENGELLEMEZ — "Denetim Planı Oluştur" hâlâ basılabilir ve çakışan plan yine oluşur.
   - Roller: Sayfaya girebilen herkes

40. **Çakışma uyarısı — ekip lideri**  _[düşük · okur]_
   - Adımlar: Denetim Ekipleri sekmesinde aynı kişiyi lider yapan iki ekip (A ve B) oluştur. Planlamada A ekibiyle 12.02.2026'ya bir plan kur; sonra formda 12.02.2026 + B ekibi + başka lokasyon seç.
   - Beklenen: Sarı kutuda: Ekip lideri (<lider adı>) bu tarihte "<lokasyon>" denetiminde (<A ekibi>) görevli.
   - Roller: Sayfaya girebilen herkes

41. **Çakışma uyarısı — saha sorumlusu**  _[düşük · okur]_
   - Adımlar: Aynı kişiyi saha sorumlusu olarak iki lokasyona (X ve Y) ata. X için 13.02.2026'ya bir plan kur. Sonra formda 13.02.2026 + Y lokasyonu + herhangi bir ekip seç.
   - Beklenen: Sarı kutuda: Saha sorumlusu (<isim>) bu tarihte "X" denetiminde görevli. Üç uyarı türü aynı anda çıkabilir; hepsi ayrı satırlarda listelenir. İptal edilmiş (cancelled) planlar çakışma sayılmaz.
   - Roller: Sayfaya girebilen herkes

42. **Plan tarihini satır içinde değiştir**  _[orta · yazar]_
   - Adımlar: Bir denetim planı satırında tarihin altındaki "Düzenle (2 hak)" bağlantısına tıkla, açılan tarih kutusundan yeni bir gün seç, mavi "Kaydet"e bas.
   - Beklenen: Satırdaki tarih yeni değere döner ve bağlantı "Düzenle (1 hak)" olur. five_s_audit_plans'ta planned_date güncellenir ve date_change_count 1 olur. Aynı tarihi seçip Kaydet'e basarsan hiçbir istek gitmez ve hak düşmez.
   - Roller: Sayfaya girebilen herkes; put.five_s_audit_plans

43. **İkinci değişiklikten sonra tarih kilitlenir**  _[orta · yazar]_
   - Adımlar: Aynı planın tarihini iki kez değiştir ("Düzenle (2 hak)" → Kaydet, sonra "Düzenle (1 hak)" → Kaydet).
   - Beklenen: İkinci kayıttan sonra bağlantı kaybolur, yerine gri "Tarih kilitli" yazısı gelir; tarih artık ekrandan değiştirilemez. Arka uçtaki five_s_audit_plans_date_change_count_check kısıtı da 2'nin üstünü reddeder.
   - Roller: Sayfaya girebilen herkes; put.five_s_audit_plans

44. **Tarih düzenlemeyi iptal et**  _[düşük · okur]_
   - Adımlar: "Düzenle (2 hak)" → tarih kutusundan farklı bir gün seç → "İptal"e bas.
   - Beklenen: Satır eski tarihine döner, hiçbir istek atılmaz, hak sayısı düşmez. Bağlantı yine "Düzenle (2 hak)" der.
   - Roller: Sayfaya girebilen herkes

45. **Tarih düzenlemede çakışma uyarısı**  _[düşük · okur]_
   - Adımlar: Aynı ekibin başka bir planının olduğu bir tarihi, satır içi tarih düzenleme kutusundan seç (henüz Kaydet'e basma).
   - Beklenen: Tarih kutusunun hemen altında sarı "⚠ …" satır(lar)ı belirir (aynı üç çakışma metni). Kaydet yine de basılabilir — uyarı engellemez.
   - Roller: Sayfaya girebilen herkes

46. **Plan durumunu değiştir**  _[orta · yazar]_
   - Adımlar: Bir denetim planı satırının sağındaki açılır listeden sırayla "Tamamlandı", sonra "İptal edildi", sonra "Planlandı" seç.
   - Beklenen: Her seçimde satırın Durum rozeti anında o Türkçe etikete döner (Planlandı / Tamamlandı / İptal edildi) ve five_s_audit_plans.status planned/completed/cancelled olur. "İptal edildi" yapılan plan artık çakışma hesabına girmez.
   - Roller: Sayfaya girebilen herkes; put.five_s_audit_plans

47. **Denetim planı sil — ONAY YOK**  _[YÜKSEK · yazar]_
   - Adımlar: Bir denetim planı satırının sağındaki "Sil" butonuna tek tıkla (hem dönem altındaki tabloda hem "Dönemsiz Planlar" tablosunda dene).
   - Beklenen: Onay sorulmadan satır kaybolur, five_s_audit_plans'tan silinir, dönem satırındaki "N denetim planı" sayacı bir azalır. Hata olursa toast: "İşlem tamamlanamadı. Lütfen tekrar deneyin."
   - Roller: Sayfaya girebilen herkes; delete.five_s_audit_plans

48. **Planlama boş durumları**  _[düşük · okur]_
   - Adımlar: Hiç dönem planı ve hiç denetim planı yokken Denetim Planlama sekmesini aç; sonra bir dönem planı oluşturup genişlet.
   - Beklenen: Dönem listesi yerine "Henüz dönem planı yok."; boş dönem genişletilince "Bu döneme bağlı denetim planı yok."; hiç dönemsiz plan yoksa "Dönemsiz Planlar" bölümü hiç çizilmez.
   - Roller: Sayfaya girebilen herkes

49. **Yeni denetim ekibi oluştur**  _[orta · yazar]_
   - Adımlar: Denetim Ekipleri sekmesinde: "Ekip Adı (opsiyonel)" alanına "Denetim Ekibi - TEST" yaz, "Denetim Ekip Lideri" listesinden bir kişi seç, "Denetçi Ekle" listesinden bir kişi seçip "Ekle"ye bas, sonra "Takımı Oluştur"a bas.
   - Beklenen: Form temizlenir, sağdaki "Tanımlı Ekipler" listesine yeni kart gelir: "Denetim Ekibi - TEST • Lider: <isim>", "Denetçiler (1): <isim>", "Aktif • Oluşturma: …". Solda sayaç "Tanımlı ekip: N" bir artar. five_s_audit_teams'te 1 satır, five_s_audit_team_members'ta her denetçi için 1 satır.
   - Roller: Sayfaya girebilen herkes; post.five_s_audit_teams + post.five_s_audit_team_members

50. **Taslakta denetçi ekle/çıkar**  _[düşük · okur]_
   - Adımlar: "Denetçi Ekle" listesinden birini seçip "Ekle"ye bas; aynı kişiyi tekrar seçip yine "Ekle"ye bas; sonra "Takım Denetçileri" listesindeki satırda "Çıkar"a bas.
   - Beklenen: İlk eklemede isim "Takım Denetçileri" listesine gelir ve seçim kutusu boşalır. İkinci ekleme sessizce yok sayılır (tekrar satır oluşmaz, hata da yok). "Çıkar" satırı listeden alır. Hiçbiri sunucuya yazmaz — yalnız "Takımı Oluştur"/"Kaydet" yazar. Hiç denetçi yokken kutuda "Henüz denetçi eklenmedi." yazar.
   - Roller: Sayfaya girebilen herkes

51. **Lideri denetçi listesine eklemeye çalışma**  _[düşük · okur]_
   - Adımlar: "Denetçi Ekle" listesinden X kişisini SEÇ (henüz "Ekle"ye basma), sonra "Denetim Ekip Lideri" listesinden aynı X kişisini seç, ardından "Ekle"ye bas.
   - Beklenen: Kırmızı toast: "Lider denetçi listesine eklenemez." ve X denetçi listesine eklenmez. Ayrıca "Denetçi Ekle" listesi seçili lideri hiç göstermez.
   - Roller: Sayfaya girebilen herkes

52. **Takım kaydet butonunun kapalı olduğu haller**  _[düşük · okur]_
   - Adımlar: (a) Lider seçmeden, (b) lider seçip hiç denetçi eklemeden "Takımı Oluştur"a basmayı dene.
   - Beklenen: İki durumda da buton soluk ve tıklanamaz. (Koddaki "Lütfen bir lider seç." ve "En az 1 denetçi eklemelisin." toast'ları bu yüzden normal kullanımda hiç görünmez.)
   - Roller: Sayfaya girebilen herkes

53. **Ekibi düzenle — üye ekle/çıkar**  _[YÜKSEK · yazar]_
   - Adımlar: "Tanımlı Ekipler" listesinde bir kartta "Düzenle"ye bas. Sol panelin başlığı "Takımı Düzenle" olur ve mevcut ad/lider/denetçiler yüklenir. Bir denetçiyi "Çıkar", başka birini "Ekle", ekip adını değiştir, "Kaydet"e bas.
   - Beklenen: Form sıfırlanır, liste yeniden çekilir; kartta yeni ad ve "Denetçiler (N)" güncel isimlerle görünür. five_s_audit_teams satırı güncellenir; ÇIKARILAN üyenin five_s_audit_team_members satırı SİLİNİR (soft değil), eklenen için yeni satır açılır.
   - Roller: Sayfaya girebilen herkes; put.five_s_audit_teams + post/delete.five_s_audit_team_members

54. **Ekip düzenlemeyi iptal et**  _[düşük · okur]_
   - Adımlar: Bir kartta "Düzenle" → alanları değiştir → sol paneldeki "İptal" butonuna bas.
   - Beklenen: Panel başlığı "Yeni Takım Oluştur"a döner, tüm alanlar boşalır, hiçbir istek atılmaz, kart değişmemiş kalır. "İptal" butonu yalnız düzenleme modunda görünür.
   - Roller: Sayfaya girebilen herkes

55. **Ekip sil — ONAY YOK**  _[YÜKSEK · yazar]_
   - Adımlar: "Tanımlı Ekipler" listesindeki bir kartta kırmızı "Sil" butonuna tek tıkla.
   - Beklenen: Onay sorulmadan ekip silinir, liste yeniden çekilir ve kart kaybolur; "Tanımlı ekip: N" azalır. five_s_audit_teams satırı gider ama five_s_audit_team_members satırları YERİNDE KALIR (yetim üye satırları). Bu ekip bir denetim planına atanmışsa planın Ekip sütunu "-" olur. Hata olursa toast: "Ekip silinirken hata oluştu."
   - Roller: Sayfaya girebilen herkes; delete.five_s_audit_teams

56. **Ekipler — Yenile**  _[düşük · okur]_
   - Adımlar: Sol paneldeki "Yenile" butonuna bas (ağ sekmesi açıkken).
   - Beklenen: GET /users, GET /fiveSAuditTeams ve ardından GET /fiveSAuditTeamMembers çağrıları yeniden atılır; sayaç "Yükleniyor..." gösterip "Tanımlı ekip: N"e döner. Başka bir sekmede eklenmiş ekip listeye düşer.
   - Roller: Sayfaya girebilen herkes

57. **Rol filtreleri ve aday sayaçları**  _[düşük · okur]_
   - Adımlar: Denetim Ekipleri sekmesinde "Denetim Ekip Lideri" ve "Denetçi Ekle" listelerini aç, altındaki "Lider adayları: N • Denetçi adayları: M" satırını oku.
   - Beklenen: Lider listesinde yalnız Denetçi / Auditor, Merkez Ekip (Content Manager Core Team) veya Denetim Lideri rolündekiler; denetçi listesinde yalnız Denetçi ve Merkez Ekip rolündekiler bulunur — Saha Sorumlusu (Field Manager) İKİSİNDE DE yoktur. Sayaçlar bu iki listenin uzunluğunu verir.
   - Roller: Sayfaya girebilen herkes

58. **Kullanıcı rolleri gelmediğinde açılan kapı**  _[YÜKSEK · okur]_
   - Adımlar: GET /users yanıtından roles alanını düşür (DevTools ile yanıtı boz veya rolsüz bir kurulumda bak) ve Denetim Ekipleri sekmesini aç.
   - Beklenen: Panelde sarı uyarı: "Uyarı: Kullanıcı rolleri gelmiyor. Filtreleme yapılamadı (herkes listeleniyor)." Lider ve Denetçi listelerinde TÜM kullanıcılar çıkar ve kaydederken rol doğrulaması hiç çalışmaz — kim isterse lider olabilir.
   - Roller: Sayfaya girebilen herkes

59. **Rolü uygun olmayan lider ile kaydetme**  _[orta · okur]_
   - Adımlar: Lideri artık lider adayı olmayan bir kullanıcı olan (örn. sonradan rolü Saha Sorumlusu'na çevrilmiş) bir ekipte "Düzenle"ye bas ve hiçbir şey değiştirmeden "Kaydet"e bas.
   - Beklenen: Kırmızı toast: "Seçilen liderin rolü uygun değil. Lider Denetçi veya Merkez Ekip rolünde olmalıdır. Saha Sorumlusu lider olamaz." ve hiçbir istek atılmaz. Aynı şekilde uygun olmayan üye varsa: "Denetçi listesinde rolü uygun olmayan kullanıcı(lar) var. Sadece Denetçi veya Merkez Ekip rolündekiler seçilebilir."
   - Roller: Sayfaya girebilen herkes

60. **Yeni ekip planlama listesine düşüyor mu**  _[düşük · okur]_
   - Adımlar: Denetim Ekipleri sekmesinde bir ekip oluştur, sonra "Denetim Planlama" sekmesine geç ve "Atanan Ekip" açılır listesini aç.
   - Beklenen: Yeni ekip listede görünür (planlama sekmesine her girişte ekipler yeniden çekilir). Adsız oluşturulan ekipler bu listede BOŞ metinle görünür — name null olduğu için seçenek etiketi boştur.
   - Roller: Sayfaya girebilen herkes

61. **Varsayılan adım ve soruları içe aktar (seed)**  _[YÜKSEK · yazar]_
   - Adımlar: Sorular sekmesinde, hiç adım kayıtlı değilken sağ üstteki "⬇ Varsayılan Soruları İçe Aktar" butonuna bas, açılan pencerede "Yükle"ye bas.
   - Beklenen: Onay penceresi: başlık "Adım ve soruları yükle", metin "5 adım ve 37 soru veritabanına eklenecek." Buton "Yükleniyor..."a döner; bitince five_s_steps'te S1–S5 (5 satır) ve five_s_questions'ta 37 satır (S1-Q1 … S5-Q6) oluşur; ekranda beş katlanabilir bölüm belirir ve seed butonu KAYBOLUR (artık adım var).
   - Roller: Yalnız rol adı tam "manager" veya "content manager core team" olanlar; super admin ve godmin bu butonu GÖRMEZ

62. **Seed onayını iptal et**  _[düşük · okur]_
   - Adımlar: "⬇ Varsayılan Soruları İçe Aktar" → açılan pencerede "Vazgeç" (veya Escape).
   - Beklenen: Hiçbir istek atılmaz, five_s_steps ve five_s_questions boş kalır, ekranda "Kayıtlı adım veya soru bulunamadı." yazmaya devam eder.
   - Roller: Yalnız "manager" / "content manager core team"

63. **Sorular sekmesi — yetkisiz kullanıcı salt okur**  _[YÜKSEK · okur]_
   - Adımlar: Sayfayı super admin veya godmin (ya da rol adı tam "manager"/"content manager core team" olmayan başka bir yetkili) ile aç, "Sorular" sekmesine geç.
   - Beklenen: Başlığın altında "Sorular yalnızca yetkili admin tarafından düzenlenebilir." yazar; "⬇ Varsayılan Soruları İçe Aktar", "Soru Ekle" ve satırlardaki kalem/çöp ikonlarının HİÇBİRİ çizilmez. Yalnız "Yenile" vardır. Yetkiliyken metin "Adım ve sorular üzerinde tam yetkiniz var (yetkili admin)." olur. DİKKAT: godmin bu tabloda düzenleme yapamıyor.
   - Roller: Düzenleme yalnız "manager" / "content manager core team"; super admin ve godmin salt okuma

64. **Sorular — Yenile ve adım katlama**  _[düşük · okur]_
   - Adımlar: Sorular sekmesinde "Yenile"ye bas. Sonra bir adım başlığına (örn. "1 - Sınıflandırma (Ayıklama)") tıkla, tekrar tıkla.
   - Beklenen: Yenile sırasında buton "..." olur ve GET /fiveSSteps + GET /fiveSQuestions yeniden atılır. Başlığa tıklayınca soldaki ok ▾↔▸ değişir, sorular gizlenir/görünür; başlığın yanındaki rozet o adımdaki soru sayısını gösterir. Kapalıyken "Soru Ekle" butonu da gizlenir.
   - Roller: Sayfaya girebilen herkes (Yenile ve katlama yetki istemez)

65. **Yeni soru ekle**  _[orta · yazar]_
   - Adımlar: Bir adım başlığının sağındaki "+ Soru Ekle"ye bas. Açılan "Yeni Soru" formunda metin alanına soru metnini yaz, "Maks. Puan"ı 2.5 bırak, "Sıra"yı olduğu gibi bırak, "Açıklama Zorunlu" kutusunu işaretli bırak, "Ekle"ye bas.
   - Beklenen: Buton "Ekleniyor..." olur, sonra form kapanır ve soru o adımın listesine eklenir; üstünde "S1-Q6" gibi otomatik üretilmiş kod, altında "Maks. Puan: 2.5" ve "Açıklama zorunlu" yazar. five_s_questions'ta step_id/external_id/order/text/max_score/require_explanation dolu yeni satır. Metin boşken "Ekle" tıklanamaz.
   - Roller: Yalnız "manager" / "content manager core team"; post.five_s_questions

66. **Aynı sıra ile ikinci soru — kod çakışması**  _[orta · yazar]_
   - Adımlar: Aynı adıma iki kez "+ Soru Ekle" yap ve ikisinde de "Sıra" alanını aynı sayıda (örn. 6) bırak.
   - Beklenen: İki soru da eklenir ve ikisinin de kodu "S1-Q6" olur — external_id benzersizliği kontrol edilmiyor, aynı koddan iki satır five_s_questions'a yazılır. Ayrıca "Sıra"yı 0 veya negatif yapmak da engellenmez (input min=1 ama elle yazılabilir).
   - Roller: Yalnız "manager" / "content manager core team"

67. **Soru ekleme formunu iptal et**  _[düşük · okur]_
   - Adımlar: "+ Soru Ekle" → metin ve puan yaz → "İptal"e bas.
   - Beklenen: Form kapanır, hiçbir istek atılmaz, listeye satır eklenmez. Formu yeniden açtığında alanlar sıfırlanmıştır (metin boş, Maks. Puan 2.5, Sıra = o adımdaki soru sayısı + 1, Açıklama Zorunlu işaretli).
   - Roller: Yalnız "manager" / "content manager core team"

68. **Soru düzenle**  _[orta · yazar]_
   - Adımlar: Bir soru satırında kalem ikonuna bas. Metni değiştir, "Maks. Puan"ı 5 yap, "Açıklama Zorunlu" kutusunun işaretini kaldır, "Kaydet"e bas.
   - Beklenen: Buton "Kaydediliyor..." olur, sonra satır düzenlemeden çıkar ve yeni metin, "Maks. Puan: 5" ve "Açıklama opsiyonel" görünür. five_s_questions satırında text/max_score/require_explanation güncellenir. DİKKAT: düzenleme formunda "Sıra" alanı yoktur — sıra değiştirilemez. Hata olursa toast "Soru güncellenemedi."
   - Roller: Yalnız "manager" / "content manager core team"; put.five_s_questions

69. **Soru düzenlemeyi iptal et**  _[düşük · okur]_
   - Adımlar: Kalem ikonu → metni değiştir → "İptal"e bas.
   - Beklenen: Satır eski metnine ve eski puanına döner, hiçbir istek atılmaz.
   - Roller: Yalnız "manager" / "content manager core team"

70. **Soru sil**  _[YÜKSEK · yazar]_
   - Adımlar: Bir soru satırında çöp kutusu ikonuna bas, açılan kırmızı pencerede "Sil"e bas. Ayrıca bir kez de "Vazgeç" ile dene.
   - Beklenen: Onay metni: "S1-Q3" sorusu kalıcı olarak silinecek. Bu işlem geri alınamaz. "Sil"den sonra satır kaybolur ve adım başlığındaki sayı rozeti bir azalır; five_s_questions'tan satır silinir. "Vazgeç"te hiçbir şey olmaz. Hata olursa toast "Soru silinemedi."
   - Roller: Yalnız "manager" / "content manager core team"; delete.five_s_questions

71. **Sorular sekmesi boş durumları**  _[düşük · okur]_
   - Adımlar: (a) Hiç adım yokken sekmeyi aç. (b) Adımlar varken bir adımın tüm sorularını sil ve o adımı aç.
   - Beklenen: (a) Ortalanmış kutu: "Kayıtlı adım veya soru bulunamadı." — yetkili admin ise altında ayrıca "Yukarıdaki "Varsayılan Soruları İçe Aktar" butonuyla veritabanını başlatın." satırı. (b) Adımın içinde "Bu adımda soru yok." Yükleme sırasında ise "Yükleniyor...".
   - Roller: Sayfaya girebilen herkes; ipucu satırı yalnız yetkili adminde


## Yetkilendirme (Authorization Management) — /claims  (47 senaryo)

1. **Sayfaya erişim — godmin dışı reddi**  _[YÜKSEK · okur]_
   - Adımlar: Rol adı 'super admin' olan ama is_god olmayan bir hesapla giriş yap, adres çubuğuna /claims yaz. LoginChecker rotayı geçirir (isSuperAdmin true), ardından sayfanın kendi kontrolü devreye girer.
   - Beklenen: Kırmızı çerçeveli kartta uyarı üçgeni ikonu + 'Access denied' başlığı ve 'Only god administrators can manage claims and authorization settings.' metni görünür. Claims/Roles sekmeleri, tablo ve 'New Claim' butonu HİÇ render edilmez; GET /claims isteği ağ sekmesinde hiç atılmaz (hook isGod=false iken erken döner).
   - Roller: is_god=false olan herkes; rota kapısını 'super admin' veya 'godmin' rol adı geçer (routeAccess/index.ts:81)

2. **Sayfaya erişim — yetkisiz rol yönlendirmesi**  _[YÜKSEK · okur]_
   - Adımlar: Rolü 'super admin'/'godmin' olmayan (ör. auditor) bir hesapla giriş yap, adres çubuğuna /claims yaz.
   - Beklenen: Ekran hiç boyanmaz (null döner) ve tarayıcı '/' ana sayfaya replace ile yönlendirilir. Yetkilendirme ekranından tek bir kare bile görünmemeli.
   - Roller: is_god=false ve rol adı 'super admin'/'godmin' olmayan tüm hesaplar

3. **Oturumsuz karşılama bloğu**  _[düşük · okur]_
   - Adımlar: Bu dal yalnızca store.user tanımsızken çalışır. LoginChecker oturumsuz kullanıcıyı /login'e attığı için normal gezinmeyle ulaşılamaz; doğrulamak için sayfa mount olduktan sonra store.user'ı boşaltmak (oturum düşmesi) gerekir.
   - Beklenen: 'Authorization Management' başlıklı beyaz kartta 'Please log in to manage claims and roles.' metni görünür; sekme yok, tablo yok.
   - Roller: Oturumsuz — pratikte LoginChecker tarafından gölgelenir

4. **Claims sekmesine geçiş**  _[düşük · okur]_
   - Adımlar: godmin ile /claims aç. Üstteki sekme çubuğunda 'Claims' butonuna tıkla (varsayılan zaten budur; önce 'Roles'a geçip geri dön).
   - Beklenen: 'Claims' sekmesi alt çizgili yeşil (border-emerald-500) olur, altta 'Claims' başlıklı ve 'Low-level permissions that map to specific API endpoints' açıklamalı bölüm ile Action/Method/Path/Mode/Description/Actions kolonlu tablo görünür.
   - Roller: sadece is_god

5. **Roles sekmesine geçiş**  _[düşük · okur]_
   - Adımlar: Sekme çubuğunda 'Roles' butonuna tıkla.
   - Beklenen: 'Roles' sekmesi yeşil alt çizgili olur; 'Roles' başlıklı, 'Group claims into reusable roles for efficient permission management' açıklamalı bölüm ve Name/Description/Type/Actions kolonlu tablo görünür. Claims tablosu DOM'dan kalkar.
   - Roller: sadece is_god

6. **Claims listesinin ilk yüklenmesi**  _[düşük · okur]_
   - Adımlar: godmin ile /claims aç ve Claims sekmesinde bekle.
   - Beklenen: Önce tabloda tek satırlık 'Loading claims...' + dönen spinner görünür; sonra en fazla 20 claim satırı listelenir. Ağda GET /claims?page=1&limit=20&orderBy=created_at&orderDirection=desc çağrısı olur ve satırlar created_at DESC sırasındadır (en yeni claim en üstte).
   - Roller: sadece is_god

7. **Claims boş durumu**  _[düşük · okur]_
   - Adımlar: Claims sekmesindeki arama kutusuna hiçbir claim'in action/path/description alanında geçmeyen bir metin yaz (ör. 'zzzzqqq').
   - Beklenen: Tablo gövdesinde 6 kolonu kaplayan tek hücrede 'No claims found.' yazar; sayfalama şeridi (pagination.total===0 olduğu için) hiç görünmez.
   - Roller: sadece is_god

8. **Claims arama kutusu**  _[düşük · okur]_
   - Adımlar: Claims sekmesinde 'Search by action, path, description...' placeholder'lı arama kutusuna bir claim action parçası yaz (ör. 'users').
   - Beklenen: Her tuş vuruşunda yeni GET /claims isteği gider (debounce yok) ve sayfa 1'e döner; tabloda yalnızca eşleşen satırlar kalır, alttaki 'Showing N of M claims' sayısı düşer.
   - Roller: sadece is_god

9. **Claims metot filtresi**  _[düşük · okur]_
   - Adımlar: Claims sekmesinde sağdaki ilk açılır listeden ('All methods') 'POST' seç.
   - Beklenen: İstek filters.method=POST ile gider, sayfa 1'e döner ve tabloda yalnızca Method rozeti POST olan satırlar kalır. 'All methods'a geri dönünce filtre kalkar.
   - Roller: sadece is_god

10. **Claims eşleşme modu filtresi**  _[düşük · okur]_
   - Adımlar: Claims sekmesinde ikinci açılır listeden ('All modes') 'startsWith' seç, sonra 'exact' seç.
   - Beklenen: filters.mode ile istek gider, sayfa 1'e döner; tabloda Mode kolonundaki rozet yalnızca seçilen değeri gösteren satırlar kalır.
   - Roller: sadece is_god

11. **Claims sayfa boyutu değiştirme**  _[düşük · okur]_
   - Adımlar: Claims sekmesinde üçüncü açılır listeden '10 / page' seç, sonra '50 / page' seç.
   - Beklenen: limit parametresi 10/50 olarak gider, sayfa 1'e döner; tablodaki satır sayısı ve alttaki 'Showing N of M claims' değerindeki N buna göre değişir, 'Page 1 of X' içindeki toplam sayfa sayısı da değişir.
   - Roller: sadece is_god

12. **Claims sayfalama ileri/geri**  _[düşük · okur]_
   - Adımlar: Claims sekmesinde toplam claim sayısı limitten fazlayken alttaki 'Next' butonuna, sonra 'Previous' butonuna tıkla. 1. sayfada 'Previous'ın, son sayfada 'Next'in devre dışı (soluk, tıklanamaz) olduğunu da kontrol et.
   - Beklenen: Ortadaki 'Page X of Y' sayısı artar/azalır, tablo içeriği değişir; hasPrev/hasNext false olan uçlarda buton disabled ve opacity-50 olur.
   - Roller: sadece is_god

13. **Claims yenile butonu**  _[düşük · okur]_
   - Adımlar: Claims bölümünün sağ üstündeki 'Refresh' butonuna tıkla; tıklarken butonun anlık halini de gözle.
   - Beklenen: Buton metninin soluna dönen spinner gelir ve buton disabled olur (isRefreshing), yeni GET /claims isteği gider, tablo aynı sayfa/filtrelerle tazelenir ve spinner kaybolur. İlk yükleme sürerken buton zaten disabled'dır.
   - Roller: sadece is_god

14. **Yeni claim modalını açma**  _[düşük · okur]_
   - Adımlar: Claims bölümünün sağ üstündeki yeşil '+ New Claim' butonuna tıkla.
   - Beklenen: Karartılmış zemin üzerinde 'New Claim' başlıklı, 'Configure a claim that maps to a backend endpoint.' açıklamalı modal açılır. Action ve Path boş, Method 'GET', Mode 'exact' seçili gelir; alt butonlar 'Cancel' ve 'Create'.
   - Roller: sadece is_god

15. **Yeni claim oluşturma**  _[orta · yazar]_
   - Adımlar: 'New Claim' → 'Action' alanına 'test.read' yaz, 'Method' listesinden 'GET' seç, 'Mode' listesinden 'exact' seç, 'Path' alanına '/testEntity' yaz, 'Description' alanına 'gecici test' yaz, 'Create' butonuna bas.
   - Beklenen: Create butonunda spinner çıkar ve buton disabled olur, sonra modal kapanır, sayfa 1'e döner ve liste tazelenir; 'test.read' satırı tablonun en üstünde (created_at DESC) belirir. Veritabanında `claims` tablosuna yeni satır, `audit_logs` tablosuna CREATE kaydı düşer. Ağda POST /claims 200 döner.
   - Roller: sadece is_god

16. **Claim formu zorunlu alan reddi**  _[düşük · okur]_
   - Adımlar: 'New Claim' modalını aç, 'Action' ve 'Path' alanlarını boş bırak (ya da sadece boşluk karakteri yaz) ve 'Create' butonuna bas.
   - Beklenen: Hiçbir ağ isteği gitmez, modal AÇIK kalır; modalın arkasındaki Claims bölümünde kırmızı çerçeveli uyarı kutusunda 'Action, path and method are required.' yazar. `claims` tablosuna satır eklenmez.
   - Roller: sadece is_god

17. **Claim düzenleme modalını açma**  _[düşük · okur]_
   - Adımlar: Claims tablosunda herhangi bir satırın sağındaki kalem ikonlu 'Edit' butonuna tıkla.
   - Beklenen: 'Edit Claim' başlıklı modal açılır; Action, Method, Mode, Path ve Description alanları o satırın mevcut değerleriyle dolu gelir, gönder butonunun metni 'Create' değil 'Save' olur.
   - Roller: sadece is_god

18. **Claim güncelleme**  _[YÜKSEK · yazar]_
   - Adımlar: Bir satırda 'Edit' → 'Path' alanını '/testEntity2' olarak değiştir, 'Method' listesinden 'PATCH' seç, 'Save' butonuna bas.
   - Beklenen: Modal kapanır, liste tazelenir ve ilgili satırın Path hücresi '/testEntity2', Method rozeti PATCH olur. Ağda PUT /claims/:id gider; `claims` satırı güncellenir ve `audit_logs` tablosunda old_values/new_values farkını taşıyan UPDATE kaydı oluşur.
   - Roller: sadece is_god

19. **Claim modalını kapatma**  _[düşük · okur]_
   - Adımlar: 'New Claim' veya 'Edit' ile modalı aç, alanlara bir şeyler yaz, 'Cancel' butonuna bas. Ayrıca karartılmış zemine tıklamayı ve Esc tuşunu da dene.
   - Beklenen: 'Cancel' modalı kapatır ve hiçbir istek gitmez; yazılanlar kaydedilmez. Zemine tıklamak ve Esc HİÇBİR ŞEY yapmaz — bu modalda kapatma yalnızca 'Cancel' ile olur (X butonu ve zemin kapatıcısı yok). Gönderim sürerken (isSubmitting) 'Cancel' disabled'dır ve tıklama yok sayılır.
   - Roller: sadece is_god

20. **Claim silme (onaylı)**  _[YÜKSEK · yazar]_
   - Adımlar: Claims tablosunda bir satırın çöp kutusu ikonlu 'Delete' butonuna tıkla; açılan onay penceresinde kırmızı 'Delete' butonuna bas.
   - Beklenen: Onay penceresinde 'Delete claim' başlığı ve '"<action>" will be permanently deleted. This cannot be undone.' metni çıkar. Onaydan sonra DELETE /claims/:id gider, liste tazelenir ve satır tablodan kaybolur. `claims` tablosundan satır silinir, `audit_logs` tablosuna old_values tam ön-imgesiyle DELETE kaydı düşer. Not: bu claim bir role bağlıysa o rolün yetkisi de kaybolur.
   - Roller: sadece is_god

21. **Claim silmekten vazgeçme**  _[düşük · okur]_
   - Adımlar: Bir satırda 'Delete' butonuna bas, sonra onay penceresinde 'Cancel' butonuna bas. Aynısını Esc tuşuyla ve pencerenin dışındaki karartılmış zemine tıklayarak da tekrarla.
   - Beklenen: Üç yolun her birinde onay penceresi kapanır, hiçbir DELETE isteği gitmez ve satır tabloda kalır. `claims` tablosunda değişiklik olmaz.
   - Roller: sadece is_god

22. **Claims hata bandı**  _[düşük · okur]_
   - Adımlar: Claims sekmesindeyken ağ bağlantısını kes (veya backend'i durdur) ve 'Refresh' butonuna bas.
   - Beklenen: Filtre satırının üstünde kırmızı çerçeveli/kırmızı zeminli kutuda hata metni ('Failed to refresh claims' ya da sunucudan gelen mesajın string hali) görünür; spinner durur ve tablo son başarılı içerikle kalır.
   - Roller: sadece is_god

23. **Roller listesinin ilk yüklenmesi**  _[düşük · okur]_
   - Adımlar: 'Roles' sekmesine tıkla ve bekle.
   - Beklenen: Tabloda tek satırlık 'Loading roles...' + spinner görünür, sonra en fazla 20 rol listelenir. GET /roles?page=1&limit=20&orderBy=created_at&orderDirection=desc gider; Type kolonunda sistem rolleri kalkan ikonlu sarı 'System', diğerleri gri 'Custom' rozeti taşır.
   - Roller: sadece is_god

24. **Roller boş durumu**  _[düşük · okur]_
   - Adımlar: Roles sekmesinde 'Search roles by name or description...' kutusuna hiçbir rolde geçmeyen bir metin yaz.
   - Beklenen: Tablo gövdesinde 4 kolonu kaplayan hücrede 'No roles found.' yazar ve alttaki sayfalama şeridi görünmez.
   - Roller: sadece is_god

25. **Roller arama kutusu**  _[düşük · okur]_
   - Adımlar: Roles sekmesinde 'Search roles by name or description...' kutusuna bir rol adı parçası yaz (ör. 'admin').
   - Beklenen: Her tuş vuruşunda GET /roles isteği gider ve sayfa 1'e döner; tabloda yalnızca eşleşen roller kalır, 'Showing N of M roles' sayısı düşer.
   - Roller: sadece is_god

26. **Sistem/özel rol filtresi**  _[düşük · okur]_
   - Adımlar: Roles sekmesinde birinci açılır listeden ('All roles') 'System roles' seç, sonra 'Custom roles' seç, sonra 'All roles'a dön.
   - Beklenen: 'System roles' seçiliyken istek filters.is_system=true ile gider ve tabloda yalnızca sarı 'System' rozetli satırlar kalır (bu satırlarda 'Delete' butonu yoktur); 'Custom roles' seçiliyken is_system=false gider ve yalnızca 'Custom' rozetli satırlar kalır. Her seçimde sayfa 1'e döner.
   - Roller: sadece is_god

27. **Roller sayfa boyutu ve sayfalama**  _[düşük · okur]_
   - Adımlar: Roles sekmesinde ikinci açılır listeden '10 / page' seç, sonra alttaki 'Next' ve 'Previous' butonlarını kullan.
   - Beklenen: Tabloda en fazla 10 satır kalır, 'Showing N of M roles' ve 'Page X of Y' değerleri buna göre değişir; 'Next'/'Previous' sayfayı ilerletir/geriletir ve uçlarda disabled olur.
   - Roller: sadece is_god

28. **Roller yenile butonu**  _[düşük · okur]_
   - Adımlar: Roles bölümünün sağ üstündeki 'Refresh' butonuna tıkla.
   - Beklenen: Buton metninin soluna spinner gelir ve buton disabled olur, GET /roles yeniden gider, liste aynı sayfa/filtrelerle tazelenir.
   - Roller: sadece is_god

29. **Yeni rol oluşturma**  _[orta · yazar]_
   - Adımlar: Roles bölümünün sağ üstündeki yeşil '+ New Role' butonuna tıkla; 'Name' alanına 'test-rol' yaz, 'Description' alanına 'gecici' yaz, 'System Role (protected from deletion)' kutusunu İŞARETLEME ve 'Create' butonuna bas.
   - Beklenen: 'New Role' başlıklı modal kapanır, sayfa 1'e döner ve liste tazelenir; 'test-rol' satırı en üstte, Type kolonunda gri 'Custom' rozetiyle belirir ve satırda 'Manage Claims' / 'Edit' / 'Delete' butonları vardır. POST /roles gider; `roles` tablosuna satır, `audit_logs` tablosuna CREATE kaydı düşer.
   - Roller: sadece is_god

30. **Sistem rolü olarak oluşturma**  _[YÜKSEK · yazar]_
   - Adımlar: 'New Role' → 'Name' alanına 'test-sistem-rol' yaz, 'System Role (protected from deletion)' onay kutusunu işaretle, 'Create' butonuna bas.
   - Beklenen: Yeni satır Type kolonunda kalkan ikonlu sarı 'System' rozetiyle gelir ve satırda 'Delete' butonu HİÇ render edilmez — yani rol arayüzden bir daha silinemez. `roles` tablosunda is_system=true olur.
   - Roller: sadece is_god

31. **Rol adı zorunluluğu**  _[düşük · okur]_
   - Adımlar: 'New Role' modalını aç, 'Name' alanını boş bırakıp 'Create' butonuna bas. Ardından alana sadece boşluk karakteri yazıp tekrar dene.
   - Beklenen: Boş alanda tarayıcının kendi HTML doğrulaması (required) formu göndermez ve alanın altında yerel dilde 'bu alanı doldurun' baloncuğu çıkar. Sadece boşluk yazıldığında form gönderilir ama JS kontrolü isteği keser ve tablo üstünde kırmızı kutuda 'Role name is required.' görünür; `roles` tablosuna satır eklenmez.
   - Roller: sadece is_god

32. **Rol düzenleme modalını açma**  _[düşük · okur]_
   - Adımlar: Roles tablosunda bir satırın kalem ikonlu 'Edit' butonuna tıkla.
   - Beklenen: 'Edit Role' başlıklı modal açılır; 'Name' ve 'Description' alanları o rolün değerleriyle dolu, 'System Role (protected from deletion)' kutusu rolün is_system değerine göre işaretli/işaretsiz gelir, gönder butonu 'Save' yazar.
   - Roller: sadece is_god

33. **Rol güncelleme**  _[YÜKSEK · yazar]_
   - Adımlar: Bir rolde 'Edit' → 'Name' alanını 'test-rol-2' olarak değiştir, 'Description' alanını doldur, 'Save' butonuna bas.
   - Beklenen: Modal kapanır, liste tazelenir, satırın Name ve Description hücreleri yeni değerleri gösterir. PUT /roles/:id gider; `roles` satırı güncellenir, `audit_logs` tablosuna UPDATE kaydı düşer. Rol adı, rota kapısındaki 'super admin'/'godmin' eşleşmesini de etkiler.
   - Roller: sadece is_god

34. **Sistem rolü bayrağını düzenlemeden kaldırma**  _[YÜKSEK · yazar]_
   - Adımlar: Type kolonunda 'System' rozetli bir rolde 'Edit' → 'System Role (protected from deletion)' kutusunun işaretini KALDIR → 'Save'.
   - Beklenen: Liste tazelendiğinde satırın rozeti 'System'den 'Custom'a döner ve satırda daha önce olmayan kırmızı 'Delete' butonu belirir. `roles.is_system` false olur — yani silme koruması arayüzden kaldırılmış olur.
   - Roller: sadece is_god

35. **Rol modalını kapatma**  _[düşük · okur]_
   - Adımlar: 'New Role' veya 'Edit' modalını aç, alanları doldur, 'Cancel' butonuna bas. Zemine tıklama ve Esc'i de dene.
   - Beklenen: 'Cancel' modalı kapatır, hiçbir istek gitmez, girilenler kaybolur. Zemine tıklamak ve Esc bu modalda hiçbir şey yapmaz (X butonu yok). Gönderim sürerken 'Cancel' disabled olur.
   - Roller: sadece is_god

36. **Özel rol silme (onaylı)**  _[YÜKSEK · yazar]_
   - Adımlar: Type kolonunda 'Custom' rozetli bir satırda çöp kutusu ikonlu 'Delete' butonuna tıkla, açılan onay penceresinde kırmızı 'Delete' butonuna bas.
   - Beklenen: Onay penceresinde 'Delete role' başlığı ve '"<rol adı>" will be permanently deleted. This cannot be undone.' metni çıkar. Onaydan sonra DELETE /roles/:id gider, liste tazelenir ve satır kaybolur. `roles` tablosundan satır silinir, `audit_logs` tablosuna DELETE kaydı düşer; bu role bağlı kullanıcılar rolün verdiği tüm yetkileri kaybeder.
   - Roller: sadece is_god

37. **Sistem rolünde silme butonunun olmaması**  _[orta · okur]_
   - Adımlar: Filtreyi 'System roles' yap ve listelenen satırların sağ tarafındaki buton grubunu incele.
   - Beklenen: Her satırda yalnızca 'Manage Claims' ve 'Edit' butonları vardır; 'Delete' butonu DOM'da hiç yoktur (disabled değil, render edilmiyor). 'Custom roles' filtresine geçince 'Delete' butonu görünür.
   - Roller: sadece is_god

38. **Rol silmekten vazgeçme**  _[düşük · okur]_
   - Adımlar: Bir 'Custom' rolde 'Delete' butonuna bas, onay penceresinde 'Cancel'a bas; ayrıca Esc ve zemine tıklama ile de dene.
   - Beklenen: Onay penceresi kapanır, DELETE isteği gitmez, satır listede kalır, `roles` tablosu değişmez.
   - Roller: sadece is_god

39. **Rol yetkileri modalını açma**  _[düşük · okur]_
   - Adımlar: Roles tablosunda bir satırın yeşil 'Manage Claims' butonuna tıkla.
   - Beklenen: Tam ekran karartma üzerinde 'Manage Claims for <rol adı>' başlıklı geniş modal açılır; 'Attach or detach low-level claims that this role will provide to users.' açıklaması, 'Assigned X of Y claims' sayacı ve arama kutusu görünür. Önce ortada spinner + 'Loading claims...' çıkar; arka planda GET /roleClaims (filters.role_id=<rol>, relations=['claim'], limit=500) ve ardından GET /claims (limit=50, sayfa 1) çağrıları yapılır.
   - Roller: sadece is_god

40. **Role claim atama**  _[YÜKSEK · yazar]_
   - Adımlar: 'Manage Claims for <rol>' modalında, sağ tarafında gri 'Assign' yazan bir claim kartındaki butona tıkla.
   - Beklenen: Buton önce spinner'a döner ve disabled olur, ardından yeşil zeminde tik ikonlu 'Assigned' haline geçer; başlıktaki 'Assigned X of Y claims' sayacındaki X bir artar. POST /roleClaims gider; `role_claims` tablosuna role_id/claim_id satırı eklenir ve o rolü taşıyan kullanıcılar ilgili uç noktaya erişim kazanır.
   - Roller: sadece is_god

41. **Rolden claim kaldırma**  _[YÜKSEK · yazar]_
   - Adımlar: Aynı modalda yeşil 'Assigned' yazan bir claim kartındaki butona tıkla.
   - Beklenen: Buton spinner'a döner, sonra gri 'Assign' haline geçer; 'Assigned X of Y claims' sayacındaki X bir azalır. DELETE /roleClaims/:id gider ve `role_claims` tablosundaki ilgili satır silinir — o rolü taşıyan kullanıcılar bu yetkiyi anında kaybeder.
   - Roller: sadece is_god

42. **Rol yetkileri modalında arama**  _[düşük · okur]_
   - Adımlar: 'Manage Claims for <rol>' modalındaki 'Search claims by action, path or method...' kutusuna bir metin yaz (ör. 'post' veya '/users').
   - Beklenen: Hiçbir ağ isteği gitmez; liste YALNIZCA o ana kadar yüklenmiş claim'ler içinde action/path/method üzerinde büyük-küçük harf duyarsız alt dize eşleşmesiyle daraltılır. Başlıktaki 'Assigned X of Y claims' sayacı DEĞİŞMEZ (Y yüklenen toplam claim sayısıdır, filtrelenen değil).
   - Roller: sadece is_god

43. **Rol yetkilerinde kaydırarak daha fazla yükleme**  _[düşük · okur]_
   - Adımlar: Sistemde 50'den fazla claim varken 'Manage Claims' modalını aç ve kart listesini en alta kadar kaydır (dip noktasına 80px kala).
   - Beklenen: Listenin altında dönen spinner ve 'Loading more claims...' metni belirir, GET /claims sayfa 2 (limit=50) isteği gider ve yeni kartlar mevcut listenin altına eklenir; 'Assigned X of Y claims' içindeki Y artar. Son sayfaya gelindiğinde (hasNext=false) yeni istek atılmaz.
   - Roller: sadece is_god

44. **Rol yetkileri boş durumu**  _[düşük · okur]_
   - Adımlar: 'Manage Claims' modalındaki arama kutusuna hiçbir claim ile eşleşmeyen bir metin yaz.
   - Beklenen: Kart listesinin yerine çerçeveli kutuda 'No claims found with the current filters.' metni görünür.
   - Roller: sadece is_god

45. **Rol yetkileri modalını kapatma**  _[düşük · okur]_
   - Adımlar: 'Manage Claims for <rol>' modalının sağ üstündeki X ikonuna (aria-label: 'Close role claims management') tıkla, sonra aynı role tekrar 'Manage Claims' ile gir.
   - Beklenen: Modal kapanır ve altındaki Roles tablosu görünür. Tekrar açıldığında arama kutusu boş değildir — arama metni state'te sıfırlanmaz — ama claim listesi, atama haritası ve sayfa sayacı sıfırlanıp yeniden yüklenir ve az önce yapılan atamalar 'Assigned' olarak gelir.
   - Roller: sadece is_god

46. **Roller hata bandı**  _[düşük · okur]_
   - Adımlar: Roles sekmesindeyken backend'i durdur (veya ağı kes) ve 'Refresh' butonuna bas.
   - Beklenen: Filtre satırının üstünde kırmızı kutuda 'Failed to refresh roles' (veya sunucudan gelen mesaj) görünür; spinner durur, tablo son başarılı içerikle kalır.
   - Roller: sadece is_god

47. **Rol yetkileri hatalarının sessizliği**  _[orta · okur]_
   - Adımlar: 'Manage Claims' modalını aç, tarayıcı konsolunu açık tut, backend'i durdur ve bir 'Assign' butonuna bas.
   - Beklenen: Ekranda hiçbir hata metni GÖRÜNMEZ — buton spinner'dan eski haline döner ve durum değişmemiş gibi kalır; hata yalnızca konsolda 'Add role_claim failed:' / 'Delete role_claim failed:' / 'Get role_claims failed:' satırı olarak yazılır. Bu modalın kendi hata bandı yoktur.
   - Roller: sadece is_god


## Kurul Toplantı Kararları — /iyilestirici-faaliyetler (apps/fe/app/(pages)/iyilestirici-faaliyetler/page  (35 senaryo)

1. **Sayfaya yetkili rolle girme**  _[YÜKSEK · okur]_
   - Adımlar: Oturum aç, üst menüden 'Sistem' kategorisini aç ve 'İyileştirici Faaliyetler'e tıkla (ya da adres çubuğuna /iyilestirici-faaliyetler yaz). godmin, 'super admin', 'manager' ya da adında hem 'content manager' hem 'core team' geçen bir rolle dene.
   - Beklenen: Sayfa çizilir: 'Kurul Toplantı Kararları' başlığı, altında '3 ayda bir yapılan kurul toplantılarında...' açıklaması, sağda 'Yeni Karar Ekle' ve 'Yenile' butonları, altta 'Geçmiş Toplantı Kararları' bölümü. Yönlendirme olmaz.
   - Roller: godmin / isGod bayrağı, 'super admin', 'manager', 'content manager … core team'. ROUTE_REQUIREMENTS id:'master-data' kuralı /iyilestirici-faaliyetler'i kapsıyor.

2. **Yetkisiz rolle sayfaya girme reddi**  _[YÜKSEK · okur]_
   - Adımlar: Yalnızca 'basic' ya da yalnızca 'auditor'/'denetçi' rolü olan bir hesapla oturum aç, adres çubuğuna doğrudan /iyilestirici-faaliyetler yaz ve Enter'a bas.
   - Beklenen: Sayfanın hiçbir karesi çizilmez (null döner), tarayıcı ana sayfaya (/) yönlendirilir. Ağ sekmesinde /boardMeetingDecisions isteği HİÇ atılmaz.
   - Roller: master-data kuralına uymayan her rol. isGod=true her koşulda geçer (routeAccess/index.ts:137).

3. **Oturumsuz erişim → login'e dönüş**  _[YÜKSEK · okur]_
   - Adımlar: Çerezleri temizle (oturumu kapat), /iyilestirici-faaliyetler adresini aç.
   - Beklenen: Önce 'Loading...' yükleyicisi görünür, GET /auth/me 401 döner, ardından /login?returnUrl=%2Fiyilestirici-faaliyetler adresine yönlendirilir.
   - Roller: Oturumsuz herkes.

4. **Menüde gizlenme (yetkisiz rol)**  _[YÜKSEK · okur]_
   - Adımlar: Yetkisiz bir rolle oturum aç, üst menüde 'Sistem' kategorisini aç ve içindeki maddeleri say.
   - Beklenen: 'İyileştirici Faaliyetler' maddesi listede HİÇ yoktur (aynı şekilde 'Ana Veri Yönetimi' ve 'Kullanıcılar' da). Yetkili rolle aynı menü açıldığında madde görünür.
   - Roller: canSeeMasterMenus: 'manager', 'super admin', 'godmin', 'content manager'+'core team'. Diğerlerinde gizli.

5. **İlk açılışta kararların sayfa sayfa listelenmesi**  _[düşük · okur]_
   - Adımlar: Sayfayı aç ve tarayıcı ağ sekmesini izle.
   - Beklenen: Tek bir GET /boardMeetingDecisions?page=1&limit=25&sort=[{"field":"meeting_date","direction":"desc"}] isteği atılır. Tablo 5 kolonla çizilir: 'Toplantı Tarihi', 'Madde No', 'Madde Açıklaması', 'Sorumlu Müdür', 'Durum'. Satırlar toplantı tarihine göre yeniden→eskiye sıralıdır. Aynı ekran açık kalırken tekrarlayan istek atılmaz (aksiyon ref'te tutuluyor).
   - Roller: Sayfayı açabilen herkes; backend ayrıca 'get.board_meeting_decisions' claim'i arar, godmin bypass eder.

6. **İlk açılışta kullanıcıların çekilmesi**  _[düşük · okur]_
   - Adımlar: Sayfayı aç, ağ sekmesinde /users isteğini incele.
   - Beklenen: GET /users?page=1&limit=1000 atılır. İstek uçarken 'Geçmiş Toplantı Kararları' başlığının sağında 'Kullanıcılar…' yazısı görünür, cevap gelince kaybolur. Dikkat: istekte ?with= parametresi YOKTUR, dolayısıyla dönen kullanıcı satırlarında roles ve profile alanları gelmez.
   - Roller: Backend 'get.users' claim'i arar; claim yoksa 403 döner ve ekranda HİÇBİR hata mesajı çıkmaz (sadece console.error).

7. **Boş liste durumu**  _[düşük · okur]_
   - Adımlar: board_meeting_decisions tablosu boşken (ya da kullanıcının göreceği satır yokken) sayfayı aç.
   - Beklenen: Tablo hiç çizilmez; yerine 'Henüz kayıtlı kurul toplantı kararı bulunmuyor.' cümlesi görünür. Sonsuz kaydırma bileşeni ve 'kararın tamamı gösteriliyor' etiketi de görünmez. Not: ilk sayfa daha uçarken de decisions boş olduğundan bu cümle 'Yükleniyor…' çipiyle AYNI ANDA görünür.
   - Roller: Sayfayı açabilen herkes.

8. **Yenile butonu**  _[düşük · okur]_
   - Adımlar: 'Yenile' butonuna tıkla.
   - Beklenen: İki istek birden atılır: GET /users?page=1&limit=1000 ve GET /boardMeetingDecisions?page=1&limit=25 (sayfa 1'e döner). Liste birikmiş sayfaları atıp yalnızca ilk 25 satırı gösterir. Buton metni istek boyunca 'Yükleniyor...' olur, bitince 'Yenile'ye döner. Satır içi durum değişikliğinden sonra basıldığında sunucudaki güncel durum geri okunur.
   - Roller: Sayfayı açabilen herkes.

9. **Yenile butonu istek sırasında kilitli**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlat (throttle), 'Yenile'ye bas ve istek uçarken tekrar tıklamayı dene.
   - Beklenen: Buton disabled ve soluk (opacity-60), üzerinde 'Yükleniyor...' yazıyor; ikinci tıklama yeni istek üretmez. Aynı kilit ilk açılıştaki otomatik yükleme sırasında da geçerlidir.
   - Roller: Sayfayı açabilen herkes.

10. **Sonsuz kaydırma ile sonraki sayfa**  _[düşük · okur]_
   - Adımlar: 25'ten fazla kararın olduğu bir kurulumda sayfayı aç, tablonun en altına kaydır (sentinel 400px önceden tetiklenir).
   - Beklenen: GET /boardMeetingDecisions?page=2&limit=25 atılır, tablonun altına 25 satır daha eklenir, sayfa başa dönmez. Yüklenirken tablonun altında 'Yükleniyor…' yazar. Zaten listede olan id'ler tekrar eklenmez (mergePages), yani aynı karar iki kez çizilmez.
   - Roller: Sayfayı açabilen herkes.

11. **Liste sonu etiketi**  _[düşük · okur]_
   - Adımlar: Tüm sayfaları yükleyene kadar aşağı kaydır (ya da 25'ten az kaydın olduğu bir kurulumda listeyi aç).
   - Beklenen: Tablonun altında '<N> kararın tamamı gösteriliyor' yazısı belirir; N ekranda çizili satır sayısıdır. Bu etiket yalnızca sunucu hasNextPage=false dediğinde çıkar, o andan sonra kaydırmak yeni istek atmaz.
   - Roller: Sayfayı açabilen herkes.

12. **Liste okuma hatası uyarısı**  _[düşük · okur]_
   - Adımlar: Backend'i durdur ya da 'get.board_meeting_decisions' claim'i olmayan bir rolle (godmin değil) sayfayı aç.
   - Beklenen: Sağ üstte 'Toplantı kararları listelenirken bir hata oluştu.' kırmızı toast'ı çıkar; tabloda 'Henüz kayıtlı kurul toplantı kararı bulunmuyor.' yazar. Backend 403 gövdesi {"success":false,"message":"Forbidden"} olur.
   - Roller: Claim'i olmayan her rol. godmin claim kontrolünü atlar.

13. **Yeni Karar Ekle modalını açma**  _[düşük · okur]_
   - Adımlar: Yeşil 'Yeni Karar Ekle' butonuna tıkla.
   - Beklenen: Ekranın üstüne siyah yarı saydam katman ve 'Yeni Toplantı Kararı Ekle' başlıklı bir kutu gelir; altında 'Madde açıklaması, durum ve sorumlu müdür ile birlikte tarih bilgisini giriniz.' yazar. Form SIFIRLANMIŞ gelir: Toplantı Tarihi = bugünün tarihi, Sorumlu Müdür = boş, Madde Açıklaması = boş, Durum = 'Açık'. Daha önce yarım bırakılmış bir giriş varsa kaybolmuştur.
   - Roller: Sayfayı açabilen herkes; buton hiçbir role göre gizlenmiyor veya kilitlenmiyor.

14. **Modalı ✕ ile kapatma**  _[düşük · okur]_
   - Adımlar: Modalı aç, sağ üstteki ✕ (aria-label 'Kapat') düğmesine tıkla.
   - Beklenen: Modal kapanır, arkadaki liste değişmeden durur, hiçbir istek atılmaz. Yeniden 'Yeni Karar Ekle'ye basıldığında form yine sıfırdan gelir.
   - Roller: Sayfayı açabilen herkes.

15. **Modalı Vazgeç ile kapatma**  _[düşük · okur]_
   - Adımlar: Modalı aç, alanları doldur, sol alttaki 'Vazgeç' butonuna tıkla.
   - Beklenen: Modal kapanır, girilen veriler kaydedilmez, board_meeting_decisions tablosuna satır eklenmez.
   - Roller: Sayfayı açabilen herkes.

16. **Kaydederken modal kapanmaz**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlat, formu geçerli şekilde doldur, 'Kararı Kaydet'e bas ve istek uçarken hem 'Vazgeç'e hem ✕'e tıkla.
   - Beklenen: 'Vazgeç' disabled ve soluk (opacity-60); ✕ tıklanabilir görünür ama HİÇBİR ŞEY yapmaz (closeCreateModal loading iken erken döner). Modal istek bitene kadar açık kalır.
   - Roller: Sayfayı açabilen herkes.

17. **Modal arka planına tıklama kapatmaz**  _[düşük · okur]_
   - Adımlar: Modalı aç, kutunun dışındaki koyu alana tıkla; ayrıca Esc tuşuna bas.
   - Beklenen: Modal AÇIK kalır — arka plan katmanında onClick yok, klavye dinleyicisi de yok. Kapatmanın tek yolu ✕ ya da 'Vazgeç'.
   - Roller: Sayfayı açabilen herkes.

18. **Toplantı Tarihi seçme**  _[düşük · okur]_
   - Adımlar: Modalda 'Toplantı Tarihi *' etiketli alana tıkla; tarayıcının tarih seçicisi açılır, farklı bir gün seç. Alanın etrafındaki sarmalayıcıya (metnin yanı) tıklamak da seçiciyi açar.
   - Beklenen: Alandaki değer seçilen güne değişir (yyyy-aa-gg). Kutuya tıklamak showPicker() çağırdığı için takvim açılır ve alan odağa gelir.
   - Roller: Sayfayı açabilen herkes.

19. **Sorumlu Müdür seçme**  _[düşük · okur]_
   - Adımlar: Modalda 'Sorumlu Müdür *' açılır listesini tıkla ve bir isim seç.
   - Beklenen: Listede yalnızca rolü tam olarak 'manager' olan kullanıcılar vardır (büyük/küçük harf ve boşluk farkı yok sayılır); altında 'Yalnızca rolü müdür olan kullanıcılar listelenir.' notu durur. Her seçenek ad soyad, yoksa name, yoksa e-posta, hiçbiri yoksa 'Kullanıcı' olarak yazılır.
   - Roller: Sayfayı açabilen herkes.

20. **Sorumlu Müdür listesi boş — kilitli açılır liste**  _[düşük · okur]_
   - Adımlar: Modalı aç ve 'Sorumlu Müdür *' listesini açmayı dene.
   - Beklenen: Liste disabled ve soluk; tek seçenek 'Manager rolü olan kullanıcı yok' yazar. Bu ekranın MEVCUT kodda beklenen durumudur: GET /users ?with= göndermediği için kullanıcı satırlarında roles alanı hiç gelmez, dolayısıyla hasRole(u,'manager') hiçbirini eşleştirmez. Kullanıcılar hâlâ yükleniyorsa aynı yerde 'Yükleniyor...' yazar.
   - Roller: Sayfayı açabilen herkes. 'get.users' claim'i olmayan rollerde de aynı boş liste görünür (sessiz 403).

21. **Madde Açıklaması yazma**  _[düşük · okur]_
   - Adımlar: Modalda 'Madde Açıklaması *' alanına (placeholder 'Örn: X konusundaki süreçlerin yeniden değerlendirilmesine...') metin yaz.
   - Beklenen: 3 satırlık kutuya yazdığın metin görünür. Sınır denemesi: 1000 karakterden uzun metin girip kaydet — sütun varchar(1000) olduğu için sunucu 400 ile reddeder ve 'Toplantı kararı kaydedilirken bir hata oluştu.' toast'ı çıkar. Tarayıcıda maxLength kısıtı yok.
   - Roller: Sayfayı açabilen herkes.

22. **Modalda Durum seçme**  _[düşük · okur]_
   - Adımlar: Modalda 'Durum *' açılır listesini aç ve sırayla 'Açık', 'Devam Ediyor', 'Tamamlandı', 'İptal' seçeneklerini dene.
   - Beklenen: Tam olarak bu dört seçenek vardır; varsayılan 'Açık'. Seçim gövdeye status olarak open / in_progress / done / cancelled değerleriyle gider.
   - Roller: Sayfayı açabilen herkes.

23. **Doğrulama — tarih boş**  _[düşük · okur]_
   - Adımlar: Modalı aç, tarih alanını temizle (takvim alanında sil), diğer alanları doldur, 'Kararı Kaydet'e bas.
   - Beklenen: 'Toplantı tarihi zorunludur.' kırmızı toast'ı çıkar, modal AÇIK kalır, hiçbir POST isteği atılmaz.
   - Roller: Sayfayı açabilen herkes.

24. **Doğrulama — açıklama boş / yalnızca boşluk**  _[düşük · okur]_
   - Adımlar: Modalı aç, 'Madde Açıklaması *' alanını boş bırak (ya da sadece birkaç boşluk yaz), 'Kararı Kaydet'e bas.
   - Beklenen: 'Madde açıklaması zorunludur.' toast'ı çıkar, modal açık kalır, POST atılmaz. Sadece boşluk girilen durumda da aynı sonuç (trim() ile bakılıyor).
   - Roller: Sayfayı açabilen herkes.

25. **Doğrulama — hiç manager yok**  _[düşük · okur]_
   - Adımlar: Sorumlu Müdür listesi 'Manager rolü olan kullanıcı yok' derken tarih ve açıklamayı doldur, 'Kararı Kaydet'e bas.
   - Beklenen: 'Manager rolü olan kullanıcı bulunamadı.' toast'ı çıkar, modal açık kalır, POST atılmaz. Mevcut kodda bu, ekranın varsayılan çıkmazıdır (bkz. 'Sorumlu Müdür listesi boş' senaryosu) — yani karar kaydetmek buradan mümkün olmuyor.
   - Roller: Sayfayı açabilen herkes.

26. **Doğrulama — sorumlu seçilmedi**  _[düşük · okur]_
   - Adımlar: Manager rolü olan kullanıcıların listelendiği bir kurulumda tarih ve açıklamayı doldur, 'Sorumlu Müdür *' listesini 'Seç' üzerinde bırak, 'Kararı Kaydet'e bas.
   - Beklenen: 'Sorumlu manager seçmelisiniz.' toast'ı çıkar, modal açık kalır, POST atılmaz.
   - Roller: Sayfayı açabilen herkes.

27. **Kararı Kaydet — kayıt denemesi**  _[orta · yazar]_
   - Adımlar: Modalda dört alanı da geçerli doldur ('Toplantı Tarihi', 'Sorumlu Müdür', 'Madde Açıklaması', 'Durum'), 'Kararı Kaydet'e bas. Ağ sekmesinde POST /boardMeetingDecisions gövdesini incele.
   - Beklenen: Gövde yalnızca meetingDate, itemDescription, status, assignedUserId taşır — itemNo YOKTUR. board_meeting_decisions.item_no ise notNull ve varsayılansız olduğu için sunucu 400 {"success":false,"message":"Validation failed","errors":[{"field":"item_no","message":"item_no is required"}]} döndürür; ekranda 'Toplantı kararı kaydedilirken bir hata oluştu.' toast'ı çıkar, modal AÇIK kalır ve board_meeting_decisions tablosuna satır EKLENMEZ. Backend item_no'yu kendisi doldurur hâle gelirse beklenen: modal kapanır, form sıfırlanır, yeni satır listeye eklenir ve tabloda bir satır + audit_logs'ta bir CREATE kaydı oluşur.
   - Roller: Sayfayı açabilen herkes deneyebilir; backend ayrıca 'post.board_meeting_decisions' claim'i arar (godmin bypass). Claim yoksa 403 → aynı hata toast'ı.

28. **Kaydederken buton etiketi ve kilidi**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlat, formu doldur, 'Kararı Kaydet'e bas ve butonu izle; istek uçarken tekrar tıkla.
   - Beklenen: Buton metni 'Kaydediliyor...' olur, disabled ve soluklaşır; ikinci tıklama ikinci bir POST üretmez. İstek bitince etiket 'Kararı Kaydet'e döner.
   - Roller: Sayfayı açabilen herkes.

29. **Yeni kayıt sıralamaya bakmadan listenin başına eklenir**  _[orta · yazar]_
   - Adımlar: POST başarılı olabilen bir kurulumda, geçmiş bir tarihle (örn. 2 yıl önce) yeni karar kaydet ve listenin ilk satırına bak. Sonra 'Yenile'ye bas.
   - Beklenen: Kayıt hemen listenin EN ÜSTÜNE eklenir — meeting_date desc sırasına göre değil. 'Yenile'ye basıldığında satır kendi doğru yerine (tarihe göre) iner. Sunucu id döndürmezse liste bunun yerine baştan okunur.
   - Roller: Sayfayı açabilen herkes.

30. **Satır içi Durum değiştirme**  _[YÜKSEK · yazar]_
   - Adımlar: Listede bir satırın 'Durum' kolonundaki açılır listeyi tıkla, farklı bir seçenek seç (örn. 'Açık' → 'Tamamlandı').
   - Beklenen: Hücredeki değer ANINDA değişir (istek beklenmeden). Ağ sekmesinde PUT /boardMeetingDecisions/<satır id> atılır, gövdesi {"_id":"…","status":"done"}; sunucu _id'yi bilinmeyen kolon diye düşürür, yalnızca status yazılır (diğer kolonlar silinmez). Onay sorulmaz, başarı toast'ı da çıkmaz. Kanıt: 'Yenile'ye basınca yeni durum sunucudan geri okunur; board_meeting_decisions satırının status kolonu open/in_progress/done/cancelled olarak değişir ve audit_logs'ta bir UPDATE kaydı oluşur.
   - Roller: Sayfayı açabilen herkes — satır kimin olduğuna bakılmaz, kilit/gizleme yok. Backend 'put.board_meeting_decisions' claim'i arar (godmin bypass).

31. **Durum değişikliği reddedilince geri alma**  _[orta · okur]_
   - Adımlar: Backend'i durdur (ya da 'put.board_meeting_decisions' claim'i olmayan bir rolle gir), listede bir satırın 'Durum' seçimini değiştir.
   - Beklenen: Hücre önce yeni değeri gösterir, sonra 'Durum güncellenirken hata oluştu.' toast'ı çıkar ve liste sayfa 1'den yeniden okunarak hücre ESKİ değerine döner. Silinmiş bir id ile denenirse sunucu 404 {"success":false,"message":"board_meeting_decisions not found"} döner ve yine geri alınır.
   - Roller: Claim'i olmayan her rol; godmin'de tetiklenmez.

32. **Sorumlu Müdür kolonu — atanmamış satır**  _[düşük · okur]_
   - Adımlar: assigned_user_id'si NULL olan bir kararı listede bul (ya da veritabanında bir satırın assigned_user_id'sini NULL yap ve 'Yenile'ye bas).
   - Beklenen: 'Sorumlu Müdür' hücresinde em-dash '—' görünür.
   - Roller: Sayfayı açabilen herkes.

33. **Sorumlu Müdür kolonu — isim çözümlenemiyor**  _[düşük · okur]_
   - Adımlar: assigned_user_id dolu bir kararı listede incele.
   - Beklenen: Hücrede ad soyad → name → e-posta sırasıyla ilk bulunan yazılır; kullanıcı /users cevabında hiç yoksa (veya silinmişse) 'Kullanıcı' yazar. GET /users ?with= göndermediği için profile alanı gelmez, dolayısıyla mevcut kodda beklenen görüntü e-posta adresidir, ad soyad değil.
   - Roller: Sayfayı açabilen herkes. 'get.users' claim'i olmayan rolde tüm satırlarda 'Kullanıcı' yazar.

34. **Madde No ve Toplantı Tarihi biçimi**  _[düşük · okur]_
   - Adımlar: Listede herhangi bir satırın 'Madde No' ve 'Toplantı Tarihi' hücrelerine bak.
   - Beklenen: Toplantı Tarihi tr-TR biçiminde (gg.aa.yyyy) yazılır; meeting_date boşsa '-' görünür. Madde No sayıyı gösterir, item_no gelmiyorsa '-' yazar.
   - Roller: Sayfayı açabilen herkes.

35. **Yükleniyor göstergeleri**  _[düşük · okur]_
   - Adımlar: Ağı yavaşlat, 'Yenile'ye bas ve 'Geçmiş Toplantı Kararları' başlığının sağını izle.
   - Beklenen: Kullanıcı isteği uçarken 'Kullanıcılar…', liste isteği uçarken 'Yükleniyor…' küçük yazıları görünür; ikisi aynı anda da çıkabilir. İstekler bitince ikisi de kaybolur.
   - Roller: Sayfayı açabilen herkes.

