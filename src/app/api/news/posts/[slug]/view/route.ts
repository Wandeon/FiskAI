// src/app/api/news/posts/[slug]/view/route.ts
import { NextResponse } from "next/server"
import { drizzleDb } from "@/lib/db/drizzle"
import { newsPosts } from "@/lib/db/schema/news"
import { eq, sql } from "drizzle-orm"
import { apiError } from "@/lib/api-error"

/**
 * POST /api/news/posts/[slug]/view
 * Increment view count for a news post (privacy-friendly - no user tracking)
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Increment view count atomically
    await drizzleDb
      .update(newsPosts)
      .set({
        viewCount: sql`${newsPosts.viewCount} + 1`,
      })
      .where(eq(newsPosts.slug, slug))

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Failed to track view",
    })
  }
}
