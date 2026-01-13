import { Button } from '@nextui-org/react'

export function CTA() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 opacity-95"></div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply opacity-20 blur-3xl"></div>

        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-white rounded-full opacity-30"></div>
        <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-white rounded-full opacity-20"></div>
        <div className="absolute bottom-1/4 right-1/4 w-5 h-5 bg-white rounded-full opacity-30"></div>
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-white rounded-full opacity-20"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
        <div className="inline-block px-4 py-1.5 bg-blue-500 bg-opacity-40 rounded-full text-white text-sm font-medium mb-6 backdrop-blur-sm">
          Yapay Zeka Destekli Sağlık Asistanı
        </div>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
          HUMANIS Sağlık Asistanı ile <br className="hidden md:block" />
          <span className="relative inline-block">
            Sağlığınızı Yönetin
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-white opacity-70 rounded-full"></div>
          </span>
        </h2>

        <p className="text-blue-100 mb-10 max-w-2xl mx-auto text-lg">
          Hepatit B, HIV/AIDS ve diğer sağlık konularında sorularınıza anında yanıt alabilmek için
          yapay zeka destekli sağlık asistanımızı hemen deneyin.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            size="lg"
            className="bg-white text-blue-700 font-medium px-8 py-6 text-lg hover:bg-opacity-95 hover:shadow-lg transition-all duration-300"
            radius="full"
            startContent={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>İleri</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          >
            Şimdi Başla
          </Button>

          <Button
            size="lg"
            className="bg-transparent border-2 border-white text-white font-medium px-8 py-6 text-lg hover:bg-white hover:bg-opacity-10 transition-all duration-300"
            radius="full"
            variant="bordered"
          >
            Daha Fazla Bilgi
          </Button>
        </div>

        <div className="mt-16 flex justify-center items-center gap-8 flex-wrap">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Güvenli ve Gizli</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span className="text-white">Güvenilir Bilgi</span>
          </div>

          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Güvenli ve Gizli</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-white">7/24 Erişim</span>
          </div>

          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Güvenli ve Gizli</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <span className="text-white">Güvenli ve Gizli</span>
          </div>
        </div>
      </div>
    </section>
  )
}
