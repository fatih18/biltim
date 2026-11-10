import { describe, expect, it } from 'bun:test'
import { FM1, FM2, LEADER, MEMBER, user } from './mailKit'
import { mailableAddress, personName, resolveAudience } from './recipients'

const EVERYONE = [
  user(LEADER, 'lider@firma.example', 'Mehmet', 'Demir'),
  user(MEMBER, 'uye@firma.example', 'Ayşe', 'Kaya'),
  user(FM1, 'saha1@firma.example', 'Can', 'Yıldız'),
  user(FM2, 'saha2@firma.example', 'Elif', 'Çelik'),
]

describe('who a plan mail goes to', () => {
  it('is the team leader, the team members and the field managers, in that order', () => {
    const audience = resolveAudience({ leaderId: LEADER, memberIds: [MEMBER], fieldManagerIds: [FM1, FM2], users: EVERYONE })
    expect(audience.recipients).toEqual([
      'lider@firma.example',
      'uye@firma.example',
      'saha1@firma.example',
      'saha2@firma.example',
    ])
    expect(audience.skipped).toEqual({ missing: 0, inactive: 0, noAddress: 0 })
  })

  it('lists the active team people for the mail, the leader marked and first', () => {
    const audience = resolveAudience({ leaderId: LEADER, memberIds: [MEMBER], fieldManagerIds: [FM1], users: EVERYONE })
    expect(audience.team).toEqual([
      { name: 'Mehmet Demir', leader: true },
      { name: 'Ayşe Kaya', leader: false },
    ])
  })

  it('counts a person once when they are leader, member and field manager at the same time', () => {
    const audience = resolveAudience({
      leaderId: LEADER,
      memberIds: [LEADER, MEMBER, MEMBER],
      fieldManagerIds: [MEMBER, LEADER, FM1, FM1],
      users: EVERYONE,
    })
    expect(audience.recipients).toEqual(['lider@firma.example', 'uye@firma.example', 'saha1@firma.example'])
    expect(audience.team.map((p) => p.name)).toEqual(['Mehmet Demir', 'Ayşe Kaya'])
  })

  it('counts an address once even when two accounts spell it differently', () => {
    const users = [user(LEADER, 'Ortak@Firma.example'), user(FM1, ' ortak@firma.example ')]
    const audience = resolveAudience({ leaderId: LEADER, memberIds: [], fieldManagerIds: [FM1], users })
    expect(audience.recipients).toEqual(['ortak@firma.example'])
  })

  it('reads an id in any spelling of the uuid as the same person', () => {
    const audience = resolveAudience({
      leaderId: LEADER.toUpperCase(),
      memberIds: [`{${MEMBER}}`],
      fieldManagerIds: [FM1.toUpperCase()],
      users: EVERYONE,
    })
    expect(audience.recipients).toHaveLength(3)
  })

  it('leaves out, and counts, accounts that are switched off, have no address or no longer exist', () => {
    const users = [
      user(LEADER, 'lider@firma.example', 'Mehmet', 'Demir'),
      user(MEMBER, 'uye@firma.example', 'Ayşe', 'Kaya', false),
      user(FM1, null, 'Can', 'Yıldız'),
      user(FM2, '   ', 'Elif', 'Çelik'),
    ]
    const audience = resolveAudience({
      leaderId: LEADER,
      memberIds: [MEMBER, 'aaaaaaaa-0000-4000-8000-000000000000'],
      fieldManagerIds: [FM1, FM2],
      users,
    })
    expect(audience.recipients).toEqual(['lider@firma.example'])
    expect(audience.skipped).toEqual({ missing: 1, inactive: 1, noAddress: 2 })
    // A switched-off person is not shown as part of the team either.
    expect(audience.team).toEqual([{ name: 'Mehmet Demir', leader: true }])
  })

  it('keeps a team member without an address in the team line though no mail can reach them', () => {
    const users = [user(LEADER, 'lider@firma.example', 'Mehmet', 'Demir'), user(MEMBER, null, 'Ayşe', 'Kaya')]
    const audience = resolveAudience({ leaderId: LEADER, memberIds: [MEMBER], fieldManagerIds: [], users })
    expect(audience.team.map((p) => p.name)).toEqual(['Mehmet Demir', 'Ayşe Kaya'])
    expect(audience.recipients).toEqual(['lider@firma.example'])
  })

  it('is empty, without failing, for a plan nobody can be mailed about', () => {
    const audience = resolveAudience({ leaderId: '', memberIds: [], fieldManagerIds: [], users: [] })
    expect(audience).toEqual({ recipients: [], team: [], skipped: { missing: 0, inactive: 0, noAddress: 0 } })
  })
})

describe('mailableAddress', () => {
  it('takes an ordinary address, lower-cased and trimmed', () => {
    expect(mailableAddress('  Ayse.Kaya@Firma.COM.tr ')).toBe('ayse.kaya@firma.com.tr')
  })

  it('refuses what a mail cannot be sent to', () => {
    for (const bad of ['', 'ayse', 'ayse@firma', '@firma.com', 'a b@firma.com', 'a@firma.com, b@firma.com', 'a@firma.com;b@firma.com', 'a@firma.com\r\nBcc: x@y.com', '<a@firma.com>', `${'x'.repeat(250)}@firma.com`]) {
      expect(mailableAddress(bad)).toBe('')
    }
  })
})

describe('personName', () => {
  it('is the first and last name, else the part of the address before the @, else a plain word', () => {
    expect(personName(user(LEADER, 'a@b.co', 'Mehmet', 'Demir'))).toBe('Mehmet Demir')
    expect(personName(user(LEADER, 'mehmet.demir@firma.example', '', ''))).toBe('mehmet.demir')
    expect(personName({ id: LEADER })).toBe('Kullanıcı')
  })
})
