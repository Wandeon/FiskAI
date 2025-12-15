// src/lib/email-sync/types.ts

export interface TokenResult {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scopes: string[]
}

export interface EmailMessage {
  id: string
  receivedAt: Date
  senderEmail: string
  subject: string
  attachments: EmailAttachmentInfo[]
}

export interface EmailAttachmentInfo {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
}

export interface MessageBatch {
  messages: EmailMessage[]
  nextCursor?: string
}
