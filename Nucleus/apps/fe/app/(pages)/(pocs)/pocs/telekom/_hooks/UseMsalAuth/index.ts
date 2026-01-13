'use client'

import { useMsal } from '@azure/msal-react'
import { useCallback, useEffect, useState } from 'react'
import {
  graphConfig,
  loginRequest,
} from '@/app/(pages)/(pocs)/pocs/telekom/_hooks/UseMsalAuth/msal.config'

export type UserProfile = {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly avatar?: string
  readonly jobTitle?: string
  readonly department?: string
  readonly isLoadingAvatar?: boolean
  readonly accessToken?: string
}

export const useMsalAuth = () => {
  const { instance, accounts, inProgress } = useMsal()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasHandledRedirect, setHasHandledRedirect] = useState(false)

  // Check if MSAL is enabled
  const isMsalEnabled = true

  // Mock user profile for development
  const mockUserProfile: UserProfile = {
    id: 'mock-user-123',
    name: 'John Doe (Mock)',
    email: 'john.doe@company.com',
    jobTitle: 'Software Developer',
    department: 'IT Department',
    isLoadingAvatar: false,
  }

  // Check if user is authenticated
  const isAuthenticated = isMsalEnabled ? accounts.length > 0 : !!userProfile
  const activeAccount = isMsalEnabled ? instance.getActiveAccount() : null

  // Fetch user profile photo from Microsoft Graph
  const fetchUserPhoto = useCallback(async (accessToken: string): Promise<string | undefined> => {
    try {
      const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (photoResponse.ok) {
        const blob = await photoResponse.blob()
        return URL.createObjectURL(blob)
      }
    } catch (error) {
      console.log('No profile photo available:', error)
    }
    return undefined
  }, [])

  // Fetch user profile from Microsoft Graph
  const fetchUserProfile = useCallback(async () => {
    if (!activeAccount) return

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: activeAccount,
      })

      // Call Microsoft Graph API for user info
      const graphResponse = await fetch(graphConfig.graphMeEndpoint, {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      })

      if (graphResponse.ok) {
        const graphData = await graphResponse.json()

        // Set profile without avatar first
        const baseProfile = {
          id: graphData.id,
          name: graphData.displayName || graphData.userPrincipalName,
          email: graphData.mail || graphData.userPrincipalName,
          jobTitle: graphData.jobTitle,
          department: graphData.department,
          isLoadingAvatar: true,
          accessToken: response.accessToken,
        }

        setUserProfile(baseProfile)

        // Fetch profile photo asynchronously
        fetchUserPhoto(response.accessToken).then((avatar) => {
          setUserProfile((prev) =>
            prev
              ? {
                  ...prev,
                  avatar,
                  isLoadingAvatar: false,
                }
              : null
          )
        })
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      // Fallback to account info from MSAL
      if (activeAccount) {
        setUserProfile({
          id: activeAccount.homeAccountId,
          name: activeAccount.name || activeAccount.username,
          email: activeAccount.username,
          isLoadingAvatar: false,
        })
      }
    }
  }, [instance, activeAccount, fetchUserPhoto])

  // Login function
  const login = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isMsalEnabled) {
        // Real MSAL login - use redirect in production, popup in development
        const isProduction = true

        if (isProduction) {
          // Use redirect login for production
          await instance.loginRedirect(loginRequest)
          return // loginRedirect doesn't return, it redirects the page
        } else {
          // Use popup login for development
          const response = await instance.loginPopup(loginRequest)
          instance.setActiveAccount(response.account)

          // Fetch user profile from Microsoft Graph
          await fetchUserProfile()
        }
      } else {
        // Mock login for development
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate network delay
        setUserProfile(mockUserProfile)
      }
    } catch (error) {
      console.error('Login failed:', error)
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }, [instance, isMsalEnabled, mockUserProfile, fetchUserProfile])

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isMsalEnabled) {
        // Real MSAL logout - use redirect in production, popup in development
        const isProduction = window.location.hostname !== 'localhost'

        if (isProduction) {
          // Use redirect logout for production
          await instance.logoutRedirect({
            postLogoutRedirectUri: process.env.AZURE_POST_LOGOUT_REDIRECT_URI || '/',
          })
          return // logoutRedirect doesn't return, it redirects the page
        } else {
          // Use popup logout for development
          await instance.logoutPopup({
            postLogoutRedirectUri: '/',
            mainWindowRedirectUri: '/',
          })
        }
      } else {
        // Mock logout for development
        await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network delay
      }
      setUserProfile(null)
    } catch (error) {
      console.error('Logout failed:', error)
      setError(error instanceof Error ? error.message : 'Logout failed')
    } finally {
      setIsLoading(false)
    }
  }, [instance, isMsalEnabled])

  // Handle redirect response on page load (only once)
  useEffect(() => {
    if (isMsalEnabled && !hasHandledRedirect) {
      const handleRedirectPromise = async () => {
        try {
          const response = await instance.handleRedirectPromise()
          setHasHandledRedirect(true)

          if (response) {
            // User just logged in via redirect
            instance.setActiveAccount(response.account)
            console.log('Redirect login successful')

            // Trigger login success callback for production redirect
            if (window.location.hostname !== 'localhost') {
              // Store login success flag for LoginScreen to detect
              sessionStorage.setItem('msal_login_success', 'true')
            }
          }
        } catch (error) {
          console.error('Error handling redirect:', error)
          setError(error instanceof Error ? error.message : 'Login failed')
          setHasHandledRedirect(true)
        }
      }

      handleRedirectPromise()
    }
  }, [instance, isMsalEnabled, hasHandledRedirect])

  // Initialize user profile on mount (only after redirect is handled)
  useEffect(() => {
    if (isMsalEnabled && hasHandledRedirect) {
      // Real MSAL initialization
      if (isAuthenticated && activeAccount && !userProfile) {
        fetchUserProfile()
      }
    } else if (!isMsalEnabled) {
      // Mock mode - no auto-login, wait for user to click login
      // User profile will be set when login() is called
    }
  }, [
    isMsalEnabled,
    hasHandledRedirect,
    isAuthenticated,
    activeAccount,
    userProfile,
    fetchUserProfile,
  ])

  return {
    isAuthenticated,
    isLoading: isLoading || (isMsalEnabled && inProgress !== 'none'),
    error,
    userProfile,
    login,
    logout,
    refreshProfile: isMsalEnabled ? fetchUserProfile : () => Promise.resolve(),
    isMockMode: !isMsalEnabled,
    hasHandledRedirect,
  }
}
