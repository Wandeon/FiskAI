import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser, getCurrentCompany } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { evaluateFlag } from "@/lib/feature-flags"

const querySchema = z.object({
  key: z.string().min(1, "Missing 'key' parameter"),
})

/**
 * GET /api/feature-flags/evaluate?key=<flag_key>
 *
 * Evaluates a single feature flag for the current user/company context.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { key } = parseQuery(searchParams, querySchema)

    // Build context from session
    const user = await getCurrentUser()
    const company = user ? await getCurrentCompany(user.id!) : null

    const result = await evaluateFlag(key, {
      userId: user?.id,
      companyId: company?.id,
    })

    return NextResponse.json({
      enabled: result.enabled,
      source: result.source,
    })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    throw error
  }
}
