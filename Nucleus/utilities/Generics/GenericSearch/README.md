# GenericSearch Package - Comprehensive Guide

## 📦 Package Overview

**GenericSearch** is a highly modular, enterprise-grade search and relation-loading system for Drizzle ORM. It provides:

- **Hybrid Query Approach**: Automatic fallback from Drizzle Query API to manual queries
- **Advanced Relation Loading**: Support for one-to-one, one-to-many, many-to-many, and belongs-to relations
- **Nested Relations**: Load relations within relations (child relations)
- **Field Selection**: Control which fields to include/exclude at any level
- **Filtering & Search**: Powerful filtering with multiple operators
- **Pagination**: Built-in offset-based pagination
- **Multi-tenant**: Schema-aware via `getTenantDB(schema_name)`
- **Type-Safe**: Full TypeScript support with type inference

---

## 📁 Package Structure

```
GenericSearch/
├── index.ts                          # Main entry point - HybridGenericSearch()
├── constants.ts                      # DEBUG_MODE flag
├── types.ts                          # All TypeScript type definitions
├── createHybridSearchConfig.ts       # Config builder helper
├── buildWhereConditions.ts           # WHERE clause builder for base query
├── buildDrizzleWhere.ts              # Drizzle Query API where builder
├── buildDrizzleOrderBy.ts            # Drizzle Query API orderBy builder
├── buildDrizzleWith.ts               # Drizzle Query API with builder
├── fieldSelection.ts                 # Field include/exclude logic
│
├── utils/                            # Utility modules
│   ├── idExtraction.ts              # ID extraction and filtering helpers
│   ├── pagination.ts                # Pagination calculations
│   └── debugLogger.ts               # Centralized debug logging
│
└── loaders/                          # Relation loading modules
    ├── queryExecutor.ts             # Query execution (Drizzle API + Manual)
    ├── relationLoader.ts            # Main relation loading orchestrator
    ├── childRelationLoader.ts       # Child relation loading logic
    └── junctionHandler.ts           # Many-to-many junction table handler
```

### Module Responsibilities

#### **Core Modules**

- **`index.ts`**: Main orchestrator - coordinates all modules to execute search
- **`types.ts`**: Central type definitions for the entire package
- **`constants.ts`**: Configuration constants (DEBUG_MODE)

#### **Query Building**

- **`buildWhereConditions.ts`**: Builds WHERE conditions for manual queries
- **`buildDrizzleWhere.ts`**: Builds WHERE function for Drizzle Query API
- **`buildDrizzleOrderBy.ts`**: Builds ORDER BY function for Drizzle Query API
- **`buildDrizzleWith.ts`**: Builds WITH clause for Drizzle Query API

#### **Utilities**

- **`utils/idExtraction.ts`**: 
  - `extractUniqueIds()`: Extract unique IDs from records
  - `filterByForeignKey()`: Filter records by foreign key value
  
- **`utils/pagination.ts`**:
  - `calculatePagination()`: Calculate page, limit, offset
  - `calculateTotalPages()`: Calculate total pages from count

- **`utils/debugLogger.ts`**:
  - `debugLog()`: Conditional logging based on DEBUG_MODE
  - `debugError()`: Conditional error logging

#### **Loaders** (DRY Refactored)

- **`loaders/queryExecutor.ts`**:
  - `executeDrizzleQuery()`: Execute using Drizzle Query API
  - `executeManualQuery()`: Execute using manual query builder
  
- **`loaders/relationLoader.ts`**:
  - `loadManualRelations()`: Main entry point for relation loading
  - `loadManyToManyRelationForRecords()`: Load M2M relations
  - `loadOneToManyRelation()`: Load 1-to-N relations
  - `loadBelongsToRelation()`: Load belongs-to relations

- **`loaders/childRelationLoader.ts`**:
  - `loadChildRelations()`: Load nested child relations
  - `loadChildManyToMany()`: Load M2M child relations
  - `loadChildOneToMany()`: Load 1-to-N child relations
  - `loadChildBelongsTo()`: Load belongs-to child relations

- **`loaders/junctionHandler.ts`**:
  - `loadManyToManyRelation()`: Load M2M via junction table
  - `attachJunctionFields()`: Attach junction fields to result
  - `mapJunctionToTargets()`: Map junction records to targets

---

## 🔄 Search Flow

### 1. **Initialization**
```typescript
HybridGenericSearch({ schema_name, config, params })
```

### 2. **Database Connection**
- Acquire tenant DB via `getTenantDB(schema_name)`
- Set `search_path` to tenant schema

### 3. **Pagination Calculation**
```typescript
const { page, limit, offset } = calculatePagination({
  page: params.page,
  limit: params.limit,
  maxLimit: config.maxLimit
})
```

### 4. **Query Execution** (Hybrid Approach)

**A. Try Drizzle Query API First:**
```typescript
if (config.useDrizzleQuery && db.query exists) {
  executeDrizzleQuery() // Uses db.query[tableName].findMany()
}
```

**B. Fallback to Manual Query:**
```typescript
else {
  executeManualQuery() // Uses db.select().from(entity)
}
```

### 5. **Relation Loading**

**Filter relations based on `includeRelations` param:**
- `true | undefined`: Load all
- `false`: Load none
- `string[]`: Load only specified

**Load manual relations:**
```typescript
loadManualRelations({
  db,
  mainRecords,
  relations: manualRelations,
  tableName: config.table_name
})
```

### 6. **Field Selection**
```typescript
const finalData = applyFieldSelection(mainRecords, config.fieldSelection)
```

### 7. **Return Result**
```typescript
return {
  data: finalData,
  pagination: { page, limit, total, totalPages, hasNext, hasPrev }
}
```

---

## ⚙️ Configuration

### Creating a Config

```typescript
import { createHybridSearchConfig } from './createHybridSearchConfig'

const config = createHybridSearchConfig(
  "T_Users",           // table name
  {                    // fields config
    email: { 
      column: "email", 
      type: "string", 
      searchable: true, 
      sortable: true 
    },
    is_active: { 
      column: "is_active", 
      type: "boolean", 
      filterable: true 
    }
  },
  [                    // relations config
    {
      name: "profile",
      type: "one-to-one",
      targetTable: "T_Profiles",
      foreignKey: "user_id"
    }
  ],
  true                 // useDrizzleQuery
)
```

### Field Config Options

```typescript
{
  column: string              // Database column name
  type: FieldType            // "string" | "number" | "boolean" | "date" | "enum"
  searchable?: boolean       // Include in search queries
  filterable?: boolean       // Allow filtering on this field
  sortable?: boolean         // Allow sorting on this field
  operators?: FilterOperator[] // Allowed filter operators
  transform?: (value) => value // Transform value before querying
  fromRelation?: string      // Field comes from a relation (for documentation)
}
```

### Relation Config Options

```typescript
{
  name: string                    // Relation name in result
  
  // Drizzle Native Relations (preferred)
  useDrizzleRelation?: boolean    // Use Drizzle's native relations
  with?: WithSelector             // Nested with clauses
  
  // Manual Relations (fallback)
  type?: "one-to-one" | "one-to-many" | "many-to-many" | "belongs-to"
  targetTable?: EntityName        // Target table name
  foreignKey?: string            // Foreign key column
  localKey?: string              // Local key column (for belongs-to)
  
  // Many-to-Many specific
  through?: {
    table: EntityName            // Junction table name
    localKey: string            // FK to parent
    targetKey: string           // FK to target
  }
  includeJunctionFields?: string[] // Fields to include from junction
  junctionFieldsKey?: string     // Key name for junction fields (default: "relation")
  
  // Advanced options
  where?: (table) => SQL         // Additional WHERE condition
  orderBy?: { field: string, direction: "asc" | "desc" }[]
  limit?: number                 // Limit number of related records
  
  // Nested relations
  childRelations?: ChildRelationConfig[]
  
  // Field selection
  fieldSelection?: {
    select?: string[]            // Only these fields
    exclude?: string[]           // Exclude these fields
  }
}
```

> **Important:** When `useDrizzleRelation: true` is set, the underlying schema **must** export a matching `relations(...)` definition so Drizzle can infer `references` metadata. Without it, `db.query[table].findMany({ with })` will throw while normalizing the relation and GenericSearch will fall back to manual loading.

---

## 🔗 Relation Types

### 1. One-to-One

**Example:** User → Profile

```typescript
{
  name: "profile",
  type: "one-to-one",
  targetTable: "T_Profiles",
  foreignKey: "user_id",  // Column in T_Profiles pointing to user
  fieldSelection: {
    exclude: ["internal_notes"]
  }
}
```

**SQL Logic:**
```sql
SELECT * FROM T_Profiles WHERE user_id IN (...)
```

### 2. One-to-Many

**Example:** User → Posts

```typescript
{
  name: "posts",
  type: "one-to-many",
  targetTable: "T_Posts",
  foreignKey: "author_id",  // Column in T_Posts pointing to user
  orderBy: [{ field: "created_at", direction: "desc" }],
  limit: 10
}
```

**SQL Logic:**
```sql
SELECT * FROM T_Posts 
WHERE author_id IN (...) 
ORDER BY created_at DESC 
LIMIT 10
```

### 3. Many-to-Many

**Example:** User → Companies (via T_CompanyUsers)

```typescript
{
  name: "companies",
  type: "many-to-many",
  targetTable: "T_Companies",
  through: {
    table: "T_CompanyUsers",
    localKey: "user_id",
    targetKey: "company_id"
  },
  includeJunctionFields: ["role", "joined_at"],
  where: (table) => eq(table.is_active, true),
  orderBy: [{ field: "name", direction: "asc" }]
}
```

**SQL Logic:**
```sql
-- 1. Load junction records
SELECT * FROM T_CompanyUsers WHERE user_id IN (...)

-- 2. Load target records
SELECT * FROM T_Companies 
WHERE id IN (...) 
  AND is_active = true 
ORDER BY name ASC
```

**Result Structure:**
```typescript
{
  id: 1,
  name: "Company A",
  relation: {  // Junction fields
    role: "admin",
    joined_at: "2024-01-01"
  }
}
```

### 4. Belongs-To

**Example:** Post → Author (User)

```typescript
{
  name: "author",
  type: "belongs-to",
  targetTable: "T_Users",
  localKey: "author_id",  // Column in current table
  fieldSelection: {
    exclude: ["password", "email_verified_token"]
  }
}
```

**SQL Logic:**
```sql
SELECT * FROM T_Users WHERE id IN (...)
```

---

## 🌲 Nested Relations (Child Relations)

Child relations allow loading relations **within relations**.

**Example:** User → Profile → Addresses

```typescript
{
  name: "profile",
  type: "one-to-one",
  targetTable: "T_Profiles",
  foreignKey: "user_id",
  childRelations: [
    {
      name: "addresses",
      type: "many-to-many",
      targetTable: "T_Addresses",
      through: {
        table: "T_ProfileAddresses",
        localKey: "profile_id",
        targetKey: "address_id"
      },
      includeJunctionFields: ["type", "is_primary"],
      orderBy: [{ field: "is_primary", direction: "desc" }]
    },
    {
      name: "phones",
      type: "many-to-many",
      targetTable: "T_Phones",
      through: {
        table: "T_ProfilePhones",
        localKey: "profile_id",
        targetKey: "phone_id"
      }
    }
  ]
}
```

**Result Structure:**
```typescript
{
  id: 1,
  email: "user@example.com",
  profile: {
    id: 10,
    first_name: "John",
    addresses: [
      {
        id: 100,
        street: "123 Main St",
        relation: { type: "home", is_primary: true }
      }
    ],
    phones: [
      {
        id: 200,
        number: "+1234567890"
      }
    ]
  }
}
```

---

## 🎯 Advanced Features

### Field Selection

Control which fields to include/exclude at any level:

```typescript
{
  name: "users",
  type: "one-to-many",
  targetTable: "T_Users",
  fieldSelection: {
    select: ["id", "email", "first_name", "last_name"]  // Only these
  }
}

// OR

{
  fieldSelection: {
    exclude: ["password", "secret_key"]  // Everything except these
  }
}
```

**Applied at:**
- Main records: `config.fieldSelection`
- Relations: `relation.fieldSelection`
- Child relations: `childRelation.fieldSelection`

### Conditional Loading (where)

Add extra conditions to relation loading:

```typescript
{
  name: "active_posts",
  type: "one-to-many",
  targetTable: "T_Posts",
  where: (table) => and(
    eq(table.is_published, true),
    gt(table.published_at, new Date('2024-01-01'))
  )
}
```

### Sorting Relations (orderBy)

Sort related records:

```typescript
{
  name: "comments",
  type: "one-to-many",
  targetTable: "T_Comments",
  orderBy: [
    { field: "created_at", direction: "desc" },
    { field: "id", direction: "asc" }
  ]
}
```

### Limiting Relations (limit)

Limit number of related records:

```typescript
{
  name: "recent_posts",
  type: "one-to-many",
  targetTable: "T_Posts",
  orderBy: [{ field: "created_at", direction: "desc" }],
  limit: 5  // Only load 5 most recent posts
}
```

---

## 🐛 Debugging

### Enable Debug Mode

```typescript
// In constants.ts
export const DEBUG_MODE = true
```

### Debug Logs

When enabled, you'll see:

```
🔍 HybridGenericSearch params received: {...}
🔍 Drizzle Query API check: { useDrizzleQuery: true, ... }
🚀 Attempting Drizzle query with withClause: {...}
✅ Drizzle query SUCCESS, rows: 25
[GenericSearch] includeConfig: true
[GenericSearch] All relations: [...]
[GenericSearch] Filtered relations: [...]
[GenericSearch] Manual relations to load: [...]
[GenericSearch] Main records count: 25
[RelationLoader] Loading relation: profile
[RelationLoader] One-to-many/one-to-one relation: {...}
[RelationLoader] Related records loaded: 25
[ChildRelationLoader] Processing child relation: {...}
```

### Error Handling

```typescript
try {
  const result = await HybridGenericSearch({ ... })
} catch (error) {
  // Drizzle query errors
  // Database connection errors
  // Type resolution errors
}
```

---

## 📝 Complete Examples

### Example 1: Simple List with Pagination

```typescript
const config = createHybridSearchConfig(
  "T_Products",
  {
    name: { column: "name", type: "string", searchable: true, sortable: true },
    price: { column: "price", type: "number", filterable: true, sortable: true },
    is_active: { column: "is_active", type: "boolean", filterable: true }
  },
  [],
  true
)

const result = await HybridGenericSearch({
  schema_name: "tenant_xyz",
  config,
  params: {
    page: 1,
    limit: 20,
    search: "laptop",
    orderBy: "price",
    orderDirection: "asc",
    filters: {
      is_active: true,
      price: { operator: "gte", value: 100 }
    }
  }
})
```

### Example 2: Complex Relations

```typescript
const config = createHybridSearchConfig(
  "T_Users",
  {
    email: { column: "email", type: "string", searchable: true },
    is_active: { column: "is_active", type: "boolean", filterable: true }
  },
  [
    {
      name: "profile",
      type: "one-to-one",
      targetTable: "T_Profiles",
      foreignKey: "user_id",
      fieldSelection: { exclude: ["internal_notes"] },
      childRelations: [
        {
          name: "addresses",
          type: "many-to-many",
          targetTable: "T_Addresses",
          through: {
            table: "T_ProfileAddresses",
            localKey: "profile_id",
            targetKey: "address_id"
          },
          includeJunctionFields: ["type", "is_primary"],
          orderBy: [{ field: "is_primary", direction: "desc" }]
        }
      ]
    },
    {
      name: "posts",
      type: "one-to-many",
      targetTable: "T_Posts",
      foreignKey: "author_id",
      where: (table) => eq(table.is_published, true),
      orderBy: [{ field: "created_at", direction: "desc" }],
      limit: 10
    }
  ],
  true
)

const result = await HybridGenericSearch({
  schema_name: "tenant_xyz",
  config,
  params: {
    page: 1,
    limit: 10,
    includeRelations: ["profile", "posts"]
  }
})
```

### Example 3: Selective Relation Loading

```typescript
// Load only specific relations
const result = await HybridGenericSearch({
  schema_name: "tenant_xyz",
  config,
  params: {
    includeRelations: ["profile"]  // Only load profile, skip posts
  }
})

// Load no relations
const result = await HybridGenericSearch({
  schema_name: "tenant_xyz",
  config,
  params: {
    includeRelations: false
  }
})
```

---

## 🎯 Best Practices

### 1. **Use Drizzle Native Relations When Possible**

```typescript
{
  name: "profile",
  useDrizzleRelation: true,  // Preferred
  with: { ... },
  // Also provide manual fallback
  type: "one-to-one",
  targetTable: "T_Profiles"
}
```

### 2. **Apply Field Selection Liberally**

Don't return sensitive data:

```typescript
{
  fieldSelection: {
    exclude: ["password", "secret_key", "internal_notes"]
  }
}
```

### 3. **Use Pagination Limits**

```typescript
{
  maxLimit: 100  // Prevent excessive data loading
}
```

### 4. **Optimize Relations with where, orderBy, limit**

```typescript
{
  name: "recent_comments",
  type: "one-to-many",
  targetTable: "T_Comments",
  where: (table) => eq(table.is_approved, true),
  orderBy: [{ field: "created_at", direction: "desc" }],
  limit: 5
}
```

### 5. **Structure Child Relations Carefully**

Avoid deep nesting (>3 levels) for performance.

### 6. **Type Your Results**

```typescript
type UserWithProfile = {
  id: string
  email: string
  profile?: {
    first_name: string
    last_name: string
  }
}

const result = await HybridGenericSearch<UserWithProfile>({ ... })
```

---

## 🚀 Performance Tips

1. **Index Foreign Keys**: Ensure all `foreignKey` columns have indexes
2. **Limit Relation Depth**: Avoid >3 levels of nested relations
3. **Use Field Selection**: Don't load unnecessary fields
4. **Apply where Conditions**: Filter at database level, not in code
5. **Use Pagination**: Always paginate large result sets
6. **Enable Query Caching**: Consider query result caching for frequently accessed data

---

## 📚 Type Reference

See `types.ts` for complete type definitions:

- `HybridSearchConfig`
- `SearchParams`
- `SearchResult`
- `HybridRelationConfig`
- `ChildRelationConfig`
- `FieldConfig`
- `FieldSelection`
- `FilterOperator`

---

## 🔧 Troubleshooting

### Issue: Relations not loading

**Check:**
- Relation names match between config and database
- Foreign keys are correct
- `includeRelations` parameter is not `false`

### Issue: Type errors

**Solution:**
- Ensure `config.table_name` matches `EntityName` type
- Use `as any` type assertion if necessary for dynamic table names

### Issue: Slow queries

**Check:**
- Database indexes on foreign keys
- Number of relations being loaded
- Use `limit` on relations
- Enable DEBUG_MODE to see query execution

---

## 📄 License

This package is part of the SiteWatcher monorepo.
