export type FieldType = 'string' | 'number' | 'boolean' | 'date'
export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many' | 'belongs-to'
export type DrizzleType =
  | 'varchar'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'boolean'
  | 'timestamp'
  | 'uuid'
  | 'decimal'
  | 'json'
  | 'serial'
  | 'enum'
export type IndexType = 'index' | 'unique' | 'primary'

export const GENERIC_METHOD_OPTIONS = [
  'GET',
  'CREATE',
  'UPDATE',
  'DELETE',
  'TOGGLE',
  'VERIFICATION',
] as const

export type GenericMethod = (typeof GENERIC_METHOD_OPTIONS)[number]

export interface Field {
  name: string
  column: string
  drizzleType: DrizzleType
  searchType: FieldType
  searchable: boolean
  filterable: boolean
  sortable: boolean
  nullable: boolean
  defaultValue?: string
  length?: number
  precision?: number
  scale?: number
  isPrimaryKey?: boolean
  isUnique?: boolean
  enumValues?: string[]
  comment?: string
}

export interface Relation {
  name: string
  type: RelationType
  targetTable: string
  foreignKey?: string
  localKey?: string
  targetKey?: string
  useDrizzleRelation: boolean
  throughTable?: string
}

export interface IndexDefinition {
  name: string
  type: IndexType
  columns: string[]
  comment?: string
}

export interface TableSchema {
  tableName: string
  displayName: string
  excludedMethods: GenericMethod[]
  isFormData: boolean
  fields: Field[]
  relations: Relation[]
  indexes: IndexDefinition[]
  defaultOrderBy: string
  defaultOrderDirection: 'asc' | 'desc'
  maxLimit: number
}
