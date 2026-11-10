import { describe, expect, it } from 'bun:test'
import { FM1, FM2, LEADER, MEMBER, TEAM_USERS, user } from '../mail/mailKit'
import { noticeRecipientIds } from './audience'

describe('who is told in the bell', () => {
  it('is the team leader, the members, then the field managers, in that order', () => {
    expect(noticeRecipientIds({ leaderId: LEADER, memberIds: [MEMBER], fieldManagerIds: [FM1, FM2], users: TEAM_USERS })).toEqual([LEADER, MEMBER, FM1, FM2])
  })

  it('is the field managers alone when the plan event has no team part', () => {
    expect(noticeRecipientIds({ leaderId: '', memberIds: [], fieldManagerIds: [FM1, FM2], users: TEAM_USERS })).toEqual([FM1, FM2])
  })

  it('counts each person once, in any spelling of the id, whatever roles they hold', () => {
    const ids = noticeRecipientIds({
      leaderId: LEADER,
      memberIds: [LEADER.toUpperCase(), MEMBER, `{${MEMBER}}`],
      fieldManagerIds: [LEADER, FM1, FM1],
      users: TEAM_USERS,
    })
    expect(ids).toEqual([LEADER, MEMBER, FM1])
  })

  it('leaves out switched-off accounts and accounts that do not exist', () => {
    const users = [user(LEADER, 'a@x.co', 'A', 'B', false), user(MEMBER, 'b@x.co'), user(FM1, 'c@x.co', 'C', 'D', false)]
    expect(noticeRecipientIds({ leaderId: LEADER, memberIds: [MEMBER], fieldManagerIds: [FM1, FM2], users })).toEqual([MEMBER])
  })

  it('keeps a person without a mail address: the bell does not need one', () => {
    expect(noticeRecipientIds({ leaderId: LEADER, memberIds: [], fieldManagerIds: [], users: [user(LEADER, null)] })).toEqual([LEADER])
  })

  it('is empty, not padded, when nobody qualifies', () => {
    expect(noticeRecipientIds({ leaderId: '', memberIds: [], fieldManagerIds: [], users: [] })).toEqual([])
    expect(noticeRecipientIds({ leaderId: LEADER, memberIds: [], fieldManagerIds: [], users: [] })).toEqual([])
  })

  it('never lets an id that is not a real account reach the uuid cast of the insert', () => {
    expect(noticeRecipientIds({ leaderId: 'not-a-uuid', memberIds: [], fieldManagerIds: [], users: TEAM_USERS })).toEqual([])
  })
})
