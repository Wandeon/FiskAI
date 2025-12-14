// src/app/api/bank/disconnect/route.ts

import { NextResponse } from 'next/server'
import { requireAuth, requireCompany } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { setTenantContext } from '@/lib/prisma-extensions'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const company = await requireCompany(user.id!)
    setTenantContext({ companyId: company.id, userId: user.id! })

    const { bankAccountId } = await request.json()

    if (!bankAccountId) {
      return NextResponse.json(
        { error: 'bankAccountId is required' },
        { status: 400 }
      )
    }

    // Find and verify ownership
    const bankAccount = await db.bankAccount.findFirst({
      where: { id: bankAccountId, companyId: company.id },
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    // Delete connection and reset account
    await db.$transaction([
      db.bankConnection.deleteMany({
        where: { bankAccountId },
      }),
      db.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          syncProvider: null,
          syncProviderAccountId: null,
          connectionStatus: 'MANUAL',
          connectionExpiresAt: null,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[bank/disconnect] error:', error)
    return NextResponse.json(
      { error: 'Disconnect failed' },
      { status: 500 }
    )
  }
}
