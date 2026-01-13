'use client'

import type { GenericMethod, TableSchema } from '../types'
import { GENERIC_METHOD_OPTIONS } from '../types'

export function BasicInfoTab({
  schema,
  setSchema,
}: {
  schema: TableSchema
  setSchema: (schema: TableSchema) => void
}) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label htmlFor="tableName" className="block text-sm font-medium text-slate-700 mb-2">
            Table Name (snake_case)
          </label>
          <input
            id="tableName"
            type="text"
            value={schema.tableName}
            onChange={(e) => setSchema({ ...schema, tableName: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="users, products, claims"
          />
        </div>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-2">
            Display Name (T_Prefix)
          </label>
          <input
            id="displayName"
            type="text"
            value={schema.displayName}
            onChange={(e) => setSchema({ ...schema, displayName: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="T_Users, T_Products"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <label htmlFor="defaultOrderBy" className="block text-sm font-medium text-slate-700 mb-2">
            Default Order By
          </label>
          <input
            id="defaultOrderBy"
            type="text"
            value={schema.defaultOrderBy}
            onChange={(e) => setSchema({ ...schema, defaultOrderBy: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="created_at"
          />
        </div>
        <div>
          <label htmlFor="orderDirection" className="block text-sm font-medium text-slate-700 mb-2">
            Order Direction
          </label>
          <select
            id="orderDirection"
            value={schema.defaultOrderDirection}
            onChange={(e) =>
              setSchema({ ...schema, defaultOrderDirection: e.target.value as 'asc' | 'desc' })
            }
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <div>
          <label htmlFor="maxLimit" className="block text-sm font-medium text-slate-700 mb-2">
            Max Limit
          </label>
          <input
            id="maxLimit"
            type="number"
            value={schema.maxLimit}
            onChange={(e) =>
              setSchema({ ...schema, maxLimit: parseInt(e.target.value, 10) || 100 })
            }
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
        <label htmlFor="isFormData" className="flex items-center gap-2 cursor-pointer">
          <input
            id="isFormData"
            type="checkbox"
            checked={schema.isFormData}
            onChange={(e) => setSchema({ ...schema, isFormData: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Is Form Data</span>
        </label>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700 mb-2">
          Excluded Generic Methods
        </span>
        <div className="grid grid-cols-3 gap-2">
          {GENERIC_METHOD_OPTIONS.map((method) => {
            const checked = schema.excludedMethods.includes(method)
            return (
              <label
                key={method}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:border-blue-400 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...schema.excludedMethods, method]
                      : schema.excludedMethods.filter((m) => m !== method)
                    setSchema({ ...schema, excludedMethods: updated as GenericMethod[] })
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="uppercase tracking-wide text-slate-600 text-xs font-semibold">
                  {method}
                </span>
              </label>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Selected methods will be excluded from auto-generated endpoints.
        </p>
      </div>
    </div>
  )
}
