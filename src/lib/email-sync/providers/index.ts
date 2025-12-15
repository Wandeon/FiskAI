// src/lib/email-sync/providers/index.ts

import type { EmailSyncProvider } from "../provider"
import { gmailProvider } from "./gmail"
import { microsoftProvider } from "./microsoft"

const providers: Record<string, EmailSyncProvider> = {
  gmail: gmailProvider,
  microsoft: microsoftProvider,
}

export function getEmailProvider(name: string): EmailSyncProvider {
  const provider = providers[name.toLowerCase()]

  if (!provider) {
    throw new Error(`Unknown email provider: ${name}`)
  }

  return provider
}

export function isEmailProviderConfigured(name: string): boolean {
  if (name === "gmail" || name === "GMAIL") {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  }

  if (name === "microsoft" || name === "MICROSOFT") {
    return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
  }

  return false
}
