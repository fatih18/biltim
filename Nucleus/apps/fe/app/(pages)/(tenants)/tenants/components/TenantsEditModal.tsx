'use client'

import type { TenantJSON } from '@monorepo/db-entities/schemas/default/tenants'
import { useEffect, useState } from 'react'

interface TenantsEditModalProps {
  tenant:
    | ((TenantJSON | null) & {
        god_admin_email: string
      })
    | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: {
    _id: string
    companyName: string
    subdomain: string
    schemaName: string
    godAdminEmail: string
  }) => void
  isSubmitting: boolean
}

export function TenantsEditModal({
  tenant,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: TenantsEditModalProps) {
  const [companyName, setCompanyName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [schemaName, setSchemaName] = useState('')
  const [godAdminEmail, setGodAdminEmail] = useState('')

  useEffect(() => {
    if (tenant && isOpen) {
      setCompanyName(tenant.company_name || tenant.company?.name || '')
      setSubdomain(tenant.subdomain)
      setSchemaName(tenant.schema_name)
      setGodAdminEmail(tenant.god_admin_email || '')
    }
  }, [tenant, isOpen])

  if (!isOpen || !tenant) {
    return null
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tenant) {
      return
    }
    onSubmit({
      _id: tenant.id,
      companyName,
      subdomain,
      schemaName,
      godAdminEmail,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Tenant</h2>
              <p className="text-sm text-gray-500">Update tenant metadata and activation status.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close edit tenant modal"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="tenants-edit-company"
                className="block text-sm font-medium text-gray-700"
              >
                Company Name
              </label>
              <input
                id="tenants-edit-company"
                type="text"
                required
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-edit-subdomain"
                className="block text-sm font-medium text-gray-700"
              >
                Subdomain
              </label>
              <input
                id="tenants-edit-subdomain"
                type="text"
                required
                value={subdomain}
                onChange={(event) => setSubdomain(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-edit-schema"
                className="block text-sm font-medium text-gray-700"
              >
                Schema Name
              </label>
              <input
                id="tenants-edit-schema"
                type="text"
                required
                value={schemaName}
                onChange={(event) => setSchemaName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tenants-edit-email"
                className="block text-sm font-medium text-gray-700"
              >
                Admin Email
              </label>
              <input
                id="tenants-edit-email"
                type="email"
                required
                value={godAdminEmail}
                onChange={(event) => setGodAdminEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

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
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
