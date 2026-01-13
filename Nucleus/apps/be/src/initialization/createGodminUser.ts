import { GenericAction } from '@monorepo/generics'

export async function createGodminUser() {
  try {
    const godmin_email = process.env.GODMIN_EMAIL
    const godmin_password = process.env.GODMIN_PASSWORD

    if (!godmin_email || !godmin_password) {
      console.log('⚠️  Godmin credentials not found in environment variables.')
      return
    }

    const godminUserResult = await GenericAction({
      ip_address: '127.0.0.1',
      user_agent: 'system',
      schema_name: 'main',
      table_name: 'T_Users',
      action_type: 'INSERT',
      data: {
        email: godmin_email,
        password: godmin_password,
        is_god: true,
      },
    })

    const godminUser = godminUserResult?.[0]
    if (!godminUser) {
      console.log('❌ Godmin user creation failed.')
      return
    }

    await GenericAction({
      ip_address: '127.0.0.1',
      user_agent: 'system',
      schema_name: 'main',
      table_name: 'T_Profiles',
      action_type: 'INSERT',
      data: {
        user_id: godminUser.id,
        first_name: process.env.GODMIN_FIRST_NAME || 'God',
        last_name: process.env.GODMIN_LAST_NAME || 'Admin',
      },
    })

    console.log('✅ Godmin user created successfully.')
  } catch (error) {
    const err = error as { cause?: { code?: string }; message?: string }
    const code = err?.cause?.code

    if (code === '23505') {
      console.log('✅ Godmin user already exists.')
      return
    }

    console.error('❌ Godmin user creation failed.', {
      code,
      message: err?.message,
    })
  }
}
