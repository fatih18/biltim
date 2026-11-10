import { describe, expect, it } from 'bun:test'
import { reportDownloadFailureMessage } from './downloadFailureMessage'

describe('reportDownloadFailureMessage', () => {
  it('uses the server\'s own sentence for a refusal it explains', () => {
    expect(reportDownloadFailureMessage(403, 'Bu lokasyonun formunu görme yetkiniz yok.')).toBe(
      'Bu lokasyonun formunu görme yetkiniz yok.'
    )
    expect(reportDownloadFailureMessage(404, ' Denetim bulunamadı. ')).toBe('Denetim bulunamadı.')
    expect(reportDownloadFailureMessage(400, 'Lokasyon seçilmedi.')).toBe('Lokasyon seçilmedi.')
  })

  it('says what to do when a 403 comes with no sentence', () => {
    expect(reportDownloadFailureMessage(403, '')).toContain('Merkez Ekip')
  })

  it('tells an expired session to sign in again, whatever the server said', () => {
    expect(reportDownloadFailureMessage(401, 'Unauthorized')).toContain('Yeniden giriş yapıp tekrar deneyin')
  })

  it('treats status 0 as a lost connection and asks to try again', () => {
    const message = reportDownloadFailureMessage(0, '')
    expect(message).toContain('bağlantı')
    expect(message).toContain('tekrar deneyin')
  })

  it('names the status of any other failure and ignores a body it cannot trust', () => {
    const message = reportDownloadFailureMessage(500, 'stack trace here')
    expect(message).toContain('500')
    expect(message).not.toContain('stack trace')
  })
})
