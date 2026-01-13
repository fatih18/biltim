'use client'

import { SchemaVisualizer } from './SchemaVisualizer'

export default function DrizzleTablesPage() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 88px)', overflow: 'hidden' }}>
      <SchemaVisualizer />
    </div>
  )
}
