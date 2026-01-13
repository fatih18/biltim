/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

interface ValidationResult {
  isValid: boolean
  missingFields: string[]
}

function validateParsedMail(parsed: any, showDebug: boolean = true): ValidationResult {
  const missingFields: string[] = []

  // Debug: Gelen veriyi kontrol et
  if (showDebug) {
    console.log('🔍 Validation başladı')
    console.log('📦 Gelen veri:', JSON.stringify(parsed, null, 2))
    console.log('📊 Veri tipi:', typeof parsed)
  }

  // Veri kontrolü
  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, missingFields: ['Geçersiz veri formatı'] }
  }

  // Project validasyonu
  if (showDebug) console.log('Project kontrolü:', parsed.project)

  if (!parsed.project) {
    missingFields.push('Proje Bölümü (Tüm proje verisi eksik)')
  } else {
    if (!parsed.project.id || parsed.project.id.trim() === '') {
      missingFields.push('Proje ID')
      if (showDebug) console.log('❌ Proje ID eksik:', parsed.project.id)
    }
    if (!parsed.project.title || parsed.project.title.trim() === '') {
      missingFields.push('Proje Adı')
      if (showDebug) console.log('❌ Proje Adı eksik:', parsed.project.title)
    }
    if (!parsed.project.projectDate || parsed.project.projectDate.trim() === '') {
      missingFields.push('Proje Tarihi')
      if (showDebug) console.log('❌ Proje Tarihi eksik:', parsed.project.projectDate)
    }
    if (!parsed.project.currency || parsed.project.currency.trim() === '') {
      missingFields.push('Para Birimi')
      if (showDebug) console.log('❌ Para Birimi eksik:', parsed.project.currency)
    }
    if (
      parsed.project.exchangeRateToTry === null ||
      parsed.project.exchangeRateToTry === undefined ||
      parsed.project.exchangeRateToTry === ''
    ) {
      missingFields.push('Döviz Kuru')
      if (showDebug) console.log('❌ Döviz Kuru eksik:', parsed.project.exchangeRateToTry)
    }
    if (!parsed.project.customerName || parsed.project.customerName.trim() === '') {
      missingFields.push('Müşteri Adı')
      if (showDebug) console.log('❌ Müşteri Adı eksik:', parsed.project.customerName)
    }
    if (
      parsed.project.trackInvestment === null ||
      parsed.project.trackInvestment === undefined ||
      parsed.project.trackInvestment === ''
    ) {
      missingFields.push('Yatırım Takibi')
      if (showDebug) console.log('❌ Yatırım Takibi eksik:', parsed.project.trackInvestment)
    }
  }

  // Purchase validasyonu
  if (showDebug) console.log('Purchase kontrolü:', parsed.purchase)

  if (!parsed.purchase) {
    missingFields.push('Satın Alma Bölümü (Tüm satın alma verisi eksik)')
  } else {
    if (
      (parsed.purchase.baseCost === null ||
        parsed.purchase.baseCost === undefined ||
        parsed.purchase.baseCost === '') &&
      parsed.purchase.baseCost !== 0
    ) {
      missingFields.push('Temel Maliyet')
      if (showDebug) console.log('❌ Temel Maliyet eksik:', parsed.purchase.baseCost)
    }
    if (!parsed.purchase.payment?.type || parsed.purchase.payment.type.trim() === '') {
      missingFields.push('Satın Alma Ödeme Tipi')
      if (showDebug) console.log('❌ Ödeme Tipi eksik:', parsed.purchase.payment)
    }
    if (
      parsed.purchase.payment?.value === null ||
      parsed.purchase.payment?.value === undefined ||
      parsed.purchase.payment?.value === ''
    ) {
      missingFields.push('Satın Alma Vade Süresi')
      if (showDebug) console.log('❌ Vade Süresi eksik:', parsed.purchase.payment?.value)
    }
    if (
      parsed.purchase.damgaVergisiIncluded === null ||
      parsed.purchase.damgaVergisiIncluded === undefined ||
      parsed.purchase.damgaVergisiIncluded === ''
    ) {
      missingFields.push('Damga Vergisi Dahil mi?')
      if (showDebug) console.log('❌ Damga Vergisi eksik:', parsed.purchase.damgaVergisiIncluded)
    }
  }

  // Sales validasyonu
  if (showDebug) console.log('Sales kontrolü:', parsed.sales)

  if (!parsed.sales) {
    missingFields.push('Satış Bölümü (Tüm satış verisi eksik)')
  } else {
    if (
      (parsed.sales.desiredMargin === null ||
        parsed.sales.desiredMargin === undefined ||
        parsed.sales.desiredMargin === '') &&
      parsed.sales.desiredMargin !== 0
    ) {
      missingFields.push('Hedef Kar Marjı')
      if (showDebug) console.log('❌ Kar Marjı eksik:', parsed.sales.desiredMargin)
    }
    if (!parsed.sales.payment?.type || parsed.sales.payment.type.trim() === '') {
      missingFields.push('Satış Ödeme Tipi')
      if (showDebug) console.log('❌ Satış Ödeme Tipi eksik:', parsed.sales.payment)
    }
    if (
      parsed.sales.payment?.value === null ||
      parsed.sales.payment?.value === undefined ||
      parsed.sales.payment?.value === ''
    ) {
      missingFields.push('Satış Vade Süresi')
      if (showDebug) console.log('❌ Satış Vade eksik:', parsed.sales.payment?.value)
    }
  }

  // Financing validasyonu
  if (showDebug) console.log('Financing kontrolü:', parsed.financing)

  if (!parsed.financing) {
    missingFields.push('Finansman Bölümü (Tüm finansman verisi eksik)')
  } else {
    if (
      (parsed.financing.monthlyRate === null ||
        parsed.financing.monthlyRate === undefined ||
        parsed.financing.monthlyRate === '') &&
      parsed.financing.monthlyRate !== 0
    ) {
      missingFields.push('Aylık Faiz Oranı')
      if (showDebug) console.log('❌ Aylık Faiz eksik:', parsed.financing.monthlyRate)
    }
    if (
      (parsed.financing.annualDiscountRate === null ||
        parsed.financing.annualDiscountRate === undefined ||
        parsed.financing.annualDiscountRate === '') &&
      parsed.financing.annualDiscountRate !== 0
    ) {
      missingFields.push('Yıllık İskonto Oranı')
      if (showDebug) console.log('❌ Yıllık İskonto eksik:', parsed.financing.annualDiscountRate)
    }
  }

  // Eksik alan varsa alert göster
  if (missingFields.length > 0) {
    const errorMessage = `⚠️ Mail'den şu bilgiler çıkarılamadı:\n\n${missingFields
      .map((field, index) => `${index + 1}. ${field}`)
      .join('\n')}\n\nLütfen mail içeriğini kontrol edin veya eksik bilgileri manuel olarak girin.`

    alert(errorMessage)
    console.error('❌ Eksik alanlar:', missingFields)
  } else {
    console.log('✅ Tüm alanlar doğrulandı!')
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  }
}

export default validateParsedMail
