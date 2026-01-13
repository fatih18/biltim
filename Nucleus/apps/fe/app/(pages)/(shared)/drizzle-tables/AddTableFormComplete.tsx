'use client'

import { Database, FileCode, Link2, List, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { BasicInfoTab } from './FormComponents/BasicInfoTab'
import { CodeTab } from './FormComponents/CodeTab'
import { FieldsTab } from './FormComponents/FieldsTab'
import { IndexesTab } from './FormComponents/IndexesTab'
import { RelationsTab } from './FormComponents/RelationsTab'
import type { TableSchema } from './types'

type TabId = 'basic' | 'fields' | 'relations' | 'indexes' | 'code'

export function AddTableForm({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (schema: TableSchema) => void
}) {
  const [activeTab, setActiveTab] = useState<TabId>('basic')
  const [schema, setSchema] = useState<TableSchema>({
    tableName: 'new_table',
    displayName: 'T_NewTable',
    excludedMethods: [],
    isFormData: false,
    fields: [],
    relations: [],
    indexes: [],
    defaultOrderBy: 'created_at',
    defaultOrderDirection: 'desc',
    maxLimit: 100,
  })

  const handleSubmit = () => {
    if (!schema.tableName || schema.fields.length === 0) {
      alert('Table name and at least one field are required!')
      return
    }
    onAdd(schema)
  }

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info', icon: Settings },
    { id: 'fields' as const, label: 'Fields', icon: Database, count: schema.fields.length },
    { id: 'relations' as const, label: 'Relations', icon: Link2, count: schema.relations.length },
    { id: 'indexes' as const, label: 'Indexes', icon: List, count: schema.indexes.length },
    { id: 'code' as const, label: 'Preview', icon: FileCode },
  ]

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header - Minimal, professional */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">New Schema</h2>
              <p className="text-slate-300 text-sm">Create Drizzle ORM schema</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs - Clean, minimal */}
        <div className="border-b border-slate-200 bg-slate-50 px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && <BasicInfoTab schema={schema} setSchema={setSchema} />}
          {activeTab === 'fields' && <FieldsTab schema={schema} setSchema={setSchema} />}
          {activeTab === 'relations' && <RelationsTab schema={schema} setSchema={setSchema} />}
          {activeTab === 'indexes' && <IndexesTab schema={schema} setSchema={setSchema} />}
          {activeTab === 'code' && <CodeTab schema={schema} />}
        </div>

        {/* Footer - Simple, clean */}
        <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-between rounded-b-xl">
          <div className="text-sm text-slate-600">
            {schema.fields.length} fields · {schema.relations.length} relations ·{' '}
            {schema.indexes.length} indexes
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium transition-all text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm"
            >
              Create Schema
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
