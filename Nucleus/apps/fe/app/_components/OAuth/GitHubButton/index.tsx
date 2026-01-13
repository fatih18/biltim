'use client'

import { FaGithub } from 'react-icons/fa'
import { toast } from 'sonner'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

type GitHubButtonProps = {
  mode: 'login' | 'register' | 'link'
  returnUrl?: string
  linkToUserId?: string
  isLinked?: boolean
  className?: string
}

export function GitHubButton({
  mode,
  returnUrl,
  linkToUserId,
  isLinked = false,
  className,
}: GitHubButtonProps) {
  const actions = useGenericApiActions()

  function handleClick() {
    if (isLinked) {
      // Unlink GitHub account
      if (!confirm('Are you sure you want to unlink your GitHub account?')) {
        return
      }

      actions.UNLINK_GITHUB?.start({
        onAfterHandle: () => {
          toast.success('GitHub account unlinked successfully')
          // Refresh page to update linked accounts
          window.location.reload()
        },
        onErrorHandle: (error) => {
          console.error('GitHub unlink error:', error)
          toast.error('Failed to unlink GitHub account')
        },
      })
    } else {
      // Link GitHub account
      actions.GET_GITHUB_AUTH_URL?.start({
        payload: {
          returnUrl: returnUrl || window.location.origin,
          linkToUserId,
        },
        onAfterHandle: (data) => {
          if (data?.authUrl) {
            // Redirect to GitHub OAuth page
            window.location.href = data.authUrl
          } else {
            toast.error('Failed to get GitHub authorization URL')
          }
        },
        onErrorHandle: (error) => {
          console.error('GitHub OAuth error:', error)
          toast.error('Failed to connect with GitHub')
        },
      })
    }
  }

  const buttonText = {
    login: 'Continue with GitHub',
    register: 'Sign up with GitHub',
    link: isLinked ? 'Unlink GitHub' : 'Link GitHub Account',
  }

  const isLoading =
    actions.GET_GITHUB_AUTH_URL?.state?.isPending ||
    actions.UNLINK_GITHUB?.state?.isPending ||
    false

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={
        className ||
        'flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-6 py-3.5 text-base font-semibold text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed'
      }
    >
      <FaGithub className="h-5 w-5" />
      <span>{isLoading ? 'Connecting...' : buttonText[mode]}</span>
    </button>
  )
}
