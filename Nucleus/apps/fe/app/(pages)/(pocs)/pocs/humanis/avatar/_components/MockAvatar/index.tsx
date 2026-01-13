'use client'
import { Button, Card, CardBody, CardFooter, Divider, Input, Progress } from '@nextui-org/react'
import { useEffect, useState } from 'react'

export function MockAvatar() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingText, setLoadingText] = useState('Asistan başlatılıyor...')

  useEffect(() => {
    // Simüle edilmiş yükleme animasyonu
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => setIsLoading(false), 500)
          return 100
        }
        return prev + 5
      })

      // Yükleme metinlerini değiştir
      if (loadingProgress < 30) {
        setLoadingText('Asistan başlatılıyor...')
      } else if (loadingProgress < 60) {
        setLoadingText('Sağlık veritabanı yükleniyor...')
      } else if (loadingProgress < 90) {
        setLoadingText('Yapay zeka modeli hazırlanıyor...')
      } else {
        setLoadingText('Neredeyse hazır...')
      }
    }, 150)

    return () => clearInterval(interval)
  }, [loadingProgress])

  return (
    <Card className="border border-gray-100 shadow-xl rounded-xl overflow-hidden bg-white relative">
      {/* Arka plan dekoratif elementleri */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-100 rounded-full blur-3xl opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-200 rounded-full blur-3xl opacity-30 transform -translate-x-1/2 translate-y-1/2"></div>

      <CardBody className="h-[500px] flex flex-col justify-center items-center relative z-10 px-8 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-lg relative">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                fill="none"
                viewBox="0 0 24 24"
                stroke="white"
                className="relative z-10"
              >
                <title>Loading</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">{loadingText}</h3>
            <div className="w-full max-w-md">
              <Progress
                value={loadingProgress}
                color="primary"
                className="h-2 rounded-full"
                aria-label="Yükleniyor..."
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 p-8 max-w-md text-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="white"
                >
                  <title>Check</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <title>Check</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">HUMANIS Sağlık Asistanı</h3>
              <div className="inline-block px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium mb-4">
                Çevrimiçi ve Hazır
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed">
              Hepatit B, HIV/AIDS gibi hastalıklar ve ilgili ilaçlar hakkında sorularınızı
              yanıtlamak için buradayım. Size nasıl yardımcı olabilirim?
            </p>

            <div className="grid grid-cols-2 gap-4 w-full mt-2">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>24/7</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">24/7</p>
                    <p className="text-xs text-gray-500">Erişim</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>Secure</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">Güvenilir</p>
                    <p className="text-xs text-gray-500">Bilgiler</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 w-full"
              size="lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Chat</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              Asistanla Konuşmaya Başla
            </Button>
          </div>
        )}
      </CardBody>

      <Divider className="bg-gray-100" />

      <CardFooter className="flex justify-center p-6 bg-gray-50">
        <div className="relative w-full max-w-md">
          <Input
            placeholder="Sağlık asistanına bir soru sorun..."
            className="pr-12 shadow-sm"
            size="lg"
            radius="full"
            disabled={isLoading}
          />
          <Button
            isIconOnly
            className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white rounded-full w-10 h-10"
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Send</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
