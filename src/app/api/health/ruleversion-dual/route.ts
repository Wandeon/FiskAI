import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import { withApiLogging } from "@/lib/api-logging"
import { getDualModeMetrics, getCurrentSource } from "@/lib/fiscal-rules/ruleversion-store"

export const dynamic = "force-dynamic"

/**
 * RuleVersion dual-mode metrics endpoint
 *
 * Returns current source mode and parity metrics (counts only, no values).
 * Use this to monitor dual-mode during migration.
 *
 * ADMIN ONLY - requires authenticated admin user.
 */
export const GET = withApiLogging(async (request: NextRequest) => {
  // Require authentication
  const token = await getToken({ req: request })

  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Require admin role
  if (token.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const source = getCurrentSource()
  const metrics = getDualModeMetrics()

  // Return counts only - never expose coreValue/regulatoryValue in HTTP response
  // Those values are in structured logs for debugging, not public endpoints
  return NextResponse.json({
    source,
    metrics: {
      reads: {
        core: metrics.reads.core,
        regulatory: metrics.reads.regulatory,
        total: metrics.reads.core + metrics.reads.regulatory,
      },
      mismatches: {
        total: metrics.mismatches.total,
        byTableKey: metrics.mismatches.byTableKey,
        byField: metrics.mismatches.byField,
      },
      missing: {
        inCore: metrics.missing.inCore,
        inRegulatory: metrics.missing.inRegulatory,
      },
    },
    healthy:
      metrics.mismatches.total === 0 &&
      metrics.missing.inCore === 0 &&
      metrics.missing.inRegulatory === 0,
    timestamp: new Date().toISOString(),
  })
})
