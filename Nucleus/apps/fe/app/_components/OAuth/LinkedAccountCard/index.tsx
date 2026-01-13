'use client'

import type { UserOAuthProviderJSON } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { FaApple, FaGithub, FaGoogle, FaMicrosoft } from 'react-icons/fa'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

type OAuthProvider = 'github' | 'google' | 'azure' | 'apple'

type LinkedAccountCardProps = {
  account: UserOAuthProviderJSON
  onUnlink?: () => void
}

const providerConfig = {
  github: {
    name: 'GitHub',
    icon: FaGithub,
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
  },
  google: {
    name: 'Google',
    icon: FaGoogle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  azure: {
    name: 'Microsoft',
    icon: FaMicrosoft,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  apple: {
    name: 'Apple',
    icon: FaApple,
    color: 'text-gray-900',
    bgColor: 'bg-gray-100',
  },
}

export function LinkedAccountCard({ account, onUnlink }: LinkedAccountCardProps) {
  const actions = useGenericApiActions()
  const config = providerConfig[account.provider as OAuthProvider] || providerConfig.github
  const Icon = config.icon

  function handleUnlink() {
    if (!confirm(`Are you sure you want to unlink your ${config.name} account?`)) {
      return
    }

    const unlinkHandlers = {
      onAfterHandle: () => {
        toast.success(`${config.name} account unlinked successfully`)
        onUnlink?.()
      },
      onErrorHandle: (error: unknown) => {
        console.error('Unlink error:', error)
        toast.error(`Failed to unlink ${config.name} account`)
      },
    }

    if (account.provider === 'github') {
      actions.UNLINK_GITHUB?.start(unlinkHandlers)
    } else if (account.provider === 'azure') {
      actions.UNLINK_AZURE?.start(unlinkHandlers)
    } else {
      toast.error('This provider is not yet supported')
    }
  }

  const isUnlinking =
    actions.UNLINK_GITHUB?.state?.isPending || actions.UNLINK_AZURE?.state?.isPending || false

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div>
          <p className="font-semibold text-neutral-900">{config.name}</p>
          {account.provider_email && (
            <p className="text-sm text-neutral-500">{account.provider_email}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleUnlink}
        disabled={isUnlinking}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUnlinking ? 'Unlinking...' : 'Unlink'}
      </button>
    </div>
  )
}
