'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMsalAuth } from '@/app/(pages)/(pocs)/pocs/telekom/_hooks/UseMsalAuth'
import { usePricingDashboardStore } from '@/app/(pages)/(pocs)/pocs/telekom/_store/pricingDashboardStore'

export function HeaderTelekom() {
  const { isAuthenticated, login, logout, userProfile } = useMsalAuth()
  const store = usePricingDashboardStore()

  /* useMailListener({
    userProfile:
      isAuthenticated && userProfile?.accessToken
        ? { accessToken: userProfile.accessToken }
        : null,
    onProcessed: (res) => {
      toast.info("Email contents processed.")
      store.setInputs(JSON.parse(res.parsedJson));
    },
  }); */

  function handlelogout() {
    store.setInputsDefault()
    logout()
  }

  return (
    <header className="w-full bg-[#002855] text-white shadow-md px-6 py-3 flex items-center justify-between">
      {!isAuthenticated ? (
        <button type="button" onClick={login} className="px-4 py-2 bg-blue-600 text-white rounded">
          Microsoft ile Giriş Yap
        </button>
      ) : (
        <div>
          <p className="mb-2">👋 Hoş geldin, {userProfile?.name}</p>
          <button
            type="button"
            onClick={handlelogout}
            className="px-4 py-2 bg-[#E63323] text-white rounded"
          >
            Çıkış Yap
          </button>
          <Link
            href={'/pocs/telekom/1/list'}
            className="mx-4 px-4 py-2 bg-[#05BEC8] text-white rounded"
          >
            Mail Kontrol Listesi
          </Link>
        </div>
      )}
      <div className="p-2 bg-white rounded-2xl">
        <Image src={'/tt.png'} alt="tt" width={40} height={40} />
      </div>
    </header>
  )
}
