// app/actions/processMail.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function processMail(plainText: string) {
  const completion = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `Sen bir mail içeriği parser botusun. Görevin, gelen mail içeriğinden proje, satın alma, satış ve finansman bilgilerini çıkartıp JSON formatında döndürmektir.

ÖNEMLI KURALLAR:
1. Mail'de açıkça belirtilmeyen alanlar için null veya varsayılan değerler kullan
2. Tarih formatları: "1 Eylül 2025", "Eylül 2025", "01.09.2025", "2025-09-01" gibi farklı formatlarda gelebilir - hepsini YYYY-MM-DD formatına çevir
3. Para birimleri: "TRY", "Türk Lirası", "TL", "lira" gibi ifadeler TRY olarak algılanmalı
4. Sayılar: "11.890", "11890", "on bir bin sekiz yüz doksan" gibi farklı yazılışları sayıya çevir
5. Yüzde değerleri: "yüzde 16", "%16", "16%", "on altı" gibi ifadeleri sayıya çevir
6. Ödeme tipleri: "nakit", "peşin", "cash", "vade yok" -> "cash", vadeli ödemeler için "credit"
7. Boolean değerler: "Evet", "Hayır", "Var", "Yok", "Evet/Hayır" gibi Türkçe ifadeleri true/false'a çevir
8. Ek maliyetler: Her ek maliyet için benzersiz bir ID üret (x1, x2, x3...)
9. Kategori eşleştirme: "vergi", "damga vergisi" -> "tax", "lojistik", "nakliye" -> "logistics"
10. Mail'de "damga vergisi dahil", "içinde", "dahil ettik" gibi ifadeler varsa damgaVergisiIncluded: true

SAYILARI YAKALAMA:
- Yazıyla yazılmış sayıları rakama çevir: "on bir bin sekiz yüz doksan" -> 11890
- Noktalı ve noktalı virgüllü formatları ayırt et: "11.890" -> 11890, "0.948" -> 0.948, "1,3" -> 1.3
- Yüzde ifadelerinde "yüzde sıfır virgül dokuz yüz kırk sekiz" -> 0.948

TARİH YAKALAMA:
- "birinci günü", "başında", "itibarıyla" gibi ifadeler tarih belirtisi olabilir
- Ay isimlerini tanı: Ocak->01, Şubat->02, ..., Eylül->09, ...

MÜŞTERİ ADI:
- "John DOE 3", "değerli müşterimiz X", "müşteri: Y" gibi ifadelerden müşteri adını çıkar

YER TUTUCU DEĞİŞKENLER:
- Mail'de "birincisi", "ikincisi" gibi ifadelerle listelenen maliyetleri sırayla yakala
- "Bu kalemi ... kategorisinde değerlendiriyoruz" ifadesinden kategori bilgisi çıkar

Sadece geçerli JSON döndür, başka açıklama ekleme.`,
      },
      {
        role: 'user',
        content: `Mail içeriği:
${plainText}

Aşağıdaki JSON formatında döndür:
{
  "project": {
    "id": "string",
    "title": "string",
    "projectDate": "YYYY-MM-DD",
    "currency": "string",
    "exchangeRateToTry": number,
    "customerName": "string",
    "trackInvestment": boolean,
    "trackInvestments": boolean
  },
  "purchase": {
    "baseCost": number,
    "payment": { "type": "cash | credit", "value": number },
    "damgaVergisiIncluded": boolean,
    "additionalCosts": [
      {
        "id": "string",
        "label": "string",
        "amount": number,
        "category": "tax | logistics | other",
        "isPercentage": boolean,
        "percentageValue": number | null
      }
    ]
  },
  "sales": {
    "desiredMargin": number,
    "overridePrice": number | null,
    "payment": { "type": "cash | credit", "value": number }
  },
  "financing": {
    "monthlyRate": number,
    "annualDiscountRate": number
  }
}`,
      },
    ],
    response_format: { type: 'json_object' },
  })
  // OpenAI embedding
  const embed = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: plainText,
  })

  return {
    parsedJson: completion.choices[0]?.message?.content || '{}',
    embedding: embed.data[0]?.embedding,
  }
}
