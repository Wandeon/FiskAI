// src/app/api/feature-flags/evaluate/route.ts

import { auth } from "@/lib/auth"
import { evaluateFlag } from "@/lib/feature-flags/service"
import type { FeatureFlagContext } from "@/lib/feature-flags/types"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const key = searchParams.get("key")

  if (!key) {
    return NextResponse.json({ error: "Missing 'key' parameter" }, { status: 400 })
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

  const evaluation = await evaluateFlag(key, context)

  return NextResponse.json(evaluation)
}
