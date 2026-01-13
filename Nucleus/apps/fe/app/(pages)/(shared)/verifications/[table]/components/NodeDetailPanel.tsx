'use client'

import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import type { Node } from '@xyflow/react'
import { Bell, Save, Trash2, UserCheck, Workflow, X } from 'lucide-react'
import { type UIEvent, useEffect, useState } from 'react'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import type { NotificationRuleNodeData } from './nodes/NotificationRuleNode'
import type { RequirementNodeData } from './nodes/RequirementNode'
import type { VerificationNodeData } from './nodes/VerificationNode'

type AnyNodeData = RequirementNodeData | NotificationRuleNodeData | VerificationNodeData

type NodeDetailPanelProps = {
  node: Node | null
  onClose: () => void
  onUpdate: (nodeId: string, data: Partial<AnyNodeData>) => void
  onDelete: (nodeId: string) => void
}

export function NodeDetailPanel({ node, onClose, onUpdate, onDelete }: NodeDetailPanelProps) {
  if (!node) return null

  const nodeData = node.data as AnyNodeData
  const nodeType = node.type

  const getHeaderInfo = () => {
    switch (nodeType) {
      case 'verification':
        return {
          icon: <Workflow className="h-5 w-5" />,
          title: 'Verification',
          color: 'from-violet-500 to-purple-500',
        }
      case 'verifier':
        return {
          icon: <UserCheck className="h-5 w-5" />,
          title: 'Verifier',
          color: 'from-indigo-500 to-sky-500',
        }
      case 'notification':
        return {
          icon: <Bell className="h-5 w-5" />,
          title: 'Notification',
          color: 'from-amber-500 to-orange-500',
        }
      default:
        return {
          icon: <UserCheck className="h-5 w-5" />,
          title: 'Node',
          color: 'from-slate-500 to-slate-600',
        }
    }
  }

  const headerInfo = getHeaderInfo()

  return (
    <div className="flex w-72 flex-col border-l border-slate-200 bg-white shadow-xl flex-shrink-0">
      <div className={`bg-gradient-to-r ${headerInfo.color} px-3 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white">
              {headerInfo.icon}
            </div>
            <div>
              <div className="text-[10px] font-medium text-white/70 uppercase tracking-wide">
                Configure
              </div>
              <div className="text-sm font-bold text-white">{headerInfo.title}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {nodeType === 'verification' && (
          <VerificationForm
            data={nodeData as VerificationNodeData}
            onUpdate={(data) => onUpdate(node.id, data)}
          />
        )}
        {nodeType === 'verifier' && (
          <VerifierForm
            data={nodeData as RequirementNodeData}
            onUpdate={(data) => onUpdate(node.id, data)}
          />
        )}
        {nodeType === 'notification' && (
          <NotificationForm
            data={nodeData as NotificationRuleNodeData}
            onUpdate={(data) => onUpdate(node.id, data)}
          />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2.5">
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
        >
          <Save className="h-3.5 w-3.5" />
          Done
        </button>
      </div>
    </div>
  )
}

function VerificationForm({
  data,
  onUpdate,
}: {
  data: VerificationNodeData
  onUpdate: (data: Partial<VerificationNodeData>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="verification-step-order"
          className="block text-sm font-medium text-slate-700"
        >
          Step Order
        </label>
        <input
          type="number"
          id="verification-step-order"
          min={1}
          value={data.stepOrder}
          onChange={(e) => onUpdate({ stepOrder: Number(e.target.value) || 1 })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>
    </div>
  )
}

function VerifierForm({
  data,
  onUpdate,
}: {
  data: RequirementNodeData
  onUpdate: (data: Partial<RequirementNodeData>) => void
}) {
  const actions = useGenericApiActions()
  const getUsersAction = actions.GET_USERS
  const getRolesAction = actions.GET_ROLES

  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [users, setUsers] = useState<UserJSON[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [hasMoreUsers, setHasMoreUsers] = useState(true)

  const [roleSearch, setRoleSearch] = useState('')
  const [rolePage, setRolePage] = useState(1)
  const [roles, setRoles] = useState<RoleJSON[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [hasMoreRoles, setHasMoreRoles] = useState(true)

  useEffect(() => {
    if (data.verifierType !== 'user' || !getUsersAction) return

    setIsLoadingUsers(true)
    getUsersAction.start({
      payload: {
        page: userPage,
        limit: 20,
        search: userSearch.trim() ? userSearch.trim() : undefined,
      },
      onAfterHandle: (response) => {
        setIsLoadingUsers(false)
        if (!response) return
        const pageUsers = (response.data ?? []) as UserJSON[]
        setUsers((prev) => (userPage === 1 ? pageUsers : [...prev, ...pageUsers]))
        setHasMoreUsers(pageUsers.length === 20)
      },
      onErrorHandle: () => {
        setIsLoadingUsers(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.verifierType, userPage, userSearch])

  useEffect(() => {
    if (data.verifierType !== 'role' || !getRolesAction) return

    setIsLoadingRoles(true)
    getRolesAction.start({
      payload: {
        page: rolePage,
        limit: 20,
        search: roleSearch.trim() ? roleSearch.trim() : undefined,
      },
      onAfterHandle: (response) => {
        setIsLoadingRoles(false)
        if (!response) return
        const pageRoles = (response.data ?? []) as RoleJSON[]
        setRoles((prev) => (rolePage === 1 ? pageRoles : [...prev, ...pageRoles]))
        setHasMoreRoles(pageRoles.length === 20)
      },
      onErrorHandle: () => {
        setIsLoadingRoles(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.verifierType, rolePage, roleSearch])

  function handleUserScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollHeight - (scrollTop + clientHeight) < 24 && !isLoadingUsers && hasMoreUsers) {
      setUserPage((prev) => prev + 1)
    }
  }

  function handleRoleScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollHeight - (scrollTop + clientHeight) < 24 && !isLoadingRoles && hasMoreRoles) {
      setRolePage((prev) => prev + 1)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="verifier-type" className="block text-sm font-medium text-slate-700">
          Verifier Type
        </label>
        <select
          id="verifier-type"
          value={data.verifierType ?? 'user'}
          onChange={(e) => {
            const nextType = e.target.value as 'user' | 'role'
            onUpdate({
              verifierType: nextType,
              isAllRequired: nextType === 'role' ? data.isAllRequired : false,
              verifierId: null,
            })
            if (nextType === 'user') {
              setUserSearch('')
              setUserPage(1)
              setUsers([])
            } else {
              setRoleSearch('')
              setRolePage(1)
              setRoles([])
            }
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="user">Specific User</option>
          <option value="role">Role-based</option>
        </select>
      </div>

      {data.verifierType === 'user' && (
        <div className="space-y-2">
          <label
            htmlFor="verifier-user-search"
            className="block text-xs font-medium text-slate-700"
          >
            Select User
          </label>
          <input
            type="text"
            id="verifier-user-search"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value)
              setUserPage(1)
              setUsers([])
            }}
            placeholder="Search by name or email"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <div
            className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50"
            onScroll={handleUserScroll}
          >
            {isLoadingUsers && users.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No users found.</div>
            ) : (
              users.map((user) => {
                const fullName = `${user.profile?.first_name ?? ''} ${
                  user.profile?.last_name ?? ''
                }`.trim()
                const isSelected = data.verifierId === user.id
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        verifierId: user.id,
                        label: fullName || user.email || 'Unknown User',
                      })
                    }
                    className={`flex w-full items-start justify-between px-3 py-1.5 text-left text-xs hover:bg-white ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-indigo-400' : ''
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-slate-900 truncate">
                        {fullName || user.email}
                      </span>
                      {fullName && (
                        <span className="block text-[11px] text-slate-500 truncate">
                          {user.email}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
            {isLoadingUsers && users.length > 0 && (
              <div className="px-3 py-1 text-[11px] text-slate-400">Loading more…</div>
            )}
          </div>
        </div>
      )}

      {data.verifierType === 'role' && (
        <div className="space-y-2">
          <label
            htmlFor="verifier-role-search"
            className="block text-xs font-medium text-slate-700"
          >
            Select Role
          </label>
          <input
            type="text"
            id="verifier-role-search"
            value={roleSearch}
            onChange={(e) => {
              setRoleSearch(e.target.value)
              setRolePage(1)
              setRoles([])
            }}
            placeholder="Search roles"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <div
            className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50"
            onScroll={handleRoleScroll}
          >
            {isLoadingRoles && roles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">Loading roles…</div>
            ) : roles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No roles found.</div>
            ) : (
              roles.map((role) => {
                const isSelected = data.verifierId === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        verifierId: role.id,
                        label: role.name,
                      })
                    }
                    className={`flex w-full items-start justify-between px-3 py-1.5 text-left text-xs hover:bg-white ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-indigo-400' : ''
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-slate-900 truncate">{role.name}</span>
                      {role.description && (
                        <span className="block text-[11px] text-slate-500 truncate">
                          {role.description}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
            {isLoadingRoles && roles.length > 0 && (
              <div className="px-3 py-1 text-[11px] text-slate-400">Loading more…</div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.isSignatureMandatory}
            onChange={(e) => onUpdate({ isSignatureMandatory: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <div className="text-sm font-medium text-slate-900">Require Signature</div>
            <div className="text-xs text-slate-500">Verifier must sign to approve</div>
          </div>
        </label>

        {data.verifierType === 'role' && (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={data.isAllRequired}
              onChange={(e) => onUpdate({ isAllRequired: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900">
                All users with this role must approve
              </div>
              <div className="text-xs text-slate-500">
                Require approval from every user who has this role
              </div>
            </div>
          </label>
        )}
      </div>
    </div>
  )
}

function NotificationForm({
  data,
  onUpdate,
}: {
  data: NotificationRuleNodeData
  onUpdate: (data: Partial<NotificationRuleNodeData>) => void
}) {
  const actions = useGenericApiActions()
  const getUsersAction = actions.GET_USERS
  const getRolesAction = actions.GET_ROLES

  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [users, setUsers] = useState<UserJSON[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [hasMoreUsers, setHasMoreUsers] = useState(true)

  const [roleSearch, setRoleSearch] = useState('')
  const [rolePage, setRolePage] = useState(1)
  const [roles, setRoles] = useState<RoleJSON[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [hasMoreRoles, setHasMoreRoles] = useState(true)

  useEffect(() => {
    if (data.recipientType !== 'user' || !getUsersAction) return

    setIsLoadingUsers(true)
    getUsersAction.start({
      payload: {
        page: userPage,
        limit: 20,
        search: userSearch.trim() ? userSearch.trim() : undefined,
      },
      onAfterHandle: (response) => {
        setIsLoadingUsers(false)
        if (!response) return
        const pageUsers = (response.data ?? []) as UserJSON[]
        setUsers((prev) => (userPage === 1 ? pageUsers : [...prev, ...pageUsers]))
        setHasMoreUsers(pageUsers.length === 20)
      },
      onErrorHandle: () => {
        setIsLoadingUsers(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.recipientType, userPage, userSearch])

  useEffect(() => {
    if (data.recipientType !== 'role' || !getRolesAction) return

    setIsLoadingRoles(true)
    getRolesAction.start({
      payload: {
        page: rolePage,
        limit: 20,
        search: roleSearch.trim() ? roleSearch.trim() : undefined,
      },
      onAfterHandle: (response) => {
        setIsLoadingRoles(false)
        if (!response) return
        const pageRoles = (response.data ?? []) as RoleJSON[]
        setRoles((prev) => (rolePage === 1 ? pageRoles : [...prev, ...pageRoles]))
        setHasMoreRoles(pageRoles.length === 20)
      },
      onErrorHandle: () => {
        setIsLoadingRoles(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.recipientType, rolePage, roleSearch])

  function handleUserScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollHeight - (scrollTop + clientHeight) < 24 && !isLoadingUsers && hasMoreUsers) {
      setUserPage((prev) => prev + 1)
    }
  }

  function handleRoleScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (scrollHeight - (scrollTop + clientHeight) < 24 && !isLoadingRoles && hasMoreRoles) {
      setRolePage((prev) => prev + 1)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="trigger" className="block text-sm font-medium text-slate-700">
          Trigger Event
        </label>
        <select
          id="trigger"
          value={data.trigger}
          onChange={(e) =>
            onUpdate({ trigger: e.target.value as NotificationRuleNodeData['trigger'] })
          }
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        >
          <option value="on_flow_started">Flow Started</option>
          <option value="on_approved">Approved</option>
          <option value="on_rejected">Rejected</option>
          <option value="on_flow_completed">Flow Completed</option>
        </select>
      </div>

      <div>
        <label htmlFor="recipient-type" className="block text-sm font-medium text-slate-700">
          Recipient Type
        </label>
        <select
          id="recipient-type"
          value={data.recipientType}
          onChange={(e) => {
            const nextType = e.target.value as 'user' | 'role'
            onUpdate({ recipientType: nextType, recipientId: null })
            if (nextType === 'user') {
              setUserSearch('')
              setUserPage(1)
              setUsers([])
            } else {
              setRoleSearch('')
              setRolePage(1)
              setRoles([])
            }
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        >
          <option value="user">Specific User</option>
          <option value="role">Role-based</option>
        </select>
      </div>

      {data.recipientType === 'user' && (
        <div className="space-y-2">
          <label
            htmlFor="notification-user-search"
            className="block text-xs font-medium text-slate-700"
          >
            Select User
          </label>
          <input
            type="text"
            id="notification-user-search"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value)
              setUserPage(1)
              setUsers([])
            }}
            placeholder="Search by name or email"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
          <div
            className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50"
            onScroll={handleUserScroll}
          >
            {isLoadingUsers && users.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No users found.</div>
            ) : (
              users.map((user) => {
                const fullName = `${user.profile?.first_name ?? ''} ${
                  user.profile?.last_name ?? ''
                }`.trim()
                const isSelected = data.recipientId === user.id
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        recipientId: user.id,
                      })
                    }
                    className={`flex w-full items-start justify-between px-3 py-1.5 text-left text-xs hover:bg-white ${
                      isSelected ? 'bg-amber-50 border-l-2 border-amber-400' : ''
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-slate-900 truncate">
                        {fullName || user.email}
                      </span>
                      {fullName && (
                        <span className="block text-[11px] text-slate-500 truncate">
                          {user.email}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
            {isLoadingUsers && users.length > 0 && (
              <div className="px-3 py-1 text-[11px] text-slate-400">Loading more…</div>
            )}
          </div>
        </div>
      )}

      {data.recipientType === 'role' && (
        <div className="space-y-2">
          <label
            htmlFor="notification-role-search"
            className="block text-xs font-medium text-slate-700"
          >
            Select Role
          </label>
          <input
            type="text"
            id="notification-role-search"
            value={roleSearch}
            onChange={(e) => {
              setRoleSearch(e.target.value)
              setRolePage(1)
              setRoles([])
            }}
            placeholder="Search roles"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
          <div
            className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50"
            onScroll={handleRoleScroll}
          >
            {isLoadingRoles && roles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">Loading roles…</div>
            ) : roles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No roles found.</div>
            ) : (
              roles.map((role) => {
                const isSelected = data.recipientId === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        recipientId: role.id,
                      })
                    }
                    className={`flex w-full items-start justify-between px-3 py-1.5 text-left text-xs hover:bg-white ${
                      isSelected ? 'bg-amber-50 border-l-2 border-amber-400' : ''
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-slate-900 truncate">{role.name}</span>
                      {role.description && (
                        <span className="block text-[11px] text-slate-500 truncate">
                          {role.description}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
            {isLoadingRoles && roles.length > 0 && (
              <div className="px-3 py-1 text-[11px] text-slate-400">Loading more…</div>
            )}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="notification-channel" className="block text-sm font-medium text-slate-700">
          Notification Channel
        </label>
        <select
          id="notification-channel"
          value={data.channel}
          onChange={(e) => onUpdate({ channel: e.target.value as 'portal' })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
        >
          <option value="portal">Platform (in-app portal)</option>
        </select>
      </div>
    </div>
  )
}
