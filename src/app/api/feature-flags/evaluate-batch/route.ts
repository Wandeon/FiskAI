import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser, getCurrentCompany } from "@/lib/auth-utils"
import { parseQuery, isValidationError, formatValidationError } from "@/lib/api/validation"
import { evaluateFlags } from "@/lib/feature-flags"

const querySchema = z.object({
  keys: z
    .string()
    .min(1, "Missing 'keys' parameter")
    .or(z.array(z.string().min(1)).min(1, "At least one key is required")),
})

/**
 * GET /api/feature-flags/evaluate-batch?keys=flag1&keys=flag2&keys=flag3
 *
 * Evaluates multiple feature flags at once for the current user/company context.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Handle multiple keys with the same parameter name
    const keysArray = searchParams.getAll("keys")

    if (keysArray.length === 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: {
            formErrors: [],
            fieldErrors: { keys: ["Missing 'keys' parameter"] },
          },
        },
        { status: 400 }
      )
    }

    // Build context from session
    const user = await getCurrentUser()
    const company = user ? await getCurrentCompany(user.id!) : null

    const results = await evaluateFlags(keysArray, {
      userId: user?.id,
      companyId: company?.id,
    })

    return NextResponse.json(results)
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json(formatValidationError(error), { status: 400 })
    }
    throw error
  }
}
