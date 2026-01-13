'use client'

import Image from 'next/image'
import {
  AvatarFooter,
  AvatarHeader,
  AvatarHero,
  CTA,
  Features,
  InteractiveAvatar,
  Testimonials,
} from '@/app/(pages)/(pocs)/pocs/humanis/avatar/_components'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AvatarHeader />
      <AvatarHero />

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="md:w-1/2 space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-2">
                HUMANIS HEALTHCARE
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Sağlık Profesyonelleri için <span className="text-blue-600">Yapay Zeka</span>{' '}
                Asistanı
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Hepatit B, HIV/AIDS ve diğer sağlık konularında uzmanlaşmış yapay zeka destekli
                sanal asistanımızla hemen etkileşime geçin.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold border-2 border-white">
                    H
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold border-2 border-white">
                    S
                  </div>
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold border-2 border-white">
                    M
                  </div>
                </div>
                <span className="text-sm text-gray-500">500+ sağlık profesyoneli kullanıyor</span>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full blur-xl opacity-70"></div>
                <Image src="/humanis-h-logo.svg" alt="HUMANIS Logo" className="h-32 relative" />
              </div>
            </div>
          </div>

          {/* Avatar Kartı */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-full">
                  <Image src="/humanis-h-logo.svg" alt="HUMANIS Logo" className="h-6" />
                </div>
                <div>
                  <h3 className="font-bold">HUMANIS Sağlık Asistanı</h3>
                </div>
              </div>
            </div>
            <div className="w-full">
              <InteractiveAvatar />
            </div>
          </div>
        </div>
      </section>

      <Features />
      <Testimonials />
      <CTA />
      <AvatarFooter />
    </div>
  )
}
