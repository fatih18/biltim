/*
 * A place's name as an `ilike` pattern that means exactly that name.
 *
 * The form reads the open findings of the audited place with `ilike` (the
 * match ignores case). ILIKE takes `%` for any text and `_` for any one
 * character, so a place called "Hat_1" or "Yüzde%" also matched "HatX1" or
 * "Yüzde 5", and the server's findings limit did not take it for a plain place
 * lookup (be-nucleus guards/findingScopeFilters.ts `isPlainIlike`): an auditor
 * who is also a field manager saw no open findings of a foreign place and
 * raised the same finding twice. A backslash makes the next character literal,
 * so `Hat\_1` is "Hat_1" and nothing else. A name without these characters
 * goes out as it is.
 */
export function ilikeLiteral(name: string): string {
  return name.replace(/[\\%_]/g, '\\$&')
}
