import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rise Consulting POCs',
  description: 'POC Portfolio',
}

export default function PocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <>{children}</>
}
