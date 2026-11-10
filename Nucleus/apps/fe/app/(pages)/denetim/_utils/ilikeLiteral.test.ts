import { describe, expect, it } from 'bun:test'
import { ilikeLiteral } from './ilikeLiteral'
import { bodyOf } from './pageSource'

/** ILIKE as PostgreSQL reads it: % any text, _ any one character, a backslash makes the next character literal, case ignored. */
function ilikeMatches(pattern: string, text: string): boolean {
  let source = ''
  const chars = [...pattern]
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i] ?? ''
    if (char === '\\') source += (chars[++i] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    else if (char === '%') source += '.*'
    else if (char === '_') source += '.'
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${source}$`, 'isu').test(text)
}

const NAMES = ['Hat_1', 'Yüzde%', 'Çelik Haddehane', 'A\\B', '100%_hat', '_', '%']
const NEIGHBOURS = ['HatX1', 'Hat-1', 'Yüzde 5', 'Yüzde', 'Çelik Haddehane 2', 'AxB', 'a\\b!', 'x', '100 hat', '']

describe('ilikeLiteral', () => {
  it('puts a backslash before %, _ and \\, and leaves every other character alone', () => {
    expect(ilikeLiteral('Hat_1')).toBe('Hat\\_1')
    expect(ilikeLiteral('Yüzde%')).toBe('Yüzde\\%')
    expect(ilikeLiteral('A\\B')).toBe('A\\\\B')
    expect(ilikeLiteral('Çelik Haddehane')).toBe('Çelik Haddehane')
  })

  it('goes out unchanged for a name that holds none of them', () => {
    for (const name of ['', 'Soğuk Haddehane', 'Bölge 3', 'İzmir']) expect(ilikeLiteral(name)).toBe(name)
  })

  it('makes the pattern match that name, in any case, and nothing else', () => {
    for (const name of NAMES) {
      expect(ilikeMatches(ilikeLiteral(name), name)).toBe(true)
      expect(ilikeMatches(ilikeLiteral(name), name.toUpperCase())).toBe(true)
      for (const other of NEIGHBOURS) {
        if (other.toLowerCase() !== name.toLowerCase()) expect(ilikeMatches(ilikeLiteral(name), other)).toBe(false)
      }
    }
  })

  it('shows what the plain name did: it matched other places too', () => {
    expect(ilikeMatches('Hat_1', 'HatX1')).toBe(true)
    expect(ilikeMatches('Yüzde%', 'Yüzde 5')).toBe(true)
  })
})

describe('the audit form sends the escaped name', () => {
  it('reads the open findings of a place with the name run through ilikeLiteral', () => {
    const body = bodyOf('readOpenFindings')
    expect(body).toContain("operator: 'ilike', value: ilikeLiteral(loc)")
    expect(body).not.toContain("operator: 'ilike', value: loc")
  })
})
