// Bulgu tipleri: değer + label listesi
export const FINDING_TYPE_OPTIONS = [
    { value: "alan-ayrilmamis", label: "Alan ayrılmamış" },
    { value: "amaci-disinda-kullanilan-malzeme", label: "Amacı dışında kullanılan malzeme" },
    { value: "atik-malzeme", label: "Atık malzeme" },
    { value: "ayristirilmamis-malzeme", label: "Ayrıştırılmamış malzeme" },
    { value: "belirsiz-malzeme", label: "Belirsiz malzeme" },
    { value: "dokumantasyon-guncel-degil-eksik", label: "Dokümantasyon güncel değil/eksik" },
    { value: "boru-isareti-boyasi-yok", label: "Boru işareti/boyası yok" },
    { value: "bozuk-zemin-duvar", label: "Bozuk zemin/duvar" },
    { value: "depolama-uygun-degil", label: "Depolama uygun değil" },
    { value: "daginik-alan", label: "Dağınık alan" },
    { value: "duzensiz-dolap", label: "Düzensiz dolap" },
    { value: "duzensiz-raf", label: "Düzensiz raf" },
    { value: "ergonomik-degil", label: "Ergonomik değil" },
    { value: "hasarli-malzeme-ekipman", label: "Hasarlı malzeme/ekipman" },
    { value: "kirmizi-etiket-yok", label: "Kırmızı etiket yok" },
    { value: "klasor-sirtligi-uygun-degil", label: "Klasör sırtlığı uygun değil" },
    { value: "kullanim-disi-atil-malzeme", label: "Kullanım dışı/Atıl malzeme" },
    {
        value: "ortam-sartlari-yetersiz",
        label: "Ortam şartları yetersiz (Aydınlatma, Ses, Havalandırma, Titreşim)",
    },
    { value: "pano-guncel-degil", label: "Pano güncel değil" },
    {
        value: "tanimlanmis-alan-disinda-olan-malzeme",
        label: "Tanımlanmış alan dışında olan malzeme",
    },
    { value: "tanimsiz-alan", label: "Tanımsız alan" },
    { value: "tanimsiz-dolap", label: "Tanımsız dolap" },
    { value: "tanimsiz-malzeme", label: "Tanımsız malzeme" },
    { value: "tanimsiz-raf", label: "Tanımsız raf" },
    { value: "temiz-olmayan-alan", label: "Temiz olmayan alan" },
    { value: "yipranmis-levha-etiket-tabela", label: "yıpranmış levha/etiket/tabela" },
    { value: "temiz-olmayan-makine-malzeme", label: "Temiz olmayan makine/malzeme" },
    {
        value: "temizlik-malzemeleri-eksik-uygun-degil",
        label: "Temizlik malzemeleri eksik/uygun değil",
    },
    {
        value: "temizlik-malzemeleri-yerinde-degil",
        label: "Temizlik malzemeleri yerinde değil",
    },
    {
        value: "temizlik-formu-yok-guncel-degil",
        label: "Temizlik formu yok/güncel değil",
    },
    { value: "zemin-isareti-boyasi-yok", label: "Zemin işareti/boyası yok" },
    { value: "malzeme-dosya-listesi-yok", label: "Malzeme/dosya listesi yok" },
] as const;

export type FindingType = (typeof FINDING_TYPE_OPTIONS)[number]["value"];



export const ACTION_TO_TAKE_OPTIONS = [
    { value: "amacina-uygun-kullanilmali", label: "Amacına uygun kullanılmalı" },
    { value: "atik-kutusuna-atilmali", label: "Atık kutusuna atılmalı" },
    { value: "ayiklanmali", label: "Ayıklanmalı (Sınıflanmalı)" },
    { value: "boyanmali", label: "Boyanmalı" },
    { value: "degistirilmeli", label: "Değiştirilmeli" },
    { value: "klasorler-standart-hale-getirilmeli", label: "Klasörler standart hale getirilmeli" },
    { value: "duzenlenmeli", label: "Düzenlenmeli (Sıralanmalı)" },
    { value: "ergonomik-hale-getirilmeli", label: "Ergonomik hale getirilmeli" },
    { value: "guncellenmeli", label: "Güncellenmeli" },
    { value: "kaldirilmali", label: "Kaldırılmalı" },
    { value: "kirmizi-etiket-takilmali", label: "Kırmızı etiket takılmalı" },
    { value: "sabitlenmeli", label: "Sabitlenmeli" },
    { value: "standartlastirilmali", label: "Standartlaştırılmalı" },
    { value: "surdurulmeli", label: "Sürdürülmeli" },
    { value: "tamir-edilmeli", label: "Tamir edilmeli" },
    { value: "tanimlanmali", label: "Tanımlanmalı" },
    { value: "tanimli-yere-konulmali", label: "Tanımlı yere konulmalı" },
    { value: "temizlenmeli", label: "Temizlenmeli (Silip Süpürülmeli)" },
] as const;

export type ActionToTake = (typeof ACTION_TO_TAKE_OPTIONS)[number]["value"];
export type StepCode = "S1" | "S2" | "S3" | "S4" | "S5";

export interface Step {
    code: StepCode;
    title: string;
    maxScore: number;
    order: number;
}

export interface Question {
    id: string;
    stepCode: StepCode;
    order: number;
    text: string;
    maxScore: number;
    requireExplanation: boolean;
}
export const steps: Step[] = [
    { code: "S1", title: "1 - Sınıflandırma (Ayıklama)", maxScore: 20, order: 1 },
    { code: "S2", title: "2 - Sıralama (Düzenleme)", maxScore: 20, order: 2 },
    { code: "S3", title: "3 - Sil / Süpür (Temizlik)", maxScore: 20, order: 3 },
    { code: "S4", title: "4 - Standartlaştırma", maxScore: 20, order: 4 },
    { code: "S5", title: "5 - Sürdürme", maxScore: 20, order: 5 },
];


export const questions: Question[] = [
    // S1
    {
        id: "S1-Q1",
        stepCode: "S1",
        order: 1,
        text: `Dolaplarda (takım/malzeme/dosya) tanımlananlar dışında klasör/malzemeler var mı?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S1-Q2",
        stepCode: "S1",
        order: 2,
        text: `Çekmecelerde ihtiyaç duyulmayan, gereksiz malzemeler var mı?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S1-Q3",
        stepCode: "S1",
        order: 3,
        text: `Sosyal alanda (Çay Ocağı, Dinlenme Yerleri vb.) ihtiyaç duyulmayan, gereksiz malzemeler var mı?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S1-Q4",
        stepCode: "S1",
        order: 4,
        text: `1-2-3 maddeler dışında kalan alanlarda ayıklamalar yapılıyor mu?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S1-Q5",
        stepCode: "S1",
        order: 5,
        text: `Ayıklama Listesi güncel mi? Ayıklanan malzemeler ile liste uyumlu mu? (Alanda ayıklanmayan malzemeler var ve ayıklama listesine eklenmediyse liste uyumlu değildir.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S1-Q6",
        stepCode: "S1",
        order: 6,
        text: `Kırmızı Kart uygulanıyor mu? (Karar bekleyen malzeme bulunuyorsa kırmızı kart olmalıdır. Ayıklama kararları hemen alınıyorsa kırmızı kart olmasına gerek yoktur.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S1-Q7",
        stepCode: "S1",
        order: 7,
        text: `Kırmızı kartlı malzemeler uygun alanda muhafaza ediliyor mu? (5S Kırmızı Etiketli Malzeme Alanı'nda veya büyük malzemeler için kendi yerlerinde olmalıdır. Karar verilmeyen malzeme olması durumunda 5S Kırmızı Etiketli Malzeme Alanı olması gerekir, eğer karar verilmeyen malzeme yok ise alana gerek yoktur.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S1-Q8",
        stepCode: "S1",
        order: 8,
        text: `Ayıklanan malzemeler ile ilgili karar alınıyor mu?`,
        maxScore: 2.5,
        requireExplanation: true,
    },

    // S2
    {
        id: "S2-Q1",
        stepCode: "S2",
        order: 1,
        text: `Alan tanımlamaları (Tabela) yapıldı mı?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S2-Q2",
        stepCode: "S2",
        order: 2,
        text: `Dosya/Takım/Malzeme dolabında tanımlama (etiketleme) yapıldı mı?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S2-Q3",
        stepCode: "S2",
        order: 3,
        text: `Malzeme Listesi/Dosya Listesi oluşturulmuş mu?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S2-Q4",
        stepCode: "S2",
        order: 4,
        text: `Çekmecelerde tanımlama (etiketleme) yapıldı mı?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S2-Q5",
        stepCode: "S2",
        order: 5,
        text: `Sosyal alanda (Çay Ocağı, Dinlenme Yerleri vb.) tanımlama (etiketleme) yapıldı mı? (Sosyal alanı bulunmayan bölgelerde bu madde tam puan verilerek değerlendirilmelidir.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S2-Q6",
        stepCode: "S2",
        order: 6,
        text: `İşaret renk uygulaması uygun mu? (Çizgi ve akışkan boru standartları) (Ekipmanların yerlerinin belirlendiği, akışkanların boru renklerinin ve tanımları görülmelidir.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S2-Q7",
        stepCode: "S2",
        order: 7,
        text: `Alanda bulunan (dolap, çekmece dışındaki) malzemeler tanımlanmış (etiket) mı?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S2-Q8",
        stepCode: "S2",
        order: 8,
        text: `Dolap/raf/çekmece/yangın söndürücüleri vb. önleri açık mı, ulaşılabilir mi?`,
        maxScore: 2.5,
        requireExplanation: true,
    },

    // S3
    {
        id: "S3-Q1",
        stepCode: "S3",
        order: 1,
        text: `Temizlik Standardı var mı? (Varsa ve güncelse tam puan verilir. Bu sorunun tam puan olması durumunda aşağıdaki soru da tam puan olmalıdır.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S3-Q2",
        stepCode: "S3",
        order: 2,
        text: `Temizlik Standardı tüm alanları kapsıyor mu?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S3-Q3",
        stepCode: "S3",
        order: 3,
        text: `Temizlik Planı uygulanıyor mu?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S3-Q4",
        stepCode: "S3",
        order: 4,
        text: `Temizlik Standardı'nda belirlenen temizlik noktaları temiz mi?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S3-Q5",
        stepCode: "S3",
        order: 5,
        text: `Temizlik istasyonu mevcut mu? (O bölge için temizlik standardında belirtilen ekipmanların bir alanda tanımlı bir şekilde bulunduğu gösterilmelidir.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S3-Q6",
        stepCode: "S3",
        order: 6,
        text: `Temizlik istasyonundaki ekipmanlar yeterli mi? (Temizlik standardında belirtilen ekipmanların alanda gösterilmesi beklenir.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S3-Q7",
        stepCode: "S3",
        order: 7,
        text: `Kirlilik kaynakları belirlenmiş mi?`,
        maxScore: 2.5,
        requireExplanation: true,
    },
    {
        id: "S3-Q8",
        stepCode: "S3",
        order: 8,
        text: `Kirlilik kaynakları ile mücadele yapılıyor mu? (Kirlilik kaynakları için aksiyon çalışması gösterilmesi beklenir. E-posta, toplantı kararı olabilir.)`,
        maxScore: 2.5,
        requireExplanation: true,
    },

    // S4 (2.9 puan)
    {
        id: "S4-Q1",
        stepCode: "S4",
        order: 1,
        text: `5S Görsel Standartları çalışanlar tarafından biliniyor mu? (İlk 3 maddenin etkin yapılması durumunda tam puan verilir.)`,
        maxScore: 2.9,
        requireExplanation: true,
    },
    {
        id: "S4-Q2",
        stepCode: "S4",
        order: 2,
        text: `Çalışanlar 5S sorumluluklarını biliyor mu? Kanıt var mı? (Panolarda kendilerine verilen görevlerden haberdarlar mı? Örneğin Temizlik Standardı'nda belirtilen sorumlu kişi görevini yapmış mı, temizliği tamamlayıp temizlik planını doldurmuş mu?)`,
        maxScore: 2.9,
        requireExplanation: true,
    },
    {
        id: "S4-Q3",
        stepCode: "S4",
        order: 3,
        text: `5S Panosu çalışanlar tarafından biliniyor mu?`,
        maxScore: 2.9,
        requireExplanation: true,
    },
    {
        id: "S4-Q4",
        stepCode: "S4",
        order: 4,
        text: `5S Panosu'nda olması gereken standart dokümanlar mevcut mu?`,
        maxScore: 2.9,
        requireExplanation: true,
    },
    {
        id: "S4-Q5",
        stepCode: "S4",
        order: 5,
        text: `5S Panosu güncel mi?`,
        maxScore: 2.9,
        requireExplanation: true,
    },
    {
        id: "S4-Q6",
        stepCode: "S4",
        order: 6,
        text: `Önce Sonra İyileştirme Formları oluşturulmuş mu ve güncelleniyor mu? (Her adım için Önce Sonra Formlarının güncel olması beklenir. Ortak ya da herhangi bir yerden görülmesi yeterli.)`,
        maxScore: 2.9,
        requireExplanation: true,
    },
    {
        id: "S4-Q7",
        stepCode: "S4",
        order: 7,
        text: `Çalışma koşulları (Havalandırma, Aydınlatma) uygun mu? (Karanlık ortamda düzensizliği görememe, panoyu net görememe vb. durumlarında düşük puan değerlendirmesi yapılır.)`,
        maxScore: 2.9,
        requireExplanation: true,
    },

    // S5 (3.33 puan)
    {
        id: "S5-Q1",
        stepCode: "S5",
        order: 1,
        text: `5S iç denetimleri zamanında yapılıyor mu? (En fazla 15 günde 1 olacak şekilde iç denetim formları görülmelidir.)`,
        maxScore: 3.33,
        requireExplanation: true,
    },
    {
        id: "S5-Q2",
        stepCode: "S5",
        order: 2,
        text: `5S iç denetim aksiyonları zamanında tamamlanıyor mu? (İç denetim formlarında yazılan aksiyonların tamamlanıp tamamlanmadığı kontrol edilir.)`,
        maxScore: 3.33,
        requireExplanation: true,
    },
    {
        id: "S5-Q3",
        stepCode: "S5",
        order: 3,
        text: `5S denetim aksiyonları zamanında tamamlanıyor mu? (Bir önceki dış denetim bulgularına bakılır. Tamamlanmış olması beklenir.)`,
        maxScore: 3.33,
        requireExplanation: true,
    },
    {
        id: "S5-Q4",
        stepCode: "S5",
        order: 4,
        text: `5S denetim sonuçlarında bir önceki denetimlere göre ilerleme görülüyor mu? (Bu maddeden beklenti hedef puana yaklaşımın artmasıdır.)`,
        maxScore: 3.33,
        requireExplanation: true,
    },
    {
        id: "S5-Q5",
        stepCode: "S5",
        order: 5,
        text: `5S Eğitimleri işbaşı yapan çalışan dahil tüm çalışanlara verilmiş mi? (Bölge sorumlusundan yöneticisinden aldığı, eğitim durumunu belirten e-postaya bakılır. Herkese atanmış olan Dijital 5S Eğitiminin seçilen herhangi bir çalışana verilip verilmediğine bakılır.)`,
        maxScore: 3.33,
        requireExplanation: true,
    },
    {
        id: "S5-Q6",
        stepCode: "S5",
        order: 6,
        text: `Görsel standartlar kapsamında yapılan çalışmaların yenileme ihtiyaçları karşılanıyor mu? (Örnek: Yıpranmış etiketler yenilenmesi, kırık tabela yenilenmesi, klasör şablonunun yenilenmesi vb.)`,
        maxScore: 3.33,
        requireExplanation: true,
    },
];
