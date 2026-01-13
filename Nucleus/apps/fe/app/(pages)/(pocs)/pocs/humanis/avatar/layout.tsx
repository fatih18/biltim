import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '../../../../../globals.css'
import Script from 'next/script'
import { DailyPasswordGate } from '@/app/_components'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'HUMANIS Sağlık Asistanı',
  description:
    'Sağlık profesyonelleri için özel olarak tasarlanmış, bilgi tabanı destekli sanal asistan',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <DailyPasswordGate>
          {children}
          <Script id="heygen-avatar-script" strategy="afterInteractive">
            {`
      !function(window){const host="https://labs.heygen.com",url=host+"/guest/streaming-embed?share=eyJxdWFsaXR5IjoiaGlnaCIsImF2YXRhck5hbWUiOiJBbm5fRG9jdG9yX1N0YW5kaW5nMl9wdWJs%0D%0AaWMiLCJwcmV2aWV3SW1nIjoiaHR0cHM6Ly9maWxlczIuaGV5Z2VuLmFpL2F2YXRhci92My82OTlh%0D%0ANGMyOTk1OTE0ZDM5YjJjYjMxMWE5MzBkNzcyMF80NTU3MC9wcmV2aWV3X3RhbGtfMy53ZWJwIiwi%0D%0AbmVlZFJlbW92ZUJhY2tncm91bmQiOmZhbHNlLCJrbm93bGVkZ2VCYXNlSWQiOiJkYThiZjRhZTVh%0D%0ANzY0OTQ4ODM1ZjRlZmY2YmQ3YjM1ZiIsInVzZXJuYW1lIjoiOTNhODBhYmMwNTNmNDlhYWJjNmFm%0D%0AZTZjYTgzMDkxMmMifQ%3D%3D&inIFrame=1",clientWidth=document.body.clientWidth,wrapDiv=document.createElement("div");wrapDiv.id="heygen-streaming-embed";const container=document.createElement("div");container.id="heygen-streaming-container";const stylesheet=document.createElement("style");stylesheet.innerHTML=\`\\n  #heygen-streaming-embed {\\n    z-index: 9999;\\n    position: fixed;\\n    left: 40px;\\n    bottom: 40px;\\n    width: 200px;\\n    height: 200px;\\n    border-radius: 50%;\\n    border: 2px solid #fff;\\n    box-shadow: 0px 8px 24px 0px rgba(0, 0, 0, 0.12);\\n    transition: all linear 0.1s;\\n    overflow: hidden;\\n\\n    opacity: 0;\\n    visibility: hidden;\\n  }\\n  #heygen-streaming-embed.show {\\n    opacity: 1;\\n    visibility: visible;\\n  }\\n  #heygen-streaming-embed.expand {\\n    \${clientWidth<540?"height: 266px; width: 96%; left: 50%; transform: translateX(-50%)":"height: 366px; width: calc(366px * 16 / 9)"}\\n    border: 0;\\n    border-radius: 8px;\\n  }\\n  #heygen-streaming-container {\\n    width: 100%;\\n    height: 100%;\\n  }\\n  #heygen-streaming-container iframe {\\n    width: 100%;\\n    height: 100%;\\n    border: 0;\\n  }\\n  \`;const iframe=document.createElement("iframe");iframe.allowFullscreen=!1,iframe.title="Streaming Embed",iframe.role="dialog",iframe.allow="microphone",iframe.src=url;let visible=!1,initial=!1;window.addEventListener("message",(e=>{e.origin===host&&e.data&&e.data.type&&"streaming-embed"===e.data.type&&("init"===e.data.action?(initial=!0,wrapDiv.classList.toggle("show",initial)):"show"===e.data.action?(visible=!0,wrapDiv.classList.toggle("expand",visible)):"hide"===e.data.action&&(visible=!1,wrapDiv.classList.toggle("expand",visible)))})),container.appendChild(iframe),wrapDiv.appendChild(stylesheet),wrapDiv.appendChild(container),document.body.appendChild(wrapDiv)}(globalThis);
      `}
          </Script>
        </DailyPasswordGate>
      </body>
    </html>
  )
}
