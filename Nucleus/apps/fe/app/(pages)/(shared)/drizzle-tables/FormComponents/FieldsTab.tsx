'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { DrizzleType, Field, FieldType, TableSchema } from '../types'

export function FieldsTab({
  schema,
  setSchema,
}: {
  schema: TableSchema
  setSchema: (schema: TableSchema) => void
}) {
  const addField = () => {
    const newField: Field = {
      name: `field_${schema.fields.length + 1}`,
      column: `field_${schema.fields.length + 1}`,
      drizzleType: 'varchar',
      searchType: 'string',
      searchable: false,
      filterable: true,
      sortable: false,
      nullable: false,
      length: 255,
      enumValues: [],
    }
    setSchema({ ...schema, fields: [...schema.fields, newField] })
  }

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = schema.fields.map((field, i) => {
      if (i !== index) return field
      const merged: Field = { ...field, ...updates }
      return merged
    })
    setSchema({ ...schema, fields: newFields })
  }

  const removeField = (index: number) => {
    setSchema({ ...schema, fields: schema.fields.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Fields</h3>
          <p className="text-sm text-slate-500">Define table columns and their properties</p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      <div className="space-y-3">
        {schema.fields.map((field, index) => (
          <div
            key={index}
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
          >
            <div className="grid grid-cols-4 gap-3">
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
                placeholder="Field name"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="text"
                value={field.column}
                onChange={(e) => updateField(index, { column: e.target.value })}
                placeholder="Column name"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <select
                value={field.drizzleType}
                onChange={(e) => {
                  const value = e.target.value as DrizzleType
                  const updates: Partial<Field> = { drizzleType: value }

                  if (value === 'varchar' && field.length == null) {
                    updates.length = 255
                  }

                  if (value === 'decimal') {
                    updates.precision = field.precision ?? 10
                    updates.scale = field.scale ?? 2
                  } else {
                    updates.precision = undefined
                    updates.scale = undefined
                  }

                  if (value === 'enum') {
                    updates.enumValues =
                      field.enumValues && field.enumValues.length > 0
                        ? field.enumValues
                        : ['value1', 'value2']
                  } else {
                    updates.enumValues = []
                  }

                  updateField(index, updates)
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="varchar">varchar</option>
                <option value="text">text</option>
                <option value="integer">integer</option>
                <option value="bigint">bigint</option>
                <option value="boolean">boolean</option>
                <option value="timestamp">timestamp</option>
                <option value="uuid">uuid</option>
                <option value="decimal">decimal</option>
                <option value="json">json</option>
                <option value="serial">serial</option>
                <option value="enum">enum</option>
              </select>
              <select
                value={field.searchType}
                onChange={(e) => updateField(index, { searchType: e.target.value as FieldType })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="date">date</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.searchable}
                  onChange={(e) => updateField(index, { searchable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">Searchable</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.filterable}
                  onChange={(e) => updateField(index, { filterable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">Filterable</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.sortable}
                  onChange={(e) => updateField(index, { sortable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">Sortable</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.nullable}
                  onChange={(e) => updateField(index, { nullable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">Nullable</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.isUnique ?? false}
                  onChange={(e) => updateField(index, { isUnique: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">Unique</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.isPrimaryKey ?? false}
                  onChange={(e) => updateField(index, { isPrimaryKey: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">Primary Key</span>
              </label>

              {field.drizzleType === 'varchar' && (
                <input
                  type="number"
                  value={field.length ?? 255}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10)
                    updateField(index, { length: Number.isNaN(value) ? 255 : value })
                  }}
                  placeholder="Length"
                  className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                />
              )}

              <button
                type="button"
                onClick={() => removeField(index)}
                className="ml-auto p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <input
                type="text"
                value={field.defaultValue || ''}
                onChange={(e) => updateField(index, { defaultValue: e.target.value })}
                placeholder="Default value"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="text"
                value={field.comment || ''}
                onChange={(e) => updateField(index, { comment: e.target.value })}
                placeholder="Comment"
                className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              {field.drizzleType === 'decimal' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={field.precision ?? 10}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10)
                      updateField(index, { precision: Number.isNaN(value) ? 10 : value })
                    }}
                    placeholder="Precision"
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <input
                    type="number"
                    value={field.scale ?? 2}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10)
                      updateField(index, { scale: Number.isNaN(value) ? 2 : value })
                    }}
                    placeholder="Scale"
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              )}
              {field.drizzleType === 'enum' && (
                <input
                  type="text"
                  value={(field.enumValues || []).join(', ')}
                  onChange={(e) =>
                    updateField(index, {
                      enumValues: e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Enum values (comma separated)"
                  className="px-3 py-2 border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              )}
            </div>
          </div>
        ))}

        {schema.fields.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No fields yet. Click "Add Field" to create one.
          </div>
        )}
      </div>
    </div>
  )
}
