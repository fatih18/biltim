import { createHash, randomBytes } from 'node:crypto'
import { T_RemoteComputers } from '@monorepo/db-entities/schemas/default/remote_computer'
import { getTenantDB } from '@monorepo/drizzle-manager'
import { eq } from 'drizzle-orm'
import type { CompanyInfo } from '@/middlewares'
import type { ElysiaRequest } from '@/server'
import { generateResponse } from '@/utils'

/**
 * Creates a new remote computer entry with a unique API key.
 * Returns the plaintext API key to the user (only shown once).
 */
export async function CreateRemoteComputer(req: ElysiaRequest) {
  try {
    const body = (req.body ?? {}) as { name?: string }
    const name = body.name?.trim()

    if (!name) {
      return generateResponse({
        isSuccess: false,
        message: 'Computer name is required',
        errors: 'Missing name',
        status: 400,
        request: req,
      })
    }

    // Get user info from profile header (set by IdentityMiddleware)
    const headers = req.request.headers
    const profile = JSON.parse(headers.get('profile') || '{}') as { sub?: string }
    const userId = profile.sub

    if (!userId) {
      return generateResponse({
        isSuccess: false,
        message: 'Authentication required',
        errors: 'No user context',
        status: 401,
        request: req,
      })
    }

    // Generate unique computer identifier
    const computerIdentifier = `comp_${randomBytes(16).toString('hex')}`

    // Generate API key (32 bytes = 256 bits)
    const apiKeyPlaintext = `vak_${randomBytes(32).toString('hex')}`

    // Hash the API key for storage
    const apiKeyHash = createHash('sha256').update(apiKeyPlaintext).digest('hex')

    // Resolve tenant schema from headers (same pattern as other Remote controllers)
    const companyInfo = JSON.parse(headers.get('company_info') || '{}') as CompanyInfo
    const schemaName = companyInfo.schema_name || 'main'
    const tenantDB = await getTenantDB(schemaName)

    // Check if user already has a computer with this name
    const existing = await tenantDB
      .select({ id: T_RemoteComputers.id, name: T_RemoteComputers.name })
      .from(T_RemoteComputers)
      .where(eq(T_RemoteComputers.owner_user_id, userId))
      .limit(100)

    const duplicateName = existing.find((c) => c.name.toLowerCase() === name.toLowerCase())
    if (duplicateName) {
      return generateResponse({
        isSuccess: false,
        message: 'You already have a computer with this name',
        errors: 'Duplicate name',
        status: 400,
        request: req,
      })
    }

    // Create the computer record
    const [newComputer] = await tenantDB
      .insert(T_RemoteComputers)
      .values({
        owner_user_id: userId,
        name,
        computer_identifier: computerIdentifier,
        api_key_hash: apiKeyHash,
        is_online: false,
        is_active: true,
      })
      .returning({
        id: T_RemoteComputers.id,
        name: T_RemoteComputers.name,
        computer_identifier: T_RemoteComputers.computer_identifier,
      })

    if (!newComputer) {
      return generateResponse({
        isSuccess: false,
        message: 'Failed to create computer record',
        errors: 'Insert returned no data',
        status: 500,
        request: req,
      })
    }

    return generateResponse({
      isSuccess: true,
      message: 'Computer created successfully',
      data: {
        id: newComputer.id,
        name: newComputer.name,
        computer_identifier: newComputer.computer_identifier,
        // Return plaintext API key ONLY on creation (not stored anywhere)
        api_key: apiKeyPlaintext,
      },
      status: 201,
      request: req,
    })
  } catch (error) {
    console.error('CreateRemoteComputer error:', error)
    return generateResponse({
      isSuccess: false,
      message: 'Failed to create computer',
      errors: String(error),
      status: 500,
      request: req,
    })
  }
}
