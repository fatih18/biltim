'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function ErrorPage() {
  const [mounted, setMounted] = useState(false)
  const [pulseActive, setPulseActive] = useState(false)

  useEffect(() => {
    setMounted(true)

    const pulseInterval = setInterval(() => {
      setPulseActive(true)
      setTimeout(() => setPulseActive(false), 2000)
    }, 5000)

    return () => clearInterval(pulseInterval)
  }, [])

  if (!mounted) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[8rem] md:text-[16rem] font-black text-white leading-none select-none">
            500
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white/3 rounded-full blur-2xl animate-[float_12s_ease-in-out_infinite_reverse]" />
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          {/* 500 with Soft Signals */}
          <div className="relative mb-16">
            <h1 className="text-[8rem] md:text-[16rem] font-black text-white leading-none select-none transition-all duration-2000 tracking-tighter font-sans shadow-glow">
              500
            </h1>

            {/* Soft Expanding Signals */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 md:w-48 md:h-48 border border-white/20 rounded-full animate-[softExpand_4s_ease-out_infinite]" />
              <div className="absolute w-24 h-24 md:w-36 md:h-36 border border-white/15 rounded-full animate-[softExpand_4s_ease-out_infinite_1s]" />
              <div className="absolute w-16 h-16 md:w-24 md:h-24 border border-white/10 rounded-full animate-[softExpand_4s_ease-out_infinite_2s]" />
            </div>

            {/* Gentle Pulse Waves */}
            {pulseActive && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0 h-0 bg-white/10 rounded-full animate-[gentlePulse_2s_ease-out]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0 h-0 bg-white/8 rounded-full animate-[gentlePulse_2s_ease-out_0.3s]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0 h-0 bg-white/6 rounded-full animate-[gentlePulse_2s_ease-out_0.6s]" />
                </div>
              </>
            )}
          </div>

          {/* Minimalist Message */}
          <div className="mb-16 space-y-6">
            <h2 className="text-2xl md:text-3xl font-light text-white/90 tracking-wide animate-[fadeInUp_1s_ease-out_0.5s_both]">
              Something went wrong
            </h2>
            <div className="w-24 h-px bg-white/30 mx-auto animate-[grow_2s_ease-out_1s_both]" />
            <p className="text-lg text-white/60 font-light max-w-md mx-auto leading-relaxed animate-[fadeInUp_1s_ease-out_1.5s_both]">
              An unexpected error occurred on the server. Please try again or return to the
              dashboard.
            </p>
          </div>

          {/* Minimal Action Button */}
          <div className="flex justify-center animate-[fadeInUp_1s_ease-out_2s_both]">
            <Link
              href="/"
              className="group relative px-8 py-3 text-white font-light tracking-wide transition-all duration-500 hover:tracking-widest"
            >
              <span className="relative z-10">Return Home</span>
              <div className="absolute bottom-0 left-0 w-0 h-px bg-white transition-all duration-500 group-hover:w-full" />
            </Link>
          </div>

          {/* Breathing Dot */}
          <div className="mt-24 flex justify-center animate-[fadeInUp_1s_ease-out_2.5s_both]">
            <div className="w-2 h-2 bg-white rounded-full animate-[breathe_3s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  )
}
