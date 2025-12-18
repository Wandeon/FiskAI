// src/app/api/guidance/checklist/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, getCurrentCompany } from "@/lib/auth-utils"
import {
  getChecklist,
  completeChecklistItem,
  dismissChecklistItem,
  snoozeChecklistItem,
} from "@/lib/guidance"

export const dynamic = "force-dynamic"

/**
 * GET /api/guidance/checklist
 *
 * Get the user's checklist items aggregated from all sources.
 *
 * Query parameters:
 * - limit: number of items (default: 20, max: 100)
 * - includeCompleted: 'true' to include completed items
 * - includeDismissed: 'true' to include dismissed items
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany(user.id!)
    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const includeCompleted = searchParams.get("includeCompleted") === "true"
    const includeDismissed = searchParams.get("includeDismissed") === "true"

    // Map legalForm to businessType
    const businessTypeMap: Record<string, string> = {
      OBRT_PAUSAL: "pausalni",
      OBRT_REAL: "obrt",
      OBRT_VAT: "obrt",
      JDOO: "doo",
      DOO: "doo",
    }
    const businessType = businessTypeMap[company.legalForm || ""] || "all"

    const { items, stats } = await getChecklist({
      userId: user.id!,
      companyId: company.id,
      businessType,
      includeCompleted,
      includeDismissed,
      limit,
    })

    return NextResponse.json({
      items,
      stats,
      meta: {
        limit,
        returned: items.length,
      },
    })
  } catch (error) {
    console.error("Error fetching checklist:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/guidance/checklist
 *
 * Mark a checklist item as completed, dismissed, or snoozed.
 *
 * Body:
 * - action: 'complete' | 'dismiss' | 'snooze'
 * - itemType: string (e.g., 'payment', 'deadline')
 * - itemReference: string (e.g., 'obligation:abc123')
 * - snoozeUntil?: ISO date string (required for snooze action)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const company = await getCurrentCompany(user.id!)
    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    const body = await request.json()
    const { action, itemType, itemReference, snoozeUntil } = body

    if (!action || !itemType || !itemReference) {
      return NextResponse.json(
        { error: "Missing required fields: action, itemType, itemReference" },
        { status: 400 }
      )
    }

    if (!["complete", "dismiss", "snooze"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'complete', 'dismiss', or 'snooze'" },
        { status: 400 }
      )
    }

    if (action === "snooze" && !snoozeUntil) {
      return NextResponse.json(
        { error: "snoozeUntil is required for snooze action" },
        { status: 400 }
      )
    }

    switch (action) {
      case "complete":
        await completeChecklistItem(user.id!, company.id, itemType, itemReference)
        break
      case "dismiss":
        await dismissChecklistItem(user.id!, company.id, itemType, itemReference)
        break
      case "snooze":
        await snoozeChecklistItem(
          user.id!,
          company.id,
          itemType,
          itemReference,
          new Date(snoozeUntil)
        )
        break
    }

    return NextResponse.json({ success: true, action, itemReference })
  } catch (error) {
    console.error("Error updating checklist item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
