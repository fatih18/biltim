import './compression-polyfill'
import { defineConfig } from 'drizzle-kit'

export const connectionString = process.env.DATABASE_URL

export default defineConfig({
  out: './drizzle',
  schema: '../../utilities/DbEntities/schemas/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  schemaFilter: ['main']
})
