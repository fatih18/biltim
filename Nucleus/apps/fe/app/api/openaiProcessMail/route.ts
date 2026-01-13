/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import { type NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const { data, mailSubject, _mailBody } = await req.json()

    if (!data || !data.Fizibilite) {
      return NextResponse.json({ error: 'Fizibilite verisi bulunamadı' }, { status: 400 })
    }

    const fizibiliteSheet = data.Fizibilite

    if (!Array.isArray(fizibiliteSheet)) {
      return NextResponse.json({ error: 'Geçersiz Fizibilite verisi' }, { status: 400 })
    }

    console.log(`📊 Fizibilite: ${fizibiliteSheet.length} satır`)

    // Excel verisini dengeli şekilde kısalt (ilk 80 satır)
    const limitedData = fizibiliteSheet.slice(0, 80)

    // OpenAI ile parse et
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sen bir Excel analiz uzmanısın. Fizibilite sayfasındaki verileri analiz edip AYNEN verilen JSON formatına dönüştüreceksin.

KURALLAR:
- Parantezli sayılar negatiftir: (4000) → -4000
- Tüm sayılar number tipinde olmalı
- yillikProjeksiyon.yillar array'inde 2025'ten 2034'e kadar tam 10 yıl olmalı
- Eksik yıllar için 0 değerleriyle dolu objeler oluştur
- SADECE geçerli JSON döndür, başka hiçbir açıklama yazma`,
        },
        {
          role: 'user',
          content: `Bu Excel verisini analiz et ve AYNEN aşağıdaki JSON formatında döndür:

{
  "paraBirimi": { "birim": "USD" },
  "yazimTiklayin": "Yazıp tıklayınız",
  "urunAlisFiyati": 0,
  "kur": 0,
  "urunAlisFiyatiTL": 0,
  "urunSatisFiyati": 0,
  "musteri": {
    "ismi": "Test Muster",
    "mevcutYeni": "yeni",
    "cihazAlisMaliyeti": 0,
    "taksitSayisi": 0,
    "cihazSatisTutari": 0,
    "taksitSayisi2": 0,
    "damgaVergisi": "TT Ödeyecek"
  },
  "projeTuru": "Diğer",
  "karar": { "pulu": false, "kamuIhalePayi": false },
  "calistilanAy": "Nisan",
  "calistilanYil": 2025,
  "vergiOranlari": {
    "wacc": 1.0,
    "vergi": 1.35,
    "digerVergiler": { "value": 20.0, "percentage1": 15.0, "percentage2": 20.0 }
  },
  "aciklamaBilgileri": {
    "verilecekCihazla": "",
    "cihazDetayiTurkce": "",
    "cihazDetayiIngilizce": "",
    "odemeTipi": "peşin",
    "urun": "cihaz"
  },
  "finansalTablo": {
    "toplam": {
      "gelir": 4200,
      "opex": -4097,
      "cihazMaliyeti": -4000,
      "damgaVergisi": 40,
      "otherOpex": -57,
      "ebit": 103,
      "corporateTax": -21,
      "cf": 83,
      "dcf": 82,
      "pp": 0
    },
    "nisan25": {
      "gelir": 4200,
      "opex": -4097,
      "cihazMaliyeti": -4000,
      "damgaVergisi": 40,
      "otherOpex": -57,
      "ebit": 103,
      "corporateTax": -21,
      "cf": 83,
      "dcf": 82,
      "pp": 0
    }
  },
  "yillikProjeksiyon": {
    "baslik": "CF(TL)",
    "yillar": [
      {"yil": 2025, "gelir": 4200, "opex": -4097, "cihazMaliyeti": -4000, "damgaVergisi": 40, "otherOpex": -57, "ebit": 103, "corporateTax": -21, "cf": 83, "dcf": 82},
      {"yil": 2026, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2027, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2028, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2029, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2030, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2031, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2032, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2033, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0},
      {"yil": 2034, "gelir": 0, "opex": 0, "cihazMaliyeti": 0, "damgaVergisi": 0, "otherOpex": 0, "ebit": 0, "corporateTax": 0, "cf": 0, "dcf": 0}
    ]
  },
  "sonuclar": {
    "ebit": 103,
    "npv": 82,
    "ebitYuzde": 2.5,
    "npvYuzde": 2.0
  }
}

EXCEL VERİSİ (Fizibilite sayfası):
${JSON.stringify(limitedData)}

Mail Konusu: ${mailSubject || ''}

ÖNEMLİ: 
- Yukarıdaki JSON formatını AYNEN koru
- Tüm field'ları doldur
- yillikProjeksiyon.yillar array'inde tam 10 yıl (2025-2034) olmalı
- Parantezli sayıları negatif yap
- SADECE JSON döndür`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 3000,
    })

    const parsedJson = completion.choices[0]?.message?.content

    if (!parsedJson) {
      throw new Error("OpenAI'dan yanıt alınamadı")
    }

    // JSON geçerliliğini kontrol et
    let jsonData: any
    try {
      jsonData = JSON.parse(parsedJson)
    } catch (_parseError) {
      console.error('❌ Geçersiz JSON:', parsedJson.substring(0, 500))
      throw new Error('OpenAI geçersiz JSON döndürdü. Lütfen tekrar deneyin.')
    }

    // Yıl sayısını kontrol et
    const yilSayisi = jsonData.yillikProjeksiyon?.yillar?.length || 0
    if (yilSayisi !== 10) {
      console.warn(`⚠️ Eksik yıl verisi: ${yilSayisi}/10`)
    }

    const duration = Date.now() - startTime
    console.log(`✅ Başarılı: ${duration}ms`)
    console.log(`📊 Müşteri: ${jsonData.musteri?.ismi}`)
    console.log(`📅 Yıl sayısı: ${yilSayisi}/10`)

    return NextResponse.json({ parsedJson })
  } catch (err) {
    console.error('API Hatası:', err)
    return NextResponse.json(
      {
        error: 'OpenAI ile işlenirken hata oluştu',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
