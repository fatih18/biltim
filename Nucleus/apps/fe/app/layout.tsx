import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { Header, LoginChecker } from './_components'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
        <LoginChecker>{children}</LoginChecker>
      </body>
    </html>
  )
}
