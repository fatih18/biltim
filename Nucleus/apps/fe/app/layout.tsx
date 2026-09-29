import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from 'sonner'
import { ConfirmHost, Header, LoginChecker } from './_components'

/*
 * Fonts ship with the repo instead of coming from next/font/google. The
 * customer server has no outbound internet, and next/font/google fetches at
 * BUILD time: `next build` failed there with "Failed to fetch Geist from
 * Google Fonts". Same Geist variable fonts (OFL, app/fonts/OFL.txt), full
 * Turkish coverage (ş ğ ı İ ç ö ü) checked against the glyph table.
 */
const geistSans = localFont({
  src: './fonts/Geist-Variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMono-Variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Biltim',
  description: 'Biltim 5S Yönetim Sistemi',
  // Next.js 16 automatically uses /app/manifest.ts
  // icons: {
  //   icon: '/icon.png',
  //   apple: '/icon-192x192.png',
  // },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BİLTİM',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1F2937',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />

        <Toaster />
        <ConfirmHost />
        <LoginChecker>{children}</LoginChecker>
      </body>
    </html>
  )
}
