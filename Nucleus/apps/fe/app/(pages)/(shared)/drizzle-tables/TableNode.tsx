'use client'

import type { HybridSearchConfig } from '@monorepo/generics'
import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Database, Key, Link } from 'lucide-react'

type TableNodeData = {
  tableName: string
  displayName: string
  fields: HybridSearchConfig['fields']
  relations: HybridSearchConfig['relations']
  excludedMethods: string[]
  isFormData: boolean
}

type FieldConfig = {
  column: string
  type: string
  searchable?: boolean
  filterable?: boolean
  sortable?: boolean
  operators?: string[]
}

export function TableNode({ data }: NodeProps) {
  const typedData = data as TableNodeData
  const fieldEntries = Object.entries(typedData.fields || {})
  const relations = typedData.relations || []

  // Dinamik height hesapla
  const headerHeight = 70 // px
  const fieldHeight = 45 // px per field
  const relationHeight = relations.length > 0 ? 80 + relations.length * 45 : 0
  const metadataHeight = 50 // px
  const padding = 20 // px

  const calculatedHeight =
    headerHeight + fieldEntries.length * fieldHeight + relationHeight + metadataHeight + padding

  return (
    <div
      className="bg-white border-2 border-gray-300 rounded-lg shadow-lg w-[350px] flex flex-col relative"
      style={{ height: `${calculatedHeight}px` }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <div>
            <h3 className="font-bold text-lg">{typedData.displayName}</h3>
            <p className="text-xs text-blue-100">{typedData.tableName}</p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="p-3">
        <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          <Key className="w-3 h-3" />
          Fields ({fieldEntries.length})
        </div>

        <div className="space-y-1">
          {fieldEntries.map(([fieldName, fieldConfig]: [string, FieldConfig]) => (
            <div
              key={fieldName}
              className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded hover:!bg-gray-100 transition-colors relative group"
            >
              {/* Left handles - source ve target */}
              <Handle
                type="source"
                position={Position.Left}
                id={`${typedData.tableName}-${fieldConfig.column}-left`}
                className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white !opacity-0 group-hover:!opacity-100 transition-opacity"
                style={{ left: -7 }}
              />
              <Handle
                type="target"
                position={Position.Left}
                id={`${typedData.tableName}-${fieldConfig.column}-left`}
                className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white !opacity-0 group-hover:!opacity-100 transition-opacity"
                style={{ left: -7 }}
              />

              <span className="font-mono font-medium text-gray-700">{fieldConfig.column}</span>

              <div className="flex items-center gap-1">
                {fieldConfig.searchable && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                    S
                  </span>
                )}
                {fieldConfig.filterable && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                    F
                  </span>
                )}
                {fieldConfig.sortable && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                    O
                  </span>
                )}
                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px]">
                  {fieldConfig.type}
                </span>
              </div>

              {/* Right handles - source ve target */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${typedData.tableName}-${fieldConfig.column}-right`}
                className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white !opacity-0 group-hover:!opacity-100 transition-opacity"
                style={{ right: -7 }}
              />
              <Handle
                type="target"
                position={Position.Right}
                id={`${typedData.tableName}-${fieldConfig.column}-right`}
                className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white !opacity-0 group-hover:!opacity-100 transition-opacity"
                style={{ right: -7 }}
              />
            </div>
          ))}
        </div>

        {/* Relations */}
        {relations.length > 0 && (
          <div className="mt-4 flex-shrink-0">
            <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Link className="w-3 h-3" />
              Relations ({relations.length})
            </div>
            <div className="space-y-1">
              {relations.map((relation, idx) => (
                <div
                  key={idx}
                  className="text-xs p-2 bg-indigo-50 rounded border border-indigo-100"
                >
                  <div className="font-medium text-indigo-900">{relation.name}</div>
                  <div className="text-indigo-600 text-[10px]">
                    {relation.type ?? 'unknown'} → {relation.targetTable}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-3 pt-3 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2 flex-wrap">
            {typedData.isFormData && (
              <span className="text-[10px] px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                FormData
              </span>
            )}
            {typedData.excludedMethods.length > 0 && (
              <span className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded">
                {typedData.excludedMethods.length} excluded
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
