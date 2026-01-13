'use client'

import type { BaseError, FactoryResponse } from '@hidayetcanozcan/nucleus-generic-api-caller'
import { useState } from 'react'
import { Endpoints, FactoryFunction } from '@/lib/api'

interface UserData {
  id: string
  email: string
  profile?: {
    first_name?: string
    last_name?: string
  }
}

type ApiResponse = FactoryResponse<unknown, BaseError>

export default function AuthV2TestPage() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('Test1234!')
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setResponse(null)
    try {
      const result = await FactoryFunction({ email, password }, Endpoints.REGISTER_V2)
      setResponse(result)
      if (result.isSuccess) {
        console.log('✅ Register successful:', result)
      }
    } catch (error) {
      setResponse({
        isSuccess: false,
        response: undefined,
        errors: { message: error instanceof Error ? error.message : String(error) },
        code: null,
        createdAt: new Date(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setResponse(null)
    try {
      const result = await FactoryFunction({ email, password }, Endpoints.LOGIN_V2)
      setResponse(result)
      if (result.isSuccess) {
        console.log('✅ Login successful:', result)
      }
    } catch (error) {
      setResponse({
        isSuccess: false,
        response: undefined,
        errors: { message: error instanceof Error ? error.message : String(error) },
        code: null,
        createdAt: new Date(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGetMe = async () => {
    setLoading(true)
    setResponse(null)
    setUserData(null)
    try {
      const result = await FactoryFunction(undefined, Endpoints.GET_ME_V2)
      setResponse(result)
      if (result.isSuccess && result.response) {
        setUserData(result.response as UserData)
      }
    } catch (error) {
      setResponse({
        isSuccess: false,
        response: undefined,
        errors: { message: error instanceof Error ? error.message : String(error) },
        code: null,
        createdAt: new Date(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    setResponse(null)
    try {
      const result = await FactoryFunction(undefined, Endpoints.REFRESH_V2)
      setResponse(result)
      if (result.isSuccess) {
        console.log('✅ Token refreshed:', result)
      }
    } catch (error) {
      setResponse({
        isSuccess: false,
        response: undefined,
        errors: { message: error instanceof Error ? error.message : String(error) },
        code: null,
        createdAt: new Date(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    setResponse(null)
    setUserData(null)
    try {
      const result = await FactoryFunction(undefined, Endpoints.LOGOUT_V2)
      setResponse(result)
      if (result.isSuccess) {
        console.log('✅ Logout successful')
      }
    } catch (error) {
      setResponse({
        isSuccess: false,
        response: undefined,
        errors: { message: error instanceof Error ? error.message : String(error) },
        code: null,
        createdAt: new Date(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          {/* Header */}
          <div className="mb-8 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">AuthV2 Test Console</h1>
            <p className="text-slate-600">Test JWT-based authentication flow with cookies</p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                JWT Tokens
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                Dapr Sessions
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                HttpOnly Cookies
              </span>
            </div>
          </div>

          {/* Input Form */}
          <div className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password-input"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                </label>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Register
              </button>
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Login
              </button>
              <button
                type="button"
                onClick={handleGetMe}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Get Me
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="mb-6 flex items-center justify-center gap-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg border border-blue-200">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700" />
              <span className="font-medium">Processing request...</span>
            </div>
          )}

          {/* User Data Display */}
          {userData && (
            <div className="mb-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="User icon"
                >
                  <title>User Profile Icon</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                User Profile
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="font-medium text-purple-700">ID:</span>
                  <span className="text-purple-900 font-mono text-sm">{userData.id}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium text-purple-700">Email:</span>
                  <span className="text-purple-900">{userData.email}</span>
                </div>
                {userData.profile && (
                  <div className="flex gap-2">
                    <span className="font-medium text-purple-700">Name:</span>
                    <span className="text-purple-900">
                      {userData.profile?.first_name} {userData.profile?.last_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="Document icon"
                  >
                    <title>Response Document Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Response
                </h3>
                {response.isSuccess !== undefined && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      response.isSuccess
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {response.isSuccess ? '✓ Success' : '✗ Error'}
                  </span>
                )}
              </div>
              <pre className="text-sm text-slate-300 overflow-x-auto bg-slate-800 rounded-lg p-4 border border-slate-700">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}

          {/* Info Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Flow Order</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Register new user</li>
                <li>Login to get tokens</li>
                <li>Get Me to verify session</li>
                <li>Refresh to renew access</li>
                <li>Logout to clear session</li>
              </ol>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Cookies Set</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  <code className="font-mono">nucleus_access_token</code>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  <code className="font-mono">nucleus_refresh_token</code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
