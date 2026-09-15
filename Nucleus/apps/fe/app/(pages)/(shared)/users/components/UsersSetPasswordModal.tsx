'use client'

import { Copy, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useModal } from '@/app/_hooks/UseModal'

interface UsersSetPasswordModalProps {
  isOpen: boolean
  userEmail: string | undefined
  onConfirm: (password: string) => Promise<string | null>
  onClose: () => void
  isSubmitting: boolean
}

/*
 * Bir kullanıcının şifresini yönetici olarak değiştirmek.
 *
 * Biltim'de SMTP yok, yani "şifremi unuttum" bağlantısı hiçbir zaman gelmiyor.
 * Kalan tek kurtarma yolu bu: yönetici yeni bir şifre koyar ve kişiye kendisi
 * söyler. Söyleyebilmesi için şifreyi GÖREBİLMESİ gerekiyor — o yüzden alan
 * gizlenebilir ama varsayılan gizli değil ve yanında kopyalama var. Ekranda
 * kimsenin okuyamayacağı bir şifre koyup "kullanıcıya iletin" demek, işi
 * bitmiş göstermenin bir yolu olurdu.
 *
 * Şifre kuralını BURADA tekrar yazmıyoruz. Sunucu kurulumun kendi politikasını
 * uyguluyor ve reddederse sebebini cümleyle söylüyor; buraya ikinci bir kural
 * kopyası koymak, iki kuralın birbirinden kayacağı gün "geçerli" görünen bir
 * şifrenin sunucuda reddedilmesi demek. Tek yaptığımız kontrol, iki alanın
 * birbirini tutması — onu sunucu göremez.
 */
export function UsersSetPasswordModal({
  isOpen,
  userEmail,
  onConfirm,
  onClose,
  isSubmitting,
}: UsersSetPasswordModalProps) {
  const modal = useModal(onClose, { enabled: isOpen })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Bir kullanıcı için yazılan şifrenin bir sonraki kullanıcının kutusunda
  // durması, yanlış kişiye yanlış şifre vermenin en kolay yolu.
  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setConfirmPassword('')
      setError(null)
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  async function handleConfirm() {
    setError(null)

    if (password !== confirmPassword) {
      setError('İki şifre birbirini tutmuyor.')
      return
    }
    if (password.length === 0) {
      setError('Şifre boş olamaz.')
      return
    }

    const serverError = await onConfirm(password)
    if (serverError) {
      setError(serverError)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      // Panoya erişim yoksa (HTTP üzerinden sunulan bir sayfada olur) şifre
      // zaten ekranda görünüyor; sessizce geçiyoruz.
      setCopied(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        {...modal}
        className="w-full max-w-md rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shadow-2xl shadow-slate-950/60"
      >
        <div className="space-y-4 px-6 py-6">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              <KeyRound size={18} aria-hidden="true" /> Şifre Sıfırla
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Yeni şifreyi siz belirleyip kullanıcıya iletirsiniz.
            </p>
          </div>

          <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
            Şifresi değişecek kullanıcı:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {userEmail ?? 'Bilinmeyen e-posta'}
            </span>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Yeni şifre
            </label>
            <div className="flex items-center gap-2">
              <input
                id="new-password"
                type={visible ? 'text' : 'password'}
                value={password}
                autoComplete="new-password"
                onChange={(event) => {
                  setPassword(event.target.value)
                  setCopied(false)
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Şifreyi kopyala"
                className="rounded-lg border border-slate-300 dark:border-slate-700 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
            {copied ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Panoya kopyalandı.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="new-password-confirm"
              className="block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
              Yeni şifre (tekrar)
            </label>
            <input
              id="new-password-confirm"
              type={visible ? 'text' : 'password'}
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="rounded-lg border border-amber-400 dark:border-amber-400/40 bg-amber-100 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Şifre değişince bu kullanıcının açık oturumları kapanır ve varsa hesap kilidi kalkar.
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
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Kaydediliyor…' : 'Şifreyi Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
