'use client'

import { useEffect, useState } from 'react'

interface TenantsCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: {
    companyName: string
    subdomain: string
    schemaName: string
    godAdminEmail: string
    godAdminPassword: string
    taxId?: string
    w9: File | null
  }) => void
  isSubmitting: boolean
}

export function TenantsCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: TenantsCreateModalProps) {
  const [companyName, setCompanyName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [schemaName, setSchemaName] = useState('')
  const [godAdminEmail, setGodAdminEmail] = useState('')
  const [godAdminPassword, setGodAdminPassword] = useState('')
  const [taxId, setTaxId] = useState('')
  const [w9File, setW9File] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCompanyName('')
      setSubdomain('')
      setSchemaName('')
      setGodAdminEmail('')
      setGodAdminPassword('')
      setTaxId('')
      setW9File(null)
      setFormError(null)
    }
  }, [isOpen])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!w9File) {
      setFormError('Please upload the signed W-9 document.')
      return
    }
    onSubmit({
      companyName,
      subdomain,
      schemaName,
      godAdminEmail,
      godAdminPassword,
      taxId,
      w9: w9File,
    })
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Tenant</h2>
              <p className="text-sm text-gray-500">
                Provision a new tenant environment with administrative credentials.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close create tenant modal"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="tenants-create-company"
                className="block text-sm font-medium text-gray-700"
              >
                Company Name
              </label>
              <input
                id="tenants-create-company"
                type="text"
                required
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-create-subdomain"
                className="block text-sm font-medium text-gray-700"
              >
                Subdomain
              </label>
              <input
                id="tenants-create-subdomain"
                type="text"
                required
                value={subdomain}
                onChange={(event) => setSubdomain(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. acme"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-create-schema"
                className="block text-sm font-medium text-gray-700"
              >
                Schema Name
              </label>
              <input
                id="tenants-create-schema"
                type="text"
                required
                value={schemaName}
                onChange={(event) => setSchemaName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. acme_schema"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-create-email"
                className="block text-sm font-medium text-gray-700"
              >
                Admin Email
              </label>
              <input
                id="tenants-create-email"
                type="email"
                required
                value={godAdminEmail}
                onChange={(event) => setGodAdminEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="tenants-create-password"
                className="block text-sm font-medium text-gray-700"
              >
                Admin Password
              </label>
              <input
                id="tenants-create-password"
                type="password"
                required
                minLength={8}
                value={godAdminPassword}
                onChange={(event) => setGodAdminPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">Password must be at least 8 characters long.</p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-create-tax-id"
                className="block text-sm font-medium text-gray-700"
              >
                Tax ID (optional)
              </label>
              <input
                id="tenants-create-tax-id"
                type="text"
                value={taxId}
                onChange={(event) => setTaxId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 12-3456789"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-create-w9"
                className="block text-sm font-medium text-gray-700"
              >
                W-9 Document
              </label>
              <input
                id="tenants-create-w9"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                required
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setW9File(file)
                  setFormError(null)
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500">
                Upload the signed W-9 document (PDF or image).
              </p>
            </div>
          </div>

          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating…' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
