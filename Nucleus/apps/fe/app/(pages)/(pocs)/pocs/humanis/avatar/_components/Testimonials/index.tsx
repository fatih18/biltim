import Image from 'next/image'

export function Testimonials() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Dekoratif arka plan elementleri */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-200 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-blue-300 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
            Kullanıcı Deneyimleri
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Kullanıcılarımız <span className="text-blue-600">HUMANIS</span> Hakkında Ne Diyor?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Hepatit B, HIV/AIDS ve diğer sağlık konularında bilgi arayan kullanıcılarımızın
            deneyimleri.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 relative">
            <div className="absolute top-4 right-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-blue-100"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Chat</title>
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            <div className="mb-6 relative z-10">
              <div className="flex items-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <title>Star</title>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                {
                  'Aviravir ilacı hakkında detaylı bilgiye ihtiyacım vardı. HUMANIS Sağlık Asistanı sayesinde ilaçlarım hakkında detaylı bilgi edinebiliyorum. Çok kullanışlı bir uygulama.'
                }
              </p>
            </div>

            <div className="flex items-center">
              <div className="relative mr-4">
                <Image
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Ayşe Yılmaz"
                  width={60}
                  height={60}
                  className="rounded-full object-cover border-2 border-white shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-white"></div>
              </div>
              <div>
                <p className="font-bold text-gray-800">Ayşe Yılmaz</p>
                <p className="text-sm text-gray-500">İstanbul</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 relative">
            <div className="absolute top-4 right-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-blue-100"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Chat</title>
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            <div className="mb-6 relative z-10">
              <div className="flex items-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <title>Star</title>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                {
                  'Virtenix ilacının yan etkileri hakkında bilgi almak istiyordum. Sağlık sorularıma anında yanıt alabilmek çok değerli. HUMANIS ekibine teşekkürler.'
                }
              </p>
            </div>

            <div className="flex items-center">
              <div className="relative mr-4">
                <Image
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Mehmet Kaya"
                  width={60}
                  height={60}
                  className="rounded-full object-cover border-2 border-white shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-white"></div>
              </div>
              <div>
                <p className="font-bold text-gray-800">Mehmet Kaya</p>
                <p className="text-sm text-gray-500">Ankara</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 relative">
            <div className="absolute top-4 right-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-blue-100"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Chat</title>
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            <div className="mb-6 relative z-10">
              <div className="flex items-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <title>Star</title>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                {
                  'Truvent kullanımı hakkında bilgi almak istediğimde HUMANIS asistanı bana çok yardımcı oldu. Sağlık bilgilerine bu kadar kolay erişebilmek harika.'
                }
              </p>
            </div>

            <div className="flex items-center">
              <div className="relative mr-4">
                <Image
                  src="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=60&h=60&q=80"
                  alt="Selin Bulut"
                  width={60}
                  height={60}
                  className="rounded-full object-cover border-2 border-white shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-white"></div>
              </div>
              <div>
                <p className="font-bold text-gray-800">Selin Bulut</p>
                <p className="text-sm text-gray-500">İzmir</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center text-blue-600 font-medium hover:text-blue-700 transition-colors">
            Tüm kullanıcı deneyimlerini görüntüle
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Arrow</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
