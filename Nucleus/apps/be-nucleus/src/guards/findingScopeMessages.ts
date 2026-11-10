/** What the findings limit tells the caller it refused: what is wrong, why, and what to do (findingScope.ts). */

export const UNIDENTIFIED_MESSAGE = 'Oturum doğrulanamadı; lütfen yeniden giriş yapın.'

export const FINDING_WRITE_MESSAGE =
  'Bu bulgu, saha sorumlusu olduğunuz lokasyonlardan birine ait değil. Saha sorumlusu yalnız kendi lokasyonunun bulgusunu kapatabilir ya da değiştirebilir; bu işlemi bulgunun lokasyonundaki saha sorumlusu ya da Merkez Ekip yapmalıdır.'

export const FINDING_READ_MESSAGE =
  'Bu bulguyu görme yetkiniz yok: saha sorumlusu yalnız kendi lokasyonlarının bulgularını görür. Bu bulgu başka bir lokasyona ait; ilgili lokasyonun saha sorumlusuyla ya da Merkez Ekip ile görüşün.'

export const FINDING_DISTINCT_MESSAGE =
  'Bu liste saha sorumlusuna kapalı: ayrık değer listesi bütün lokasyonların bulgularını kapsar. Bulguları, kendi lokasyonlarınızla sınırlı olan Bulgular ekranından görüntüleyin.'

export const FINDING_BULK_MESSAGE =
  'Toplu bulgu değişikliği saha sorumlusuna kapalı; her bulgu, kendi lokasyonunuzdaysa tek tek kapatılır. Bulguyu Bulgular ekranından açıp işlemi orada yapın.'

export const FINDING_FILTER_FORM_MESSAGE =
  'Bulgu listesi süzgeçleri bu biçimde okunamıyor: saha sorumlusunun listesi kendi lokasyonlarıyla sınırlanır ve bu sınır yalnız JSON dizisi olarak gönderilen "filters" parametresine eklenebilir. Süzgeçleri o biçimde gönderin.'
