// src/app/api/admin/regulatory-truth/revalidation/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { logAuditEvent } from "@/lib/regulatory-truth/utils/audit-log"
import {
  getRulesNeedingRevalidation,
  applyConfidenceDecay,
} from "@/lib/regulatory-truth/utils/confidence-decay"

/**
 * GET /api/admin/regulatory-truth/revalidation
 *
 * Get rules that need revalidation (low confidence).
 *
 * SECURITY: Requires ADMIN authentication (fixed in PR #87)
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication required - this was previously unauthenticated (security fix)
    const user = await getCurrentUser()
    if (!user || user.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const maxConfidence = parseFloat(req.nextUrl.searchParams.get("maxConfidence") || "0.75")
    const rules = await getRulesNeedingRevalidation(maxConfidence)

    return NextResponse.json({
      count: rules.length,
      rules,
    })
  } catch (error) {
    console.error("[revalidation] Error:", error)
    return NextResponse.json({ error: "Failed to get rules needing revalidation" }, { status: 500 })
  }
}

/**
 * POST /api/admin/regulatory-truth/revalidation
 *
 * Apply confidence decay to rules.
 *
 * SECURITY: Requires ADMIN authentication (fixed in PR #87)
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication required - this was previously unauthenticated (security fix)
    const user = await getCurrentUser()
    if (!user || user.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await applyConfidenceDecay()

    // Log audit event for confidence decay operation
    await logAuditEvent({
      action: "CONFIDENCE_DECAY_APPLIED",
      entityType: "SYSTEM",
      entityId: "batch",
      performedBy: user.id,
      metadata: {
        checked: result.checked,
        decayed: result.decayed,
      },
    })

    return NextResponse.json({
      success: true,
      checked: result.checked,
      decayed: result.decayed,
      details: result.details,
    })
  } catch (error) {
    console.error("[revalidation] Error:", error)
    return NextResponse.json({ error: "Failed to apply confidence decay" }, { status: 500 })
  }
}
