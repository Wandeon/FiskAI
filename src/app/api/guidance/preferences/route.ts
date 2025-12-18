// src/app/api/guidance/preferences/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-utils"
import {
  getGuidancePreferences,
  updateGuidancePreferences,
  setGlobalLevel,
  COMPETENCE_LEVELS,
  LEVEL_LABELS,
  LEVEL_DESCRIPTIONS,
  CATEGORY_LABELS,
} from "@/lib/guidance"

export const dynamic = "force-dynamic"

/**
 * GET /api/guidance/preferences
 *
 * Get the current user's guidance preferences.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preferences = await getGuidancePreferences(user.id!)

    return NextResponse.json({
      preferences,
      meta: {
        levels: COMPETENCE_LEVELS,
        levelLabels: LEVEL_LABELS,
        levelDescriptions: LEVEL_DESCRIPTIONS,
        categoryLabels: CATEGORY_LABELS,
      },
    })
  } catch (error) {
    console.error("Error fetching guidance preferences:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/guidance/preferences
 *
 * Update the user's guidance preferences.
 *
 * Body (all fields optional):
 * - levelFakturiranje: 'beginner' | 'average' | 'pro'
 * - levelFinancije: 'beginner' | 'average' | 'pro'
 * - levelEu: 'beginner' | 'average' | 'pro'
 * - globalLevel: 'beginner' | 'average' | 'pro' | null (set all at once)
 * - emailDigest: 'daily' | 'weekly' | 'none'
 * - pushEnabled: boolean
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate competence levels
    const validLevels = Object.values(COMPETENCE_LEVELS)
    const { levelFakturiranje, levelFinancije, levelEu, globalLevel, emailDigest, pushEnabled } =
      body

    if (levelFakturiranje && !validLevels.includes(levelFakturiranje)) {
      return NextResponse.json(
        { error: `Invalid levelFakturiranje. Must be one of: ${validLevels.join(", ")}` },
        { status: 400 }
      )
    }

    if (levelFinancije && !validLevels.includes(levelFinancije)) {
      return NextResponse.json(
        { error: `Invalid levelFinancije. Must be one of: ${validLevels.join(", ")}` },
        { status: 400 }
      )
    }

    if (levelEu && !validLevels.includes(levelEu)) {
      return NextResponse.json(
        { error: `Invalid levelEu. Must be one of: ${validLevels.join(", ")}` },
        { status: 400 }
      )
    }

    if (globalLevel !== undefined && globalLevel !== null && !validLevels.includes(globalLevel)) {
      return NextResponse.json(
        { error: `Invalid globalLevel. Must be one of: ${validLevels.join(", ")} or null` },
        { status: 400 }
      )
    }

    if (emailDigest && !["daily", "weekly", "none"].includes(emailDigest)) {
      return NextResponse.json(
        { error: "Invalid emailDigest. Must be 'daily', 'weekly', or 'none'" },
        { status: 400 }
      )
    }

    // If globalLevel is set to a valid value, use setGlobalLevel to update all at once
    if (globalLevel && validLevels.includes(globalLevel)) {
      const preferences = await setGlobalLevel(user.id!, globalLevel)
      return NextResponse.json({ preferences })
    }

    // Otherwise, update individual fields
    const updates: Record<string, any> = {}
    if (levelFakturiranje) updates.levelFakturiranje = levelFakturiranje
    if (levelFinancije) updates.levelFinancije = levelFinancije
    if (levelEu) updates.levelEu = levelEu
    if (globalLevel === null) updates.globalLevel = null
    if (emailDigest) updates.emailDigest = emailDigest
    if (typeof pushEnabled === "boolean") updates.pushEnabled = pushEnabled

    const preferences = await updateGuidancePreferences(user.id!, updates)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error("Error updating guidance preferences:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
