// src/app/api/billing/checkout/route.ts
// Stripe checkout session creation

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireCompany } from '@/lib/auth-utils'
import { createCheckoutSession, PlanId, PLANS } from '@/lib/billing/stripe'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const company = await requireCompany(session.user.id)

    const body = await request.json()
    const { planId } = body as { planId?: string }

    if (!planId || !(planId in PLANS)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/settings/billing?success=true`
    const cancelUrl = `${baseUrl}/settings/billing?canceled=true`

    const checkoutUrl = await createCheckoutSession(
      company.id,
      planId as PlanId,
      successUrl,
      cancelUrl
    )

    logger.info({ companyId: company.id, planId }, 'Checkout session created')

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    logger.error({ error }, 'Failed to create checkout session')
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
