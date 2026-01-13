'use client'

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  VoiceEmotion,
} from '@heygen/streaming-avatar'
import { Button, Card, CardBody, Spinner } from '@nextui-org/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { knowledgeBasePrompt } from '../knowledgebase/knowledge_base_prompt'
export function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [stream, setStream] = useState<MediaStream>()

  const mediaStream = useRef<HTMLVideoElement>(null)
  const avatar = useRef<StreamingAvatar | null>(null)

  async function fetchAccessToken() {
    try {
      const response = await fetch('/api/get-access-token', {
        method: 'POST',
      })
      const token = await response.text()

      // console.log("Access Token:", token); // Log the token to verify

      return token
    } catch (error) {
      console.error('Error fetching access token:', error)
    }

    return ''
  }

  async function startSession() {
    setIsLoadingSession(true)
    const newToken = await fetchAccessToken()

    avatar.current = new StreamingAvatar({
      token: newToken,
    })
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log('Avatar started talking', e)
    })
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log('Avatar stopped talking', e)
    })
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log('Stream disconnected')
      endSession()
    })
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log('>>>>> Stream ready:', event.detail)
      setStream(event.detail)
    })
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log('>>>>> User started talking:', event)
    })
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log('>>>>> User stopped talking:', event)
    })
    try {
      await avatar.current.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: 'Ann_Doctor_Standing2_public',
        knowledgeBase: knowledgeBasePrompt,
        voice: {
          rate: 1.0,
          emotion: VoiceEmotion.EXCITED,
        },
        language: 'tr',
        disableIdleTimeout: true,
        useSilencePrompt: false,
      })

      // default to voice mode
      await avatar.current?.startVoiceChat()
    } catch (error) {
      console.error('Error starting avatar session:', error)
    } finally {
      setIsLoadingSession(false)
    }
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      return
    }
    await avatar.current.interrupt().catch((e) => {
      console.error('Error interrupting avatar session:', e)
    })
  }
  async function endSession() {
    await avatar.current?.stopAvatar()
    setStream(undefined)
  }

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current?.play()
      }
    }
  }, [mediaStream, stream])

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              >
                <track kind="captions" />
              </video>
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={handleInterrupt}
                >
                  Interrupt task
                </Button>
                <Button
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                  size="md"
                  variant="shadow"
                  onClick={endSession}
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8 rounded-xl">
              <div className="relative mb-4">
                <div className="absolute -inset-8 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
                <Image src="/humanis-h-logo.svg" alt="HUMANIS Logo" className="h-16 relative" />
              </div>

              <div className="space-y-6 text-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">HUMANIS Sağlık Asistanı</h3>
                  <p className="text-gray-600">
                    Hepatit B, HIV/AIDS ve diğer sağlık konularında bilgi almak için asistanı
                    başlatın.
                  </p>
                </div>

                <Button
                  className="bg-blue-600 text-white px-8 py-6"
                  onClick={startSession}
                  size="lg"
                  startContent={
                    <Image src="/humanis-h-logo-white.svg" alt="HUMANIS" className="h-5 mr-2" />
                  }
                >
                  Asistanı Başlat
                </Button>

                <p className="text-xs text-gray-500 mt-4">
                  Not: Ses ve görüntü için tarayıcı izinlerine ihtiyaç duyulabilir.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mb-4">
                <div className="absolute -inset-8 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
                <Image src="/humanis-h-logo.svg" alt="HUMANIS Logo" className="h-16 relative" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">HUMANIS Sağlık Asistanı</h3>
              </div>
              <Spinner color="primary" size="lg" className="my-6" />
              <p className="text-blue-600 font-medium animate-pulse">
                Sağlık Asistanı Başlatılıyor...
              </p>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
