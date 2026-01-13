import { createHybridSearchConfig, HybridGenericSearch } from '@monorepo/generics'
import { withChecks } from '@/controllers/utils'
import type { ElysiaRequestWOBody } from '@/server'
import { generateResponse } from '@/utils'
import { getCompanyInfoFromHeaders, getProfileFromHeaders } from '../helpers'

type GetMeErrors = {
  message?: string
}

export async function GetMeV2(req: ElysiaRequestWOBody) {
  return await withChecks({
    operationName: 'AuthV2 GetMe',
    req,
    endpoint: async function endpoint(req: ElysiaRequestWOBody) {
      const companyInfo = getCompanyInfoFromHeaders(req)
      const profile = getProfileFromHeaders(req)

      if (!profile?.sub) {
        return generateResponse<unknown, GetMeErrors>({
          isSuccess: false,
          message: 'User not found',
          errors: { message: 'Invalid or missing authentication' },
          status: 401,
          request: req,
        })
      }

      const userId = String(profile.sub)

      const config = createHybridSearchConfig(
        'T_Users',
        {
          id: {
            column: 'id',
            type: 'string',
            searchable: false,
            filterable: true,
            sortable: true,
          },
          email: {
            column: 'email',
            type: 'string',
            searchable: true,
            sortable: true,
          },
          is_active: {
            column: 'is_active',
            type: 'boolean',
            filterable: true,
          },
          first_name: {
            column: 'first_name',
            type: 'string',
            searchable: true,
            fromRelation: 'profile',
          },
          last_name: {
            column: 'last_name',
            type: 'string',
            searchable: true,
            fromRelation: 'profile',
          },
        },
        [
          {
            name: 'profile',
            type: 'one-to-one',
            targetTable: 'T_Profiles',
            foreignKey: 'user_id',
            fieldSelection: {
              exclude: ['created_at', 'updated_at', 'is_active'],
            },
          },
          {
            name: 'address',
            type: 'one-to-many',
            targetTable: 'T_Addresses',
            foreignKey: 'owner_id',
          },
          {
            name: 'phone',
            type: 'one-to-many',
            targetTable: 'T_Phones',
            foreignKey: 'owner_id',
          },
          {
            name: 'files',
            type: 'one-to-many',
            targetTable: 'T_Files',
            foreignKey: 'uploaded_by',
          },
          {
            name: 'roles',
            type: 'many-to-many',
            targetTable: 'T_Roles',
            through: {
              table: 'T_UserRoles',
              localKey: 'user_id',
              targetKey: 'role_id',
            },
            includeJunctionFields: ['id'],
          },
        ],
        true
      )

      const result = await HybridGenericSearch({
        schema_name: companyInfo?.schema_name || 'main',
        config,
        params: {
          page: 1,
          limit: 1,
          search: '',
          orderBy: '',
          orderDirection: 'asc',
          filters: {
            id: userId,
          },
          includeRelations: true,
        },
      })

      const { password: _password, ...userData } = result?.data?.[0] || {}

      if (!userData) {
        return generateResponse<unknown, GetMeErrors>({
          isSuccess: false,
          message: 'User not found',
          errors: { message: 'User data not available' },
          status: 404,
          request: req,
        })
      }

      return generateResponse({
        isSuccess: true,
        message: 'User found',
        data: userData,
        status: 200,
        request: req,
      })
    },
  })
}
