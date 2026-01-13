'use client'

import type { ReactElement } from 'react'
import { FaApple, FaFacebook, FaGithub, FaWindows } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'

type SocialProvider = 'facebook' | 'google' | 'microsoft' | 'apple' | 'github'

type SocialLoginButtonProps = {
  provider: SocialProvider
  onClick?: () => void
  className?: string
}

const socialConfig = {
  github: {
    icon: FaGithub,
    label: 'GitHub',
    style: { fontSize: '20px', color: '#24292e' },
  },
  facebook: {
    icon: FaFacebook,
    label: 'Facebook',
    style: { fontSize: '20px', color: '#1877F2' },
  },
  google: {
    icon: FcGoogle,
    label: 'Google',
    style: { fontSize: '20px' },
  },
  microsoft: {
    icon: FaWindows,
    label: 'Microsoft',
    style: { fontSize: '20px', color: '#0078D4' },
  },
  apple: {
    icon: FaApple,
    label: 'Apple',
    style: { fontSize: '20px', color: '#000000' },
  },
} as const

export function SocialLoginButton({
  provider,
  onClick,
  className = '',
}: SocialLoginButtonProps): ReactElement {
  const config = socialConfig[provider]
  const IconComponent = config.icon

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      console.log(`Login with ${provider}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-blue-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 @container ${className}`}
      aria-label={`Continue with ${config.label}`}
      style={{ containerType: 'inline-size' }}
    >
      <IconComponent style={config.style} aria-hidden="true" className="flex-shrink-0" />
      <span className="hidden @[100px]:block">{config.label}</span>
    </button>
  )
}
