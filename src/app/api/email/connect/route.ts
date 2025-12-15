// src/app/api/email/connect/route.ts

import { NextResponse } from 'next/server'
import { requireAuth, requireCompany } from '@/lib/auth-utils'
import { setTenantContext } from '@/lib/prisma-extensions'
import { getEmailProvider, isEmailProviderConfigured } from '@/lib/email-sync/providers'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)
    setTenantContext({ companyId: company.id, userId: user.id! })

    const { provider: providerName } = await request.json()

    if (!providerName || !['GMAIL', 'MICROSOFT'].includes(providerName)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be GMAIL or MICROSOFT' },
        { status: 400 }
      )
    }

    if (!isEmailProviderConfigured(providerName)) {
      return NextResponse.json(
        { error: `${providerName} provider not configured` },
        { status: 503 }
      )
    }

    const provider = getEmailProvider(providerName)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.fiskai.hr'
    const redirectUri = `${baseUrl}/api/email/callback`

    // State contains provider and company info for callback
    const state = Buffer.from(
      JSON.stringify({ provider: providerName, companyId: company.id })
    ).toString('base64url')

    const authUrl = provider.getAuthUrl(redirectUri, state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('[email/connect] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    )
  }
}
