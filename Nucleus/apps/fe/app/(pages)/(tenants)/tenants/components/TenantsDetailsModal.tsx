'use client'

import type { TenantJSON } from '@monorepo/db-entities/schemas/default/tenants'
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  Edit3,
  FileKey2,
  Globe,
  HardDrive,
  Key,
  Layers,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Settings2,
  Shield,
  Table2,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '@/app/_components/Global/Modal'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'

type ConfirmAction = {
  type: 'sync' | 'drop' | 'delete' | 'restore' | 'save' | 'admin'
  title: string
  description: string
  confirmText: string
  variant: 'danger' | 'warning' | 'info'
  onConfirm: () => void
}

interface TenantsDetailsModalProps {
  tenant:
    | ((TenantJSON | null) & {
        god_admin_email: string
        god_admin_password: string
      })
    | null
  isOpen: boolean
  onClose: () => void
  onRequestDelete: () => void
  onTenantUpdated?: () => void
}

type BackupData = {
  schemaName: string
  tables: Array<{
    tableName: string
    rowCount: number
    data: Record<string, unknown>[]
  }>
  metadata: {
    createdAt: string
    version: string
    totalTables: number
    totalRows: number
  }
}

type ExpandSchemaSuccess = {
  schemaName: string
  changes: {
    tablesCreated: string[]
    columnsAdded: string[]
    columnsDropped: string[]
  }
}

type TenantStats = {
  schemaName: string
  tables: {
    count: number
    details: Array<{
      table_name: string
      column_count: number
    }>
  }
  entityCounts: Record<string, number>
  indexes: { count: number }
  foreignKeys: { count: number }
  storage: {
    totalBytes: number
    totalMB: string
  }
  summary: {
    totalTables: number
    totalRecords: number
    totalIndexes: number
    totalForeignKeys: number
  }
  adminProfile?: {
    firstName: string | null
    lastName: string | null
    email: string | null
  }
}

type SchemaTable = {
  table_name: string
  table_type: string
  column_count: number
}

type SchemaIndex = {
  indexname: string
  indexdef: string
}

type SchemaForeignKey = {
  constraint_name: string
  table_name: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
}

type TabType = 'overview' | 'schema' | 'stats' | 'operations'

export function TenantsDetailsModal({
  tenant,
  isOpen,
  onClose,
  onRequestDelete,
  onTenantUpdated,
}: TenantsDetailsModalProps) {
  const actions = useGenericApiActions()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandSuccess, setExpandSuccess] = useState<ExpandSchemaSuccess | null>(null)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editSubdomain, setEditSubdomain] = useState('')

  // Admin credentials edit state
  const [isEditingAdmin, setIsEditingAdmin] = useState(false)
  const [editAdminEmail, setEditAdminEmail] = useState('')
  const [editAdminPassword, setEditAdminPassword] = useState('')
  const [editAdminFirstName, setEditAdminFirstName] = useState('')
  const [editAdminLastName, setEditAdminLastName] = useState('')

  // Backup/Restore state
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null)

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSchemaError(null)
      setSuccessMessage(null)
      setExpandSuccess(null)
      setActiveTab('overview')
      setIsEditing(false)
      setIsEditingAdmin(false)
      setEditAdminPassword('')
      setLastBackup(null)
      setConfirmAction(null)
      return
    }

    if (!tenant?.schema_name) {
      setSchemaError('Schema name not found')
      return
    }

    // Initialize edit fields
    setEditCompanyName(tenant.company_name || tenant.company?.name || '')
    setEditSubdomain(tenant.subdomain || '')
    setEditAdminEmail(tenant.god_admin_email || '')

    setSchemaError(null)
    setExpandSuccess(null)
    actions.LIST_SCHEMAS_OF_TENANT?.start({
      payload: { _schemaName: tenant.schema_name },
    })
    actions.GET_TENANT_STATS?.start({
      payload: { _schemaName: tenant.schema_name },
    })
  }, [isOpen, tenant?.schema_name])

  // Sync admin profile edit fields from stats when loaded
  useEffect(() => {
    const stats = actions.GET_TENANT_STATS?.state?.data as TenantStats | undefined
    console.log('📊 Frontend - tenantStats:', stats)
    console.log('📊 Frontend - adminProfile:', stats?.adminProfile)
    const profile = stats?.adminProfile
    if (profile) {
      setEditAdminFirstName(profile.firstName || '')
      setEditAdminLastName(profile.lastName || '')
    }
  }, [actions.GET_TENANT_STATS?.state?.data])

  if (!tenant || !isOpen) {
    return null
  }

  const isSchemaLoading = Boolean(actions.LIST_SCHEMAS_OF_TENANT?.state?.isPending)
  const isDroppingSchema = Boolean(actions.DROP_SCHEMA?.state?.isPending)
  const isExpandingSchema = Boolean(actions.EXPAND_TENANT_SCHEMA?.state?.isPending)
  const isLoadingStats = Boolean(actions.GET_TENANT_STATS?.state?.isPending)
  const tenantStats = actions.GET_TENANT_STATS?.state?.data as TenantStats | undefined
  const schemaData = actions.LIST_SCHEMAS_OF_TENANT?.state?.data

  const adminProfile = tenantStats?.adminProfile
  const adminFullName = adminProfile
    ? `${adminProfile.firstName || ''} ${adminProfile.lastName || ''}`.trim() || null
    : null

  const createdAt = tenant.created_at
    ? new Date(tenant.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  const updatedAt = tenant.updated_at
    ? new Date(tenant.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  // Confirmation wrappers for dangerous actions
  function requestDropSchema() {
    setConfirmAction({
      type: 'drop',
      title: 'Drop Database Schema',
      description: `This will permanently delete all tables and data in schema "${tenant?.schema_name}". This action cannot be undone.`,
      confirmText: 'Drop Schema',
      variant: 'danger',
      onConfirm: doDropSchema,
    })
  }

  function requestExpandSchema() {
    setConfirmAction({
      type: 'sync',
      title: 'Sync Schema',
      description:
        'This will apply any pending schema changes to the tenant database. Existing data will be preserved.',
      confirmText: 'Sync Schema',
      variant: 'warning',
      onConfirm: doExpandSchema,
    })
  }

  function requestDelete() {
    setConfirmAction({
      type: 'delete',
      title: 'Delete Tenant',
      description: `This will permanently delete tenant "${tenant?.subdomain}" and all associated data. This action cannot be undone.`,
      confirmText: 'Delete Tenant',
      variant: 'danger',
      onConfirm: () => {
        setConfirmAction(null)
        onRequestDelete()
      },
    })
  }

  // Actual action handlers
  function doDropSchema() {
    if (!tenant?.schema_name) return
    setConfirmAction(null)
    setSchemaError(null)
    actions.DROP_SCHEMA?.start({
      payload: { _schemaName: tenant.schema_name },
      onAfterHandle: () => {
        setSuccessMessage('Schema dropped successfully')
        actions.LIST_SCHEMAS_OF_TENANT?.start({
          payload: { _schemaName: tenant.schema_name },
        })
        setTimeout(() => setSuccessMessage(null), 3000)
      },
      onErrorHandle: (error) => {
        setSchemaError(typeof error === 'string' ? error : 'Failed to drop schema')
      },
    })
  }

  function doExpandSchema() {
    if (!tenant?.schema_name) return
    setConfirmAction(null)
    setSchemaError(null)
    setExpandSuccess(null)
    actions.EXPAND_TENANT_SCHEMA?.start({
      payload: { _schemaName: tenant.schema_name },
      onAfterHandle: (data) => {
        if (data) {
          setExpandSuccess(data as ExpandSchemaSuccess)
          actions.LIST_SCHEMAS_OF_TENANT?.start({
            payload: { _schemaName: tenant.schema_name },
          })
        }
      },
      onErrorHandle: (error) => {
        setSchemaError(typeof error === 'string' ? error : 'Failed to expand schema')
      },
    })
  }

  // Edit handlers
  function handleSaveEdit() {
    if (!tenant?.id) return
    setSchemaError(null)
    actions.UPDATE_TENANT_METADATA?.start({
      payload: {
        _tenantId: tenant.id,
        company_name: editCompanyName,
        subdomain: editSubdomain,
      },
      onAfterHandle: () => {
        setIsEditing(false)
        setSuccessMessage('Tenant updated successfully')
        onTenantUpdated?.()
        setTimeout(() => setSuccessMessage(null), 3000)
      },
      onErrorHandle: (error) => {
        setSchemaError(typeof error === 'string' ? error : 'Failed to update tenant')
      },
    })
  }

  function handleSaveAdminCredentials() {
    if (!tenant?.id) return
    setSchemaError(null)

    const payload: {
      _tenantId: string
      god_admin_email?: string
      god_admin_password?: string
      god_admin_first_name?: string
      god_admin_last_name?: string
    } = {
      _tenantId: tenant.id,
    }

    // Only include email if it changed
    if (editAdminEmail && editAdminEmail !== tenant.god_admin_email) {
      payload.god_admin_email = editAdminEmail
    }

    // Only include password if provided
    if (editAdminPassword) {
      payload.god_admin_password = editAdminPassword
    }

    // Include name fields if provided
    if (editAdminFirstName.trim()) {
      payload.god_admin_first_name = editAdminFirstName.trim()
    }
    if (editAdminLastName.trim()) {
      payload.god_admin_last_name = editAdminLastName.trim()
    }

    // Check if there's anything to update
    if (
      !payload.god_admin_email &&
      !payload.god_admin_password &&
      !payload.god_admin_first_name &&
      !payload.god_admin_last_name
    ) {
      setSchemaError('No changes to save')
      return
    }

    actions.UPDATE_TENANT_METADATA?.start({
      payload,
      onAfterHandle: () => {
        setIsEditingAdmin(false)
        setEditAdminPassword('')
        setEditAdminFirstName('')
        setEditAdminLastName('')
        setSuccessMessage('Admin profile updated successfully')
        if (tenant.schema_name) {
          actions.GET_TENANT_STATS?.start({
            payload: { _schemaName: tenant.schema_name },
          })
        }
        onTenantUpdated?.()
        setTimeout(() => setSuccessMessage(null), 3000)
      },
      onErrorHandle: (error) => {
        setSchemaError(typeof error === 'string' ? error : 'Failed to update admin profile')
      },
    })
  }

  // Backup handlers
  function handleBackup() {
    if (!tenant?.schema_name) return
    setSchemaError(null)
    actions.BACKUP_TENANT?.start({
      payload: { _schemaName: tenant.schema_name },
      onAfterHandle: (data) => {
        if (data) {
          setLastBackup(data as BackupData)
          // Download as JSON file
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `backup_${tenant.schema_name}_${new Date().toISOString().split('T')[0]}.json`
          a.click()
          URL.revokeObjectURL(url)
          setSuccessMessage('Backup downloaded successfully')
          setTimeout(() => setSuccessMessage(null), 3000)
        }
      },
      onErrorHandle: (error) => {
        setSchemaError(typeof error === 'string' ? error : 'Failed to create backup')
      },
    })
  }

  function handleRestoreFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !tenant?.schema_name) return

    // Check file size (warn if > 10MB)
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 50) {
      setSchemaError(
        'Backup file is too large (max 50MB). For larger backups, use direct database tools.'
      )
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string) as BackupData
        const totalRows = backup.metadata?.totalRows || 0

        // Show confirmation for restore
        setConfirmAction({
          type: 'restore',
          title: 'Restore Backup',
          description: `This will import ${backup.metadata?.totalTables || 0} tables with ${totalRows.toLocaleString()} rows into "${tenant.schema_name}". ${
            totalRows > 10000 ? 'This may take a while for large datasets. ' : ''
          }Existing data will be merged (duplicates will be skipped).`,
          confirmText: 'Restore Backup',
          variant: fileSizeMB > 10 ? 'warning' : 'info',
          onConfirm: () => {
            setConfirmAction(null)
            setSchemaError(null)
            actions.RESTORE_TENANT?.start({
              payload: {
                _schemaName: tenant.schema_name,
                backup,
                mode: 'merge',
              },
              onAfterHandle: () => {
                setSuccessMessage('Restore completed successfully')
                actions.GET_TENANT_STATS?.start({
                  payload: { _schemaName: tenant.schema_name },
                })
                setTimeout(() => setSuccessMessage(null), 3000)
              },
              onErrorHandle: (error) => {
                setSchemaError(typeof error === 'string' ? error : 'Failed to restore backup')
              },
            })
          },
        })
      } catch {
        setSchemaError('Invalid backup file format')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const isUpdating = Boolean(actions.UPDATE_TENANT_METADATA?.state?.isPending)
  const isBackingUp = Boolean(actions.BACKUP_TENANT?.state?.isPending)
  const isRestoring = Boolean(actions.RESTORE_TENANT?.state?.isPending)

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Activity },
    { id: 'schema' as TabType, label: 'Schema', icon: Database },
    { id: 'stats' as TabType, label: 'Statistics', icon: BarChart3 },
    { id: 'operations' as TabType, label: 'Operations', icon: Settings2 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/70 backdrop-blur-sm pt-[88px] pb-4 px-4 overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[calc(100vh-104px)] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header - compact */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur text-white">
                <Server size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {tenant.company_name || tenant.company?.name || tenant.subdomain}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                  <span className="text-slate-400 text-xs sm:text-sm">{tenant.schema_name}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs - compact */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/50 px-3 sm:px-6">
          <nav className="flex gap-0.5 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                  ${tab.id === 'operations' ? 'ml-auto' : ''}
                `}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Error/Success Messages */}
          {schemaError && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle size={18} />
              {schemaError}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={18} />
              {successMessage}
            </div>
          )}
          {expandSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={18} />
                Schema Expanded Successfully
              </div>
              {expandSuccess.changes.tablesCreated.length > 0 && (
                <p className="mt-1 ml-6">
                  Tables created: {expandSuccess.changes.tablesCreated.join(', ')}
                </p>
              )}
              {expandSuccess.changes.columnsAdded.length > 0 && (
                <p className="ml-6">
                  Columns added: {expandSuccess.changes.columnsAdded.join(', ')}
                </p>
              )}
              {expandSuccess.changes.tablesCreated.length === 0 &&
                expandSuccess.changes.columnsAdded.length === 0 &&
                expandSuccess.changes.columnsDropped.length === 0 && (
                  <p className="ml-6">Schema is already up to date</p>
                )}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <Table2 size={20} className="opacity-80" />
                    {isLoadingStats && <Loader2 size={14} className="animate-spin" />}
                  </div>
                  <p className="mt-3 text-2xl font-bold">
                    {tenantStats?.summary?.totalTables ?? '—'}
                  </p>
                  <p className="text-indigo-200 text-sm">Tables</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <Layers size={20} className="opacity-80" />
                    {isLoadingStats && <Loader2 size={14} className="animate-spin" />}
                  </div>
                  <p className="mt-3 text-2xl font-bold">
                    {tenantStats?.summary?.totalRecords?.toLocaleString() ?? '—'}
                  </p>
                  <p className="text-emerald-200 text-sm">Records</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <FileKey2 size={20} className="opacity-80" />
                    {isLoadingStats && <Loader2 size={14} className="animate-spin" />}
                  </div>
                  <p className="mt-3 text-2xl font-bold">
                    {tenantStats?.summary?.totalIndexes ?? '—'}
                  </p>
                  <p className="text-amber-200 text-sm">Indexes</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <HardDrive size={20} className="opacity-80" />
                    {isLoadingStats && <Loader2 size={14} className="animate-spin" />}
                  </div>
                  <p className="mt-3 text-2xl font-bold">
                    {tenantStats?.storage?.totalMB ?? '—'} MB
                  </p>
                  <p className="text-purple-200 text-sm">Storage</p>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Tenant Info */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Globe size={18} className="text-slate-500" />
                      Tenant Information
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Edit3 size={14} />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Company Name</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCompanyName}
                          onChange={(e) => setEditCompanyName(e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-sm text-slate-800 w-40"
                        />
                      ) : (
                        <span className="font-medium text-slate-800">
                          {tenant.company_name || tenant.company?.name || '—'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Subdomain</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editSubdomain}
                          onChange={(e) => setEditSubdomain(e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-sm text-slate-800 w-40"
                        />
                      ) : (
                        <span className="font-medium text-slate-800">{tenant.subdomain}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Schema</span>
                      <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono text-slate-700">
                        {tenant.schema_name}
                      </code>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm">Created</span>
                      <span className="text-slate-600 text-sm">{createdAt}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500 text-sm">Updated</span>
                      <span className="text-slate-600 text-sm">{updatedAt}</span>
                    </div>
                    {isEditing && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
                        >
                          {isUpdating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Credentials */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Shield size={18} className="text-slate-500" />
                      Admin Credentials
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingAdmin(!isEditingAdmin)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Edit3 size={14} />
                      {isEditingAdmin ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    {!isEditingAdmin && (
                      <div className="py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-sm block mb-1">Admin Name</span>
                        <span className="font-medium text-slate-800">{adminFullName || '—'}</span>
                      </div>
                    )}
                    <div className="py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm block mb-1">Admin Email</span>
                      {isEditingAdmin ? (
                        <input
                          type="email"
                          value={editAdminEmail}
                          onChange={(e) => setEditAdminEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                          placeholder="admin@example.com"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <span className="font-medium text-slate-800">
                            {tenant.god_admin_email || '—'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-sm block mb-1">
                        {isEditingAdmin ? 'New Password' : 'Password'}
                      </span>
                      {isEditingAdmin ? (
                        <input
                          type="password"
                          value={editAdminPassword}
                          onChange={(e) => setEditAdminPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                          placeholder="Leave empty to keep current password"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Key size={16} className="text-slate-400" />
                          <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono text-slate-700">
                            ••••••••••••
                          </code>
                        </div>
                      )}
                    </div>
                    {isEditingAdmin && (
                      <div className="py-2 grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 text-sm block mb-1">First Name</span>
                          <input
                            type="text"
                            value={editAdminFirstName}
                            onChange={(e) => setEditAdminFirstName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <span className="text-slate-500 text-sm block mb-1">Last Name</span>
                          <input
                            type="text"
                            value={editAdminLastName}
                            onChange={(e) => setEditAdminLastName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    )}
                    {isEditingAdmin && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveAdminCredentials}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
                        >
                          {isUpdating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          Update Credentials
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schema Tab */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              {isSchemaLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-indigo-600" />
                </div>
              ) : schemaData ? (
                <>
                  {/* Schema Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-slate-800">
                        {schemaData.summary?.tableCount}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">Tables</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-slate-800">
                        {schemaData.summary?.indexCount}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">Indexes</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-slate-800">
                        {schemaData.summary?.foreignKeyCount}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">Foreign Keys</p>
                    </div>
                  </div>

                  {/* Tables List */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Table2 size={18} className="text-slate-500" />
                        Tables ({schemaData.tables?.length || 0})
                      </h3>
                      <button
                        type="button"
                        onClick={requestExpandSchema}
                        disabled={isExpandingSchema}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        {isExpandingSchema ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Sync
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Table Name
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Type
                            </th>
                            <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                              Columns
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schemaData.tables?.map((table: SchemaTable) => (
                            <tr key={table.table_name} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-mono text-sm text-slate-700">
                                {table.table_name}
                              </td>
                              <td className="px-5 py-3">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                                  {table.table_type}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right text-slate-600">
                                {table.column_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Indexes */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <FileKey2 size={18} className="text-slate-500" />
                        Indexes ({schemaData.indexes?.length || 0})
                      </h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-4 space-y-2">
                      {schemaData.indexes?.map((index: SchemaIndex) => (
                        <div key={index.indexname} className="bg-slate-50 rounded-lg p-3">
                          <p className="font-mono text-sm font-medium text-slate-800">
                            {index.indexname}
                          </p>
                          <p className="font-mono text-xs text-slate-500 mt-1 break-all">
                            {index.indexdef}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Foreign Keys */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Settings2 size={18} className="text-slate-500" />
                        Foreign Keys ({schemaData.foreignKeys?.length || 0})
                      </h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-4 space-y-2">
                      {schemaData.foreignKeys?.map((fk: SchemaForeignKey) => (
                        <div
                          key={fk.constraint_name}
                          className="bg-slate-50 rounded-lg p-3 flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <code className="text-sm text-slate-700">
                              {fk.table_name}.{fk.column_name}
                            </code>
                          </div>
                          <ChevronRight size={16} className="text-slate-400" />
                          <div className="flex-1 text-right">
                            <code className="text-sm text-indigo-600">
                              {fk.foreign_table_name}.{fk.foreign_column_name}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">No schema data available</div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-indigo-600" />
                </div>
              ) : tenantStats ? (
                <>
                  {/* Entity Counts */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Layers size={18} className="text-slate-500" />
                        Records per Table
                      </h3>
                    </div>
                    <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(tenantStats.entityCounts || {}).map(([table, count]) => (
                        <div
                          key={table}
                          className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-3"
                        >
                          <p className="text-xl font-bold text-slate-800">
                            {(count as number).toLocaleString()}
                          </p>
                          <p className="text-slate-500 text-xs font-mono truncate" title={table}>
                            {table}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Storage Info */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <HardDrive size={18} className="text-slate-500" />
                        Storage Usage
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="flex items-end gap-4">
                        <div>
                          <p className="text-4xl font-bold text-slate-800">
                            {tenantStats.storage?.totalMB}
                          </p>
                          <p className="text-slate-500">Megabytes</p>
                        </div>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{
                              width: `${Math.min((Number(tenantStats.storage?.totalMB || 0) / 100) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-500">
                        {tenantStats.storage?.totalBytes?.toLocaleString()} bytes across{' '}
                        {tenantStats.summary?.totalTables} tables
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">No statistics available</div>
              )}
            </div>
          )}

          {/* Operations Tab */}
          {activeTab === 'operations' && (
            <div className="space-y-6">
              {/* Backup & Restore Section */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Archive size={18} className="text-slate-500" />
                    Backup & Restore
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-medium text-slate-800">Create Backup</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Download all tenant data as a JSON file
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBackup}
                      disabled={isBackingUp}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                      {isBackingUp ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      Download Backup
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-medium text-slate-800">Restore from Backup</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Import data from a previously downloaded backup file
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors cursor-pointer">
                      {isRestoring ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Upload Backup
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreFile}
                        className="hidden"
                        disabled={isRestoring}
                      />
                    </label>
                  </div>
                  {lastBackup && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
                      <p className="text-slate-600">
                        Last backup:{' '}
                        <span className="font-medium">{lastBackup.metadata.createdAt}</span>
                      </p>
                      <p className="text-slate-500">
                        {lastBackup.metadata.totalTables} tables, {lastBackup.metadata.totalRows}{' '}
                        rows
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Schema Operations */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Database size={18} className="text-slate-500" />
                    Schema Operations
                  </h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-medium text-slate-800">Sync Schema</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Apply latest schema changes to this tenant
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={requestExpandSchema}
                      disabled={isExpandingSchema}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors disabled:opacity-60"
                    >
                      {isExpandingSchema ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      Sync Schema
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white border border-rose-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-rose-50 border-b border-rose-200">
                  <h3 className="font-semibold text-rose-800 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Danger Zone
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-medium text-slate-800">Drop Database Schema</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Remove all tables and data. This is irreversible.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={requestDropSchema}
                      disabled={isDroppingSchema}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 transition-colors disabled:opacity-60"
                    >
                      {isDroppingSchema ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Drop Schema
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-medium text-rose-700">Delete Tenant</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Permanently delete this tenant. This cannot be undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={requestDelete}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-rose-600 text-rose-600 font-medium text-sm hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Tenant
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">{confirmAction?.description}</p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAction?.onConfirm}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                confirmAction?.variant === 'danger'
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : confirmAction?.variant === 'warning'
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {confirmAction?.confirmText}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
