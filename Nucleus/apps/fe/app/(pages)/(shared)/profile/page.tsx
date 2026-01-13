'use client'

import type { AddressJSON } from '@monorepo/db-entities/schemas/default/address'
import type { FileJSON } from '@monorepo/db-entities/schemas/default/file'
import type { PhoneJSON } from '@monorepo/db-entities/schemas/default/phone'
import type { RoleJSON } from '@monorepo/db-entities/schemas/default/role'
import type { UserJSON } from '@monorepo/db-entities/schemas/default/user'
import type { UserOAuthProviderJSON } from '@monorepo/db-entities/schemas/default/user_oauth_provider'
import { FileImage, Link2, MapPin, Phone, Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AzureButton, GitHubButton, LinkedAccountCard } from '@/app/_components/OAuth'
import { useGenericApiActions } from '@/app/_hooks/UseGenericApiStore'
import { useStore } from '../../../_store'

import { AccountStatusCards } from './components/AccountStatusCards'
import { AddAddressModal } from './components/AddAddressModal'
import { AddPhoneModal } from './components/AddPhoneModal'
import { AddressCard } from './components/AddressCard'
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal'
import { EditProfileModal } from './components/EditProfileModal'
import { EmptyState } from './components/EmptyState'
import { FileCard } from './components/FileCard'
import { PhoneCard } from './components/PhoneCard'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfilePictureCard } from './components/ProfilePictureCard'
import { ProfileSection } from './components/ProfileSection'

export default function Profile() {
  const store = useStore()

  const user: UserJSON | undefined = store.user
  const actions = useGenericApiActions()

  const [linkedAccounts, setLinkedAccounts] = useState<UserOAuthProviderJSON[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  // Fetch linked OAuth accounts
  useEffect(() => {
    if (!user?.id) return

    actions.GET_OAUTH_ACCOUNTS?.start({
      onAfterHandle: (response) => {
        const accounts = (response?.data || []) as UserOAuthProviderJSON[]
        setLinkedAccounts(accounts)
        setLoadingAccounts(false)
      },
      onErrorHandle: () => {
        setLoadingAccounts(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [addressModal, setAddressModal] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit'
    address: AddressJSON | null
  }>({
    isOpen: false,
    mode: 'create',
    address: null,
  })
  const [phoneModal, setPhoneModal] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit'
    phone: PhoneJSON | null
  }>({
    isOpen: false,
    mode: 'create',
    phone: null,
  })
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    item: AddressJSON | PhoneJSON | FileJSON | null
    type: 'address' | 'phone' | 'file'
  }>({
    isOpen: false,
    item: null,
    type: 'address',
  })

  const handleEditClick = () => {
    setIsEditModalOpen(true)
  }

  const handleAddAddressClick = () => {
    setAddressModal({
      isOpen: true,
      mode: 'create',
      address: null,
    })
  }

  const rolesWithClaims: RoleJSON[] = (user?.roles as RoleJSON[] | undefined) ?? []

  const handleEditAddress = (address: AddressJSON) => {
    setAddressModal({
      isOpen: true,
      mode: 'edit',
      address,
    })
  }

  const handleAddPhoneClick = () => {
    setPhoneModal({
      isOpen: true,
      mode: 'create',
      phone: null,
    })
  }

  const handleEditPhone = (phone: PhoneJSON) => {
    setPhoneModal({
      isOpen: true,
      mode: 'edit',
      phone,
    })
  }

  const handleDeleteAddress = (address: AddressJSON) => {
    setDeleteConfirmation({
      isOpen: true,
      item: address,
      type: 'address',
    })
  }

  const handleDeletePhone = (phone: PhoneJSON) => {
    setDeleteConfirmation({
      isOpen: true,
      item: phone,
      type: 'phone',
    })
  }

  const handleDeleteFile = (file: FileJSON) => {
    setDeleteConfirmation({
      isOpen: true,
      item: file,
      type: 'file',
    })
  }

  const handleDeleteProfilePicture = (imageId: string) => {
    // Find the file by ID
    const file = user?.files.find((f) => f.id === imageId)
    if (file) {
      setDeleteConfirmation({
        isOpen: true,
        item: file,
        type: 'file',
      })
    }
  }

  const handleUseAsProfile = async (file: FileJSON) => {
    actions.UPDATE_FILE?.start({
      payload: {
        _id: file.id,
        // Send empty update to just refresh timestamp
      },
      onAfterHandle: (data: FileJSON | undefined) => {
        if (!data) {
          return
        }
        const oldUser = store.user
        if (!oldUser) {
          console.warn('No user found in store, cannot update file metadata')
          return
        }

        const updatedFiles = oldUser.files.map((existingFile) =>
          existingFile.id === data.id ? data : existingFile
        )

        const newUser: UserJSON = {
          ...oldUser,
          files: updatedFiles,
        }
        store.user = newUser
      },
      onErrorHandle: (error: unknown) => {
        console.log('error', error)
      },
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.item) return

    actions.DELETE_FILE?.start({
      payload: {
        _id: deleteConfirmation.item.id,
      },
      onAfterHandle: (data: FileJSON | undefined) => {
        if (!data) {
          return
        }
        const oldUser = store.user
        if (!oldUser) {
          console.warn('No user found in store, cannot delete file')
          return
        }
        const newUser: UserJSON = {
          ...oldUser,
          files: oldUser.files.filter((existingFile) => existingFile.id !== data.id),
        }
        store.user = newUser
        setDeleteConfirmation({
          isOpen: false,
          item: null,
          type: 'address',
        })
      },
      onErrorHandle: (error: unknown) => {
        console.log('error', error)
      },
    })
  }

  const handleCancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      item: null,
      type: 'address',
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 text-center">
            <User size={64} className="text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-600 mb-2">No User Data</h1>
            <p className="text-gray-500">Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    )
  }

  const allFiles = user.files || []
  const profilePictures = allFiles.filter((file) => file.type === 'profile_picture')
  const otherFiles = allFiles.filter((file) => file.type !== 'profile_picture')

  // Get the latest profile picture (active one)
  const latestProfilePicture =
    profilePictures.length > 0
      ? profilePictures.sort((a, b) => {
          const aDate = new Date(a.updated_at || a.created_at).getTime()
          const bDate = new Date(b.updated_at || b.created_at).getTime()
          return bDate - aDate
        })[0]
      : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <ProfileHeader
          user={user}
          onEditClick={handleEditClick}
          onDeleteProfilePicture={handleDeleteProfilePicture}
        />

        {/* Account Status */}
        <AccountStatusCards user={user} />

        {/* Connected Accounts / OAuth Section */}
        <ProfileSection icon={Link2} title="Connected Accounts">
          <div className="space-y-4">
            {loadingAccounts ? (
              <div className="text-center py-4 text-slate-500">Loading...</div>
            ) : (
              <>
                {/* Show linked accounts */}
                {linkedAccounts.length > 0 && (
                  <div className="space-y-3">
                    {linkedAccounts.map((account) => (
                      <LinkedAccountCard
                        key={account.id}
                        account={account}
                        onUnlink={() => {
                          // Refresh after unlink
                          window.location.reload()
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Add OAuth provider buttons for unlinked providers */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {linkedAccounts.length > 0 ? 'Link More Accounts' : 'Link Accounts'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {!linkedAccounts.some((acc) => acc.provider === 'github') && (
                      <GitHubButton mode="link" returnUrl="/profile" linkToUserId={user.id} />
                    )}
                    {!linkedAccounts.some((acc) => acc.provider === 'azure') && (
                      <AzureButton mode="link" returnUrl="/profile" linkToUserId={user.id} />
                    )}
                  </div>
                  {linkedAccounts.length === 0 && (
                    <p className="text-sm text-slate-500 mt-2">
                      Link your social accounts to enable quick login.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </ProfileSection>

        {/* Addresses Section */}
        <ProfileSection
          icon={MapPin}
          title="Addresses"
          onAddClick={handleAddAddressClick}
          addButtonText="Add Address"
        >
          {user.address && user.address.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.address.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={handleEditAddress}
                  onDelete={handleDeleteAddress}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={MapPin}
              title="No Addresses"
              description="No addresses have been added to this profile yet."
            />
          )}
        </ProfileSection>

        {/* Phone Numbers Section */}
        <ProfileSection
          icon={Phone}
          title="Phone Numbers"
          onAddClick={handleAddPhoneClick}
          addButtonText="Add Phone"
        >
          {user.phone && user.phone.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user.phone.map((phone) => (
                <PhoneCard
                  key={phone.id}
                  phone={phone}
                  onEdit={handleEditPhone}
                  onDelete={handleDeletePhone}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Phone}
              title="No Phone Numbers"
              description="No phone numbers have been added to this profile yet."
            />
          )}
        </ProfileSection>

        {/* Roles & Permissions Section */}
        <ProfileSection icon={Shield} title="Roles & Permissions">
          {rolesWithClaims.length > 0 ? (
            <div className="space-y-4">
              {rolesWithClaims.map((role) => (
                <div
                  key={role.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{role.name}</h4>
                      {role.description ? (
                        <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                      ) : null}
                    </div>
                    {role.is_system && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        System
                      </span>
                    )}
                  </div>
                  {role.claims && role.claims.length > 0 ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <ul className="space-y-1">
                        {role.claims.map((claim) => (
                          <li key={claim.id} className="text-xs text-slate-600">
                            <span className="font-semibold">{claim.action}</span>
                            {' · '}
                            <span>{claim.method}</span>{' '}
                            <span className="text-slate-500">{claim.path}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Shield}
              title="No Roles"
              description="No roles have been assigned to this account yet."
            />
          )}
        </ProfileSection>

        {/* Profile Pictures Section */}
        <ProfileSection icon={User} title="Profile Pictures">
          {profilePictures && profilePictures.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {profilePictures.map((file) => (
                <ProfilePictureCard
                  key={file.id}
                  file={file}
                  onDelete={handleDeleteFile}
                  onUseAsProfile={handleUseAsProfile}
                  isActive={latestProfilePicture?.id === file.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={User}
              title="No Profile Pictures"
              description="No profile pictures have been uploaded yet."
            />
          )}
        </ProfileSection>

        {/* Files Section */}
        <ProfileSection icon={FileImage} title="Other Files & Documents">
          {otherFiles && otherFiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherFiles.map((file) => (
                <FileCard key={file.id} file={file} onDelete={handleDeleteFile} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileImage}
              title="No Other Files"
              description="No other files have been uploaded to this profile yet."
            />
          )}
        </ProfileSection>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        user={user}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Address Modal (Create/Edit) */}
      <AddAddressModal
        user={user}
        isOpen={addressModal.isOpen}
        onClose={() => setAddressModal({ isOpen: false, mode: 'create', address: null })}
        mode={addressModal.mode}
        existingAddress={addressModal.address || undefined}
      />

      {/* Phone Modal (Create/Edit) */}
      <AddPhoneModal
        user={user}
        isOpen={phoneModal.isOpen}
        onClose={() => setPhoneModal({ isOpen: false, mode: 'create', phone: null })}
        mode={phoneModal.mode}
        existingPhone={phoneModal.phone || undefined}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={
          deleteConfirmation.type === 'address'
            ? 'Delete Address'
            : deleteConfirmation.type === 'phone'
              ? 'Delete Phone'
              : 'Delete File'
        }
        message={`Are you sure you want to delete this ${deleteConfirmation.type}? This action cannot be undone.`}
        itemName={
          deleteConfirmation.type === 'file'
            ? (deleteConfirmation.item as FileJSON)?.original_name ||
              (deleteConfirmation.item as FileJSON)?.name
            : deleteConfirmation.item?.name
        }
        isLoading={
          deleteConfirmation.type === 'address'
            ? actions.DELETE_ADDRESS?.state?.isPending
            : deleteConfirmation.type === 'phone'
              ? actions.DELETE_PHONE?.state?.isPending
              : actions.DELETE_FILE?.state?.isPending
        }
      />
    </div>
  )
}
