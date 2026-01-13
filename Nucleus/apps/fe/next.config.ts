import { baseConfig } from '@monorepo/configs/next/base'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  ...baseConfig,
  // Turbopack is enabled by default in Next.js 16
  // No webpack config needed - using native PWA support
}

export default nextConfig
