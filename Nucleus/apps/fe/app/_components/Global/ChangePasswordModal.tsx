'use client'

import { Eye, EyeOff, KeyRound, LogIn } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useModal } from '@/app/_hooks/UseModal'
import { useGenericApiActions } from '@/app/_hooks/UseNucleusApi'
import {
  PasswordRuleList,
  passwordProblems,
  readServerReasons,
  SELF_SERVICE_PASSWORD_POLICY,
} from './PasswordRules'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  /** Şifre değiştikten sonra: oturum sunucuda bitti, kişi girişe gönderilmeli. */
  onSignedOut: () => void
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
 * Kural ekranda yazıyor ve gönderilmeden önce burada da kontrol ediliyor.
 * Kopya değil: `PasswordRules` kuralı sunucunun okuduğu config.json'dan okuyor.
 *
 * Başarıdan sonra kişi bu ekranda BIRAKILMIYOR. Sunucu şifre değişince
 * kişinin bütün oturumlarını — bu sekmedeki dahil — kapatıyor; "yeni şifrenizi
 * kullanın" deyip kapatmak, bir sonraki tıklamada açıklamasız bir giriş
 * ekranına düşmek demekti. Artık ne olduğunu söylüyor ve girişe kendisi
 * götürüyor.
 */
export function ChangePasswordModal({ isOpen, onClose, onSignedOut }: ChangePasswordModalProps) {
  const actions = useGenericApiActions()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)

  // Oturum bittikten sonra Escape ya da "kapat" da girişe götürmeli: geride
  // kalan ekran artık hiçbir isteği geçiremiyor. İstek sürerken de kapanmıyor:
  // cevap kapanmış bir modala gelirse sunucu oturumu bitirmiş olur ama kişiye
  // ne olduğunu söyleyecek ekran kalmaz.
  const modal = useModal(isSubmitting ? () => {} : done ? onSignedOut : onClose, {
    enabled: isOpen,
  })

  // Cevap geldiğinde modal hâlâ açık mı; kapanmışsa sonucu ekrana yazmak bir
  // sonraki açılışta eski bir "değiştirildi" paneli bırakır.
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  // useModal ilk odaklanabilir öğeye odaklanıyor; burada o, başlıktaki göz
  // düğmesi. Bu effect ondan SONRA çalışıyor ve odağı ilk alana alıyor.
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (isOpen) firstFieldRef.current?.focus()
  }, [isOpen])

  // Form kalkınca odak boşta kalmasın; Enter doğrudan girişe götürsün.
  const signInButtonRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (done) signInButtonRef.current?.focus()
  }, [done])

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors([])
      setDone(false)
      setSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault()
    if (isSubmitting) return
    setErrors([])

    if (currentPassword.length === 0) {
      setErrors(['Mevcut şifrenizi girin.'])
      return
    }
    const problems = passwordProblems(SELF_SERVICE_PASSWORD_POLICY, newPassword)
    if (problems.length > 0) {
      setErrors(problems)
      return
    }
    if (newPassword !== confirmPassword) {
      setErrors(['Yeni şifreler birbirini tutmuyor.'])
      return
    }

    setSubmitting(true)
    actions.CHANGE_MY_PASSWORD?.start({
      payload: { currentPassword, newPassword, confirmPassword },
      onAfterHandle: () => {
        setSubmitting(false)
        // Oturum sunucuda bitti; modal bir şekilde kapanmışsa da çıkış yapılmalı.
        if (!isOpenRef.current) {
          onSignedOut()
          return
        }
        setDone(true)
      },
      onErrorHandle: (apiError: unknown) => {
        setSubmitting(false)
        if (!isOpenRef.current) return
        const reasons = readServerReasons(apiError)
        setErrors(reasons.length > 0 ? reasons : ['Şifre değiştirilemedi.'])
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
            {done ? null : (
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? 'Şifreleri gizle' : 'Şifreleri göster'}
                className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>

          {done ? (
            <>
              <div
                role="status"
                className="space-y-2 rounded-lg border border-emerald-400 dark:border-emerald-400/40 bg-emerald-100 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
              >
                <p className="font-semibold">Şifreniz değiştirildi.</p>
                <p>
                  Güvenlik gereği şifre değişince bütün cihazlardaki oturumlarınız kapatılır, bu
                  cihazdaki de dahil. Devam etmek için yeni şifrenizle yeniden giriş yapın.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  ref={signInButtonRef}
                  type="button"
                  onClick={onSignedOut}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  <LogIn size={16} aria-hidden="true" /> Giriş sayfasına git
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="current-password"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Mevcut şifre
                </label>
                <input
                  ref={firstFieldRef}
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

              <PasswordRuleList policy={SELF_SERVICE_PASSWORD_POLICY} password={newPassword} />

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

              <div className="rounded-lg border border-amber-400 dark:border-amber-400/40 bg-amber-100 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                Şifre değişince bu cihaz dahil bütün oturumlarınız kapanır; yeni şifrenizle
                yeniden giriş yaparsınız.
              </div>

              {errors.length > 0 ? (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-400 dark:border-rose-400/40 bg-rose-100 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-200"
                >
                  {errors.length === 1 ? (
                    errors[0]
                  ) : (
                    <ul className="list-disc space-y-1 pl-4">
                      {errors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
