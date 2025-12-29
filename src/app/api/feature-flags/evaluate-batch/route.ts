// src/app/api/feature-flags/evaluate-batch/route.ts

import { auth } from "@/lib/auth"
import { evaluateFlag } from "@/lib/feature-flags/service"
import type { FeatureFlagContext } from "@/lib/feature-flags/types"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const keys = searchParams.getAll("keys")

  if (!keys.length) {
    return NextResponse.json({ error: "Missing 'keys' parameter" }, { status: 400 })
  }

  // Build context from request params or session
  const session = await auth()

  const context: FeatureFlagContext = {
    userId: searchParams.get("userId") || session?.user?.id,
    companyId: searchParams.get("companyId") || undefined,
    systemRole:
      (searchParams.get("systemRole") as FeatureFlagContext["systemRole"]) ||
      session?.user?.systemRole,
  }

  // Evaluate all flags in parallel
  const evaluations = await Promise.all(keys.map((key) => evaluateFlag(key, context)))

  // Return as a map of key -> enabled
  const flags: Record<string, boolean> = {}
  const details: Record<string, { enabled: boolean; source: string; reason?: string }> = {}

  for (const evaluation of evaluations) {
    flags[evaluation.key] = evaluation.enabled
    details[evaluation.key] = {
      enabled: evaluation.enabled,
      source: evaluation.source,
      reason: evaluation.reason,
    }
  }

  return NextResponse.json({ flags, details })
}
