// src/app/api/billing/portal/route.ts
// Stripe customer portal session creation

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireCompanyWithPermission } from "@/lib/auth-utils"
import { createPortalSession } from "@/lib/billing/stripe"
import { logger } from "@/lib/logger"
import { isValidationError, formatValidationError } from "@/lib/api/validation"

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
        if (!company.stripeCustomerId) {
          return NextResponse.json(
            { error: "No billing account found. Please subscribe to a plan first." },
            { status: 400 }
          )
        }

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const returnUrl = `${baseUrl}/settings/billing`

        const portalUrl = await createPortalSession(company.id, returnUrl)

        logger.info({ companyId: company.id }, "Portal session created")

        return NextResponse.json({ url: portalUrl })
      }
    )
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    logger.error({ error }, "Failed to create portal session")
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}
