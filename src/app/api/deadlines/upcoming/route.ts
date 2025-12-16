// src/app/api/deadlines/upcoming/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getUpcomingDeadlines } from "@/lib/deadlines/queries"

export const dynamic = "force-dynamic"

/**
 * GET /api/deadlines/upcoming
 *
 * Query parameters:
 * - businessType: business type filter (e.g., 'pausalni', 'obrt-dohodak', 'jdoo', 'doo')
 * - days: number of days ahead to look (default: 30, max: 365)
 *
 * Response:
 * - deadlines: array of deadlines with daysUntil calculated
 * - nextCritical: first deadline with severity="critical", or null
 * - totalCount: total number of upcoming deadlines
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const businessType = searchParams.get("businessType") || undefined
    const daysParam = searchParams.get("days")
    const days = daysParam ? parseInt(daysParam, 10) : 30

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: "Invalid 'days' parameter. Must be between 1 and 365." },
        { status: 400 }
      )
    }

    // Fetch upcoming deadlines
    const deadlinesRaw = await getUpcomingDeadlines(days, businessType, 100)

    // Calculate daysUntil for each deadline
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const deadlines = deadlinesRaw.map((deadline) => {
      const deadlineDate = new Date(deadline.deadlineDate)
      deadlineDate.setHours(0, 0, 0, 0)

      const diffTime = deadlineDate.getTime() - today.getTime()
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        ...deadline,
        daysUntil,
      }
    })

    // Find the first critical deadline
    const nextCritical = deadlines.find((d) => d.severity === "critical") || null

    // Return response
    return NextResponse.json({
      deadlines,
      nextCritical,
      totalCount: deadlines.length,
    })
  } catch (error) {
    console.error("Error fetching upcoming deadlines:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
