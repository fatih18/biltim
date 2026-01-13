'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { IndexDefinition, IndexType, TableSchema } from '../types'

export function IndexesTab({
  schema,
  setSchema,
}: {
  schema: TableSchema
  setSchema: (schema: TableSchema) => void
}) {
  const addIndex = () => {
    const newIndex: IndexDefinition = {
      name: `idx_${schema.tableName}_${schema.indexes.length + 1}`,
      type: 'index',
      columns: [],
    }
    setSchema({ ...schema, indexes: [...schema.indexes, newIndex] })
  }

  const updateIndex = (index: number, updates: Partial<IndexDefinition>) => {
    const newIndexes = schema.indexes.map((idx, i) => {
      if (i !== index) return idx
      const merged: IndexDefinition = { ...idx, ...updates }
      return merged
    })
    setSchema({ ...schema, indexes: newIndexes })
  }

  const removeIndex = (index: number) => {
    setSchema({ ...schema, indexes: schema.indexes.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Indexes</h3>
          <p className="text-sm text-slate-500">Define database indexes for performance</p>
        </div>
        <button
          type="button"
          onClick={addIndex}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Index
        </button>
      </div>

      <div className="space-y-3">
        {schema.indexes.map((idx, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
          >
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={idx.name}
                onChange={(e) => updateIndex(index, { name: e.target.value })}
                placeholder="Index name"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <select
                value={idx.type}
                onChange={(e) => updateIndex(index, { type: e.target.value as IndexType })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="index">Index</option>
                <option value="unique">Unique</option>
                <option value="primary">Primary Key</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={idx.columns.join(', ')}
                  onChange={(e) =>
                    updateIndex(index, {
                      columns: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Columns (comma separated)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={() => removeIndex(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {schema.indexes.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No indexes yet. Click "Add Index" to create one.
          </div>
        )}
      </div>
    </div>
  )
}
