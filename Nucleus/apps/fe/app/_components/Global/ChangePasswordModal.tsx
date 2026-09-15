'use client'

import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useModal } from '@/app/_hooks/UseModal'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

/*
 * Kullanıcının kendi şifresini değiştirmesi.
 *
 * Bu ekran yokken şifresini değiştirmek isteyen kişinin tek yolu bir yöneticiye
 * gitmekti; unutan kişinin ise hiçbir yolu yoktu, çünkü kurulumda SMTP yok ve
 * "şifremi unuttum" bağlantısı hiç gönderilemiyor. Sunucu tarafı
 * (`POST /auth/password-change`) kurulu sürümde zaten vardı, yalnızca config'de
 * kapalıydı ve arayüzden çağıran kimse yoktu.
 *
 * Şifre kuralları burada tekrar edilmiyor: sunucu kurulumun kendi politikasını
 * uyguluyor ve reddederse sebebini cümleyle söylüyor. Buraya ikinci bir kural
 * kopyası koymak, iki kuralın kaydığı gün formun "geçerli" dediği şifrenin
 * sunucuda reddedilmesi demek olurdu.
 */
export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const actions = useGenericApiActions()
  const modal = useModal(onClose, { enabled: isOpen })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setDone(false)
      setSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  function handleSubmit() {
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler birbirini tutmuyor.')
      return
    }
    if (currentPassword.length === 0 || newPassword.length === 0) {
      setError('Alanlar boş olamaz.')
      return
    }

    setSubmitting(true)
    actions.CHANGE_MY_PASSWORD?.start({
      payload: { currentPassword, newPassword, confirmPassword },
      onAfterHandle: () => {
        setSubmitting(false)
        setDone(true)
      },
      onErrorHandle: (apiError: unknown) => {
        setSubmitting(false)
        setError(readErrorMessage(apiError) || 'Şifre değiştirilemedi.')
      },
    })
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        {...modal}
        className="w-full max-w-md rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shadow-2xl shadow-slate-950/60"
      >
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                <KeyRound size={18} aria-hidden="true" /> Şifremi Değiştir
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Mevcut şifrenizi bilmeniz gerekiyor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? 'Şifreleri gizle' : 'Şifreleri göster'}
              className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {done ? (
            <>
              <div className="rounded-lg border border-emerald-400 dark:border-emerald-400/40 bg-emerald-100 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                Şifreniz değiştirildi. Bundan sonraki girişlerde yeni şifrenizi kullanın.
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Kapat
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="current-password"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Mevcut şifre
                </label>
                <input
                  id="current-password"
                  type={visible ? 'text' : 'password'}
                  value={currentPassword}
                  autoComplete="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="my-new-password"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Yeni şifre
                </label>
                <input
                  id="my-new-password"
                  type={visible ? 'text' : 'password'}
                  value={newPassword}
                  autoComplete="new-password"
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="my-new-password-confirm"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Yeni şifre (tekrar)
                </label>
                <input
                  id="my-new-password-confirm"
                  type={visible ? 'text' : 'password'}
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClass}
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-rose-400 dark:border-rose-400/40 bg-rose-100 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
                >
                  İptal
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/*
 * Sunucunun söylediği sebep kullanıcıya ulaşmalı.
 *
 * "Mevcut şifre yanlış" ile "yeni şifre politikaya uymuyor" aynı kutuda
 * "Şifre değiştirilemedi" olarak görünürse, kişi hangisini düzelteceğini
 * bilemez. Cevap zarfı kurulumdan kuruluma farklı sarmalanıyor, o yüzden
 * bilinen yerlerin hepsine bakılıyor.
 */
function readErrorMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (typeof error !== 'object') return ''

  const candidate = error as Record<string, unknown>
  if (typeof candidate.message === 'string') return candidate.message
  if (typeof candidate.error === 'string') return candidate.error

  const errors = candidate.errors
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0]
    if (typeof first === 'string') return errors.join(' ')
    if (first && typeof first === 'object') {
      const message = (first as { message?: unknown }).message
      if (typeof message === 'string') return message
    }
  }

  const response = candidate.response as { data?: Record<string, unknown> } | undefined
  const nested = response?.data?.message
  if (typeof nested === 'string') return nested

  return ''
}
