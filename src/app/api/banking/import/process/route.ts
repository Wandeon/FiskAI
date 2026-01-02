import { NextResponse } from "next/server"
import { processNextImportJob } from "@/lib/banking/import/processor"
import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { setTenantContext } from "@/lib/prisma-extensions"
import { bankingLogger } from "@/lib/logger"

/**
 * POST /api/banking/import/process
 *
 * Triggers processing of the next pending import job for the authenticated user's company.
 * This endpoint requires authentication - no test mode bypass is allowed.
 */
export async function POST() {
  // Require authentication - no test mode bypass
  let company, userId

  try {
    const user = await requireAuth()
    userId = user.id!
    const userCompany = await requireCompany(userId)
    if (!userCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }
    company = userCompany
  } catch (authError) {
    bankingLogger.warn({ error: authError }, "Bank import process authentication failed")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  setTenantContext({
    companyId: company.id,
    userId: userId,
  })

  const result = await processNextImportJob()
  return NextResponse.json(result)
}
