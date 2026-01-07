// src/app/api/billing/checkout/route.ts
// Stripe checkout session creation

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireCompanyWithPermission } from "@/lib/auth-utils"
import { createCheckoutSession, PlanId, PLANS } from "@/lib/billing/stripe"
import { logger } from "@/lib/logger"
import { parseBody, isValidationError, formatValidationError } from "@/lib/api/validation"

const checkoutSchema = z.object({
  planId: z.string().refine((val) => val in PLANS, { message: "Invalid plan" }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return await requireCompanyWithPermission(
      session.user.id,
      "billing:manage",
      async (company) => {
        const { planId } = await parseBody(request, checkoutSchema)

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const successUrl = `${baseUrl}/settings/billing?success=true`
        const cancelUrl = `${baseUrl}/settings/billing?canceled=true`

        const checkoutUrl = await createCheckoutSession(
          company.id,
          planId as PlanId,
          successUrl,
          cancelUrl
        )

        logger.info({ companyId: company.id, planId }, "Checkout session created")

        return NextResponse.json({ url: checkoutUrl })
      }
    )
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    logger.error({ error }, "Failed to create checkout session")
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
