/**
 * A refused or failed Excel download on the Reports page, said as what is
 * wrong and what to do. The server's own sentence wins for a refusal it
 * explains itself (no location chosen, no such audit, not your location);
 * status 0 is "no answer at all", which `downloadFile` also answers when the
 * connection drops halfway through the file.
 */
export function reportDownloadFailureMessage(status: number, serverMessage: string): string {
  const said = serverMessage.trim()
  if (status === 401) {
    return 'Oturumunuz sona ermiş, Excel indirilemedi. Yeniden giriş yapıp tekrar deneyin.'
  }
  if ((status === 400 || status === 403 || status === 404) && said) return said
  if (status === 403) {
    return 'Bu raporu indirme yetkiniz yok. Gerekli yetki için Merkez Ekip ile görüşün.'
  }
  if (status === 0) {
    return 'Sunucuya ulaşılamadı ya da bağlantı yarıda kesildi, Excel indirilemedi. Bağlantınızı kontrol edip tekrar deneyin.'
  }
  return `Excel hazırlanamadı (sunucu yanıtı ${status}). Biraz sonra tekrar deneyin; sürerse Biltim ile iletişime geçin.`
}
