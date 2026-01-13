'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { TableSchema } from '../types'

export function CodeTab({ schema }: { schema: TableSchema }) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    await navigator.clipboard.writeText(generateCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateCode = () => {
    const displayName =
      schema.displayName ||
      `T_${schema.tableName.charAt(0).toUpperCase()}${schema.tableName.slice(1)}`

    return `import type { HybridSearchConfig } from "@monorepo/generics";
import type { InferSelectModel } from "drizzle-orm";
import {
  index,
  unique,
  type PgColumn,
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean as pgBoolean,
  timestamp,
  decimal,
  json,
  serial,
} from "drizzle-orm/pg-core";
import type {
  DefaultFilter,
  DefaultOmitted,
  DefaultOrderBy,
  GenericMethods,
  InferSerializedSelectModel,
  OrderDirection,
  Pagination,
} from "../types/shared";
import { base } from "./base";

export const tablename = "${schema.tableName}";
export const excluded_methods: GenericMethods[] = [${schema.excludedMethods.map((m) => `"${m}"`).join(', ')}];
export const is_formdata = ${schema.isFormData};

export const columns = {
  ...base,
${schema.fields
  .map((f) => {
    let def = `  ${f.name}: `
    switch (f.drizzleType) {
      case 'varchar':
        def += `varchar("${f.column}", { length: ${f.length || 255} })`
        break
      case 'text':
        def += `text("${f.column}")`
        break
      case 'integer':
        def += `integer("${f.column}")`
        break
      case 'bigint':
        def += `bigint("${f.column}", { mode: "number" })`
        break
      case 'boolean':
        def += `pgBoolean("${f.column}")`
        break
      case 'timestamp':
        def += `timestamp("${f.column}")`
        break
      case 'uuid':
        def += `uuid("${f.column}")`
        break
      case 'decimal':
        def += `decimal("${f.column}", { precision: 10, scale: 2 })`
        break
      case 'json':
        def += `json("${f.column}")`
        break
      case 'serial':
        def += `serial("${f.column}")`
        break
    }
    if (!f.nullable) def += '.notNull()'
    return `${def},`
  })
  .join('\n')}
};

export const indexes = (table: {
${schema.fields.map((f) => `  ${f.name}: PgColumn;`).join('\n')}
}) => [
${schema.indexes
  .map((idx) => {
    if (idx.type === 'unique')
      return `  unique().on(${idx.columns.map((c) => `table.${c}`).join(', ')}),`
    return `  index().on(${idx.columns.map((c) => `table.${c}`).join(', ')}),`
  })
  .join('\n')}
];

export const T_${displayName.replace('T_', '')} = pgTable(tablename, columns, indexes);

export type ${displayName.replace('T_', '')} = InferSelectModel<typeof T_${displayName.replace('T_', '')}>;
export type ${displayName.replace('T_', '')}JSON = InferSerializedSelectModel<typeof T_${displayName.replace('T_', '')}>;
export type Create = Omit<${displayName.replace('T_', '')}, DefaultOmitted>;
export type Read = {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: DefaultOrderBy${schema.fields
    .filter((f) => f.sortable)
    .map((f) => ` | "${f.name}"`)
    .join('')};
  orderDirection?: OrderDirection;
  filters?: DefaultFilter & {
${schema.fields
  .filter((f) => f.filterable)
  .map((f) => `    ${f.name}?: ${f.searchType === 'number' ? 'number' : 'string'};`)
  .join('\n')}
  };
};
export type Update = Partial<Create> & { _id?: string };
export type Delete = { _id: string };
export type ListReturn = {
  data: ${displayName.replace('T_', '')}JSON[];
  pagination: Pagination;
};

export const store: ${displayName.replace('T_', '')}JSON | undefined = undefined;

export const SearchConfig: HybridSearchConfig = {
  table_name: "${displayName}",
  fields: {
    id: {
      column: "id",
      type: "string",
      searchable: false,
      filterable: true,
      sortable: false,
      operators: ["eq", "in"],
    },
    is_active: {
      column: "is_active",
      type: "boolean",
      searchable: false,
      filterable: true,
      sortable: false,
      operators: ["eq"],
    },
    created_at: {
      column: "created_at",
      type: "date",
      searchable: false,
      filterable: true,
      sortable: true,
      operators: ["gte", "lte", "gt", "lt"],
    },
    updated_at: {
      column: "updated_at",
      type: "date",
      searchable: false,
      filterable: true,
      sortable: true,
      operators: ["gte", "lte", "gt", "lt"],
    },
${schema.fields
  .map((f) => {
    const operators =
      f.searchType === 'string'
        ? '["eq", "in", "ilike"]'
        : f.searchType === 'number'
          ? '["eq", "in", "gt", "gte", "lt", "lte"]'
          : f.searchType === 'boolean'
            ? '["eq"]'
            : '["gte", "lte", "gt", "lt"]'
    return `    ${f.name}: {
      column: "${f.column}",
      type: "${f.searchType}",
      searchable: ${f.searchable},
      filterable: ${f.filterable},
      sortable: ${f.sortable},
      operators: ${operators},
    },`
  })
  .join('\n')}
  },
  relations: [
${schema.relations
  .map((r) => {
    let rel = `    {
      name: "${r.name}",
      useDrizzleRelation: ${r.useDrizzleRelation},
      type: "${r.type}",
      targetTable: "${r.targetTable}",`
    if (r.foreignKey) rel += `\n      foreignKey: "${r.foreignKey}",`
    if (r.localKey) rel += `\n      localKey: "${r.localKey}",`
    if (r.targetKey) rel += `\n      targetKey: "${r.targetKey}",`
    if (r.throughTable && r.type === 'many-to-many') {
      rel += `\n      through: {\n        table: "${r.throughTable}",\n        localKey: "${r.localKey || 'id'}",\n        targetKey: "${r.targetKey || 'id'}",\n      },`
    }
    return `${rel}\n    },`
  })
  .join('\n')}
  ],
  fieldSelection: {},
  defaultOrderBy: "${schema.defaultOrderBy}",
  defaultOrderDirection: "${schema.defaultOrderDirection}",
  maxLimit: ${schema.maxLimit},
  useDrizzleQuery: true,
};
`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Generated Code</h3>
          <p className="text-sm text-slate-500">Preview and copy your schema file</p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      <pre className="bg-slate-900 text-green-400 p-6 rounded-xl text-sm overflow-auto max-h-[600px] font-mono leading-relaxed">
        {generateCode()}
      </pre>
    </div>
  )
}
