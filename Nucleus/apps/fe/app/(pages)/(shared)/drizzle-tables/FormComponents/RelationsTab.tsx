'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { Relation, RelationType, TableSchema } from '../types'

export function RelationsTab({
  schema,
  setSchema,
}: {
  schema: TableSchema
  setSchema: (schema: TableSchema) => void
}) {
  const addRelation = () => {
    const newRelation: Relation = {
      name: `relation_${schema.relations.length + 1}`,
      type: 'one-to-many',
      targetTable: 'T_',
      useDrizzleRelation: false,
    }
    setSchema({ ...schema, relations: [...schema.relations, newRelation] })
  }

  const updateRelation = (index: number, updates: Partial<Relation>) => {
    const newRelations = schema.relations.map((relation, i) => {
      if (i !== index) return relation
      const merged: Relation = { ...relation, ...updates }
      return merged
    })
    setSchema({ ...schema, relations: newRelations })
  }

  const removeRelation = (index: number) => {
    setSchema({ ...schema, relations: schema.relations.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Relations</h3>
          <p className="text-sm text-slate-500">Define relationships between tables</p>
        </div>
        <button
          type="button"
          onClick={addRelation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Relation
        </button>
      </div>

      <div className="space-y-3">
        {schema.relations.map((relation, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
          >
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={relation.name}
                onChange={(e) => updateRelation(index, { name: e.target.value })}
                placeholder="Relation name"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <select
                value={relation.type}
                onChange={(e) => updateRelation(index, { type: e.target.value as RelationType })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="one-to-one">One-to-One</option>
                <option value="one-to-many">One-to-Many</option>
                <option value="many-to-many">Many-to-Many</option>
                <option value="belongs-to">Belongs To</option>
              </select>
              <input
                type="text"
                value={relation.targetTable}
                onChange={(e) => updateRelation(index, { targetTable: e.target.value })}
                placeholder="Target table (T_Users)"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={relation.foreignKey || ''}
                onChange={(e) => updateRelation(index, { foreignKey: e.target.value || undefined })}
                placeholder="Foreign key"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="text"
                value={relation.localKey || ''}
                onChange={(e) => updateRelation(index, { localKey: e.target.value || undefined })}
                placeholder="Local key"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="text"
                value={relation.targetKey || ''}
                onChange={(e) => updateRelation(index, { targetKey: e.target.value || undefined })}
                placeholder="Target key"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {relation.type === 'many-to-many' && (
              <input
                type="text"
                value={relation.throughTable || ''}
                onChange={(e) =>
                  updateRelation(index, { throughTable: e.target.value || undefined })
                }
                placeholder="Through table (T_UserClaims)"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={relation.useDrizzleRelation}
                  onChange={(e) => updateRelation(index, { useDrizzleRelation: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700">Use Drizzle Relation</span>
              </label>
              <button
                type="button"
                onClick={() => removeRelation(index)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {schema.relations.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No relations yet. Click "Add Relation" to create one.
          </div>
        )}
      </div>
    </div>
  )
}
