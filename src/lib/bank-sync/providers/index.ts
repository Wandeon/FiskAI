// src/lib/bank-sync/providers/index.ts

import type { BankSyncProvider } from '../provider'
import { gocardlessProvider } from './gocardless'

const providers: Record<string, BankSyncProvider> = {
  gocardless: gocardlessProvider,
}

export function getProvider(name?: string | null): BankSyncProvider {
  const providerName = name || process.env.BANK_SYNC_PROVIDER || 'gocardless'

  const provider = providers[providerName.toLowerCase()]

  if (!provider) {
    throw new Error(`Unknown bank sync provider: ${providerName}`)
  }

  return provider
}

export function isProviderConfigured(): boolean {
  const providerName = process.env.BANK_SYNC_PROVIDER || 'gocardless'

  if (providerName === 'gocardless') {
    return !!(process.env.GOCARDLESS_SECRET_ID && process.env.GOCARDLESS_SECRET_KEY)
  }

  return false
}
