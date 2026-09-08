import nucleusConfig from '../../../lib/api/nucleusConfigTables'

type Dict = Record<string, unknown>

/**
 * `search` — the third dialect, and the one that made every search box inert.
 *
 * Nucleus refuses a search that does not say which columns to search:
 *
 *     A 'search' needs 'searchFields' naming the columns to search, e.g.
 *     searchFields=name,email — without it the term would be ignored and
 *     every row returned.
 *
 * That refusal is correct — a search nobody scoped would silently return
 * everything — but not one screen in this app sends `searchFields`. So every
 * search box refused its whole request, the failure was swallowed, and typing
 * into it did nothing at all: measured on /users, where searching "auditor"
 * left all six rows on screen while the API answers 1 for the same term.
 *
 * The columns are not a guess: they come from the same config.json the
 * endpoints are generated from. Every text-ish column of the table being read
 * is searchable, which is what a person typing into a box labelled "ara"
 * means.
 */

const TEXT_TYPES = new Set(['text', 'varchar', 'char', 'citext', 'uuid'])

/** GET_FIVE_S_FINDINGS -> five_s_findings */
export function tableOfEndpoint(endpointKey: string): string | null {
  const m = /^(?:GET|BULK_GET)_(.+)$/.exec(endpointKey)
  const name = m?.[1]
  return name ? name.toLowerCase() : null
}

/*
 * Nucleus's own tables are not declared in this app's config.json, so their
 * columns cannot be read from it. Only the ones a screen actually searches
 * need an entry, and only the columns that live on the table itself: the
 * users search box is labelled "E-posta, ad veya izin ile ara", but name is on
 * the related profiles row and permissions are a join, so email is what the
 * server can match here.
 */
const SYSTEM_TABLE_COLUMNS: Record<string, string[]> = {
  users: ['email'],
  // audit_logs is declared in config.json with a single column; the rest come
  // from nucleus's own system-table definition, so they cannot be read here.
  // These are the ones the log screen's box offers to search: "Varlık adı,
  // özet veya IP adresiyle log ara".
  audit_logs: ['entity_name', 'summary', 'ip_address', 'operation_type'],
}

const cache = new Map<string, string[]>()

export function searchableColumns(table: string): string[] {
  const hit = cache.get(table)
  if (hit) return hit
  const known = SYSTEM_TABLE_COLUMNS[table]
  if (known) {
    cache.set(table, known)
    return known
  }
  const entities = (nucleusConfig as { entities?: Array<Dict> }).entities ?? []
  const entity = entities.find((e) => e.table_name === table)
  const columns = ((entity?.columns as Array<Dict>) ?? [])
    .filter((c) => TEXT_TYPES.has(String(c.type)))
    // An id is not something a person searches for by typing a word, and
    // including every uuid column makes the query pointlessly wide.
    .filter((c) => !/^id$/.test(String(c.name)) && !/_id$/.test(String(c.name)))
    .map((c) => String(c.name))
  cache.set(table, columns)
  return columns
}

/**
 * Attaches the columns a search should cover, when the caller named none.
 * A caller that names its own fields is left alone.
 */
export function normalizeSearch(endpointKey: string, payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
  const source = payload as Dict
  const term = source.search
  if (typeof term !== 'string' || !term.trim()) return payload
  if (source.searchFields) return payload

  const table = tableOfEndpoint(endpointKey)
  if (!table) return payload
  const columns = searchableColumns(table)
  // Nothing searchable: drop the term rather than send a request the server
  // will refuse outright and leave the screen showing a stale list.
  if (columns.length === 0) {
    const { search: _dropped, ...rest } = source
    return rest
  }
  return { ...source, searchFields: columns.join(',') }
}
