import { Button } from '@nextui-org/react'
import Image from 'next/image'

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 py-20 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-200 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-300 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-8">
          <div>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
              Yapay Zeka Destekli Sağlık Asistanı
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-800 leading-tight">
              Sağlık Asistanınız <br />
              <span className="text-blue-600 relative">
                Yanınızda
                <svg
                  className="absolute -bottom-2 left-0 w-full h-2 text-blue-200"
                  viewBox="0 0 200 8"
                  preserveAspectRatio="none"
                >
                  <title>İleri</title>
                  <path d="M0,5 C50,0 150,0 200,5 L200,8 L0,8 Z" fill="currentColor"></path>
                </svg>
              </span>
            </h1>
          </div>

          <p className="text-gray-600 text-lg leading-relaxed">
            HUMANIS yapay zeka destekli sağlık asistanımız ile sorularınıza anında yanıt alın.
            Özellikle Hepatit B, HIV/AIDS gibi hastalıklar ve ilgili ilaçlar hakkında güvenilir
            bilgilere erişin.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>İleri</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Asistana Konuş
            </Button>
            <Button className="bg-white text-blue-600 font-medium px-8 py-6 rounded-full border border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-200 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>İleri</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Daha Fazla Bilgi
            </Button>
          </div>

          <div className="flex items-center space-x-4 pt-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold border-2 border-white">
                AY
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold border-2 border-white">
                MK
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold border-2 border-white">
                SB
              </div>
            </div>
            <span className="text-sm text-gray-500">1,000+ kullanıcı tarafından güveniliyor</span>
          </div>
        </div>

        <div className="hidden md:block relative">
          <div className="absolute inset-0 bg-blue-600 rounded-full blur-3xl opacity-20 transform scale-110"></div>
          <div className="relative bg-white p-3 rounded-2xl shadow-2xl border border-gray-100">
            <Image
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80"
              alt="Sağlık Profesyoneli"
              width={600}
              height={500}
              className="rounded-xl object-cover"
            />

            <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-100">
              <div className="flex items-center space-x-2 px-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>İleri</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">Uzman Yanıtları</p>
                  <p className="text-xs text-gray-500">24/7 Erişim</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-100">
              <div className="flex items-center space-x-2 px-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>İleri</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">Güvenilir Bilgi</p>
                  <p className="text-xs text-gray-500">Uzman Onayları</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
