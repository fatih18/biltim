export type Participant = {
  name: string | null
  address: string | null
}

export type OutlookAttachment = {
  id: string
  name: string
  contentType: string | null
  size: number | null
  isInline: boolean
}

export type SendMailRecipient = {
  address: string
  name?: string | null
}

export type SendMailAttachment = {
  name: string
  contentType?: string | null
  contentBase64: string
}

export type OutlookMessage = {
  id: string
  conversationId: string
  subject: string
  from: string | null
  fromAddress: string | null
  toRecipients: Participant[]
  ccRecipients: Participant[]
  receivedDateTime: string
  isRead: boolean
  bodyPreview: string
  body: string
  hasAttachments: boolean
  attachments: OutlookAttachment[]
  webLink: string
}

export type ConversationThread = {
  threadKey: string // conversationId or unique key
  threadName: string // Display name (person name or "Group: A, B, C")
  isGroup: boolean // True if multiple participants
  participants: Participant[] // All unique participants
  messages: OutlookMessage[]
  latestDate: string
  unreadCount: number
}
