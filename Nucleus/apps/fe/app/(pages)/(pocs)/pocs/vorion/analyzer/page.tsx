'use client'

import Script from 'next/script'
import { VorionAnalyzer } from '../_components'

export default function VorionAnalyzerPage() {
  return (
    <main className="h-[100svh] w-full overflow-hidden">
      <Script
        src="https://api.48-195-173-46.nip.io/llm/api/v1/chatbot/kt3of0d7ojmp8jvwce27u6ae/loader.js"
        strategy="afterInteractive"
        async
      />
      <VorionAnalyzer />
    </main>
  )
}
