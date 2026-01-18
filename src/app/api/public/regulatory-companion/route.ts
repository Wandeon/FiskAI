/**
 * Regulatory Companion API
 *
 * Public endpoint for marketing site visitors to subscribe to regulatory updates.
 * No authentication required - this is for anonymous users.
 *
 * POST /api/public/regulatory-companion
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { drizzleDb } from "@/lib/db/drizzle"
import {
  regulatoryCompanionSubscribers,
  BUSINESS_TYPES,
} from "@/lib/db/schema/regulatory-companion"
import { checkRateLimit } from "@/lib/security/rate-limit"
import { parseBody, isValidationError, formatValidationError } from "@/lib/api/validation"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// Allowed origins for CORS (marketing site)
const ALLOWED_ORIGINS = ["https://fiskai.hr", "https://www.fiskai.hr"]

// In development, also allow localhost
if (process.env.NODE_ENV === "development") {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:3001")
}

/**
 * Request body schema
 */
const subscribeSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .transform((v) => v.toLowerCase().trim()),
  businessType: z.enum(BUSINESS_TYPES, {
    errorMap: () => ({ message: "Invalid business type" }),
  }),
  // Honeypot field - if filled, reject silently (bot trap)
  website: z.string().optional(),
})

/**
 * Get client IP from headers (Cloudflare, proxy, or direct)
 */
function getClientIp(headersList: Headers): string {
  return (
    headersList.get("cf-connecting-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  )
}

/**
 * Get CORS headers for the response
 */
function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400", // 24 hours
  }
}

/**
 * Handle OPTIONS preflight request for CORS
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

/**
 * Handle POST request - subscribe to regulatory companion updates
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  try {
    // Get client info
    const headersList = await headers()
    const clientIp = getClientIp(headersList)
    const userAgent = request.headers.get("user-agent") || null

    logger.info(
      { requestId, clientIp, origin },
      "[regulatory-companion] Subscription request received"
    )

    // Rate limiting by IP
    const rateLimit = await checkRateLimit(
      `regulatory-companion:${clientIp}`,
      "REGULATORY_COMPANION"
    )
    if (!rateLimit.allowed) {
      logger.warn(
        { requestId, clientIp, blockedUntil: rateLimit.blockedUntil },
        "[regulatory-companion] Rate limit exceeded"
      )
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429, headers: corsHeaders }
      )
    }

    // Parse and validate request body
    const data = await parseBody(request, subscribeSchema)

    // Honeypot check - if website field is filled, it's a bot
    if (data.website) {
      logger.warn(
        { requestId, clientIp },
        "[regulatory-companion] Honeypot triggered - bot detected"
      )
      // Return success to not reveal the honeypot to the bot
      return NextResponse.json(
        { success: true, message: "Subscribed successfully" },
        { status: 201, headers: corsHeaders }
      )
    }

    // Check if email already exists
    const existing = await drizzleDb
      .select()
      .from(regulatoryCompanionSubscribers)
      .where(eq(regulatoryCompanionSubscribers.email, data.email))
      .limit(1)

    if (existing.length > 0) {
      const subscriber = existing[0]

      // If already subscribed and active, update businessType if different
      if (!subscriber.unsubscribedAt) {
        if (subscriber.businessType !== data.businessType) {
          await drizzleDb
            .update(regulatoryCompanionSubscribers)
            .set({
              businessType: data.businessType,
              updatedAt: new Date(),
            })
            .where(eq(regulatoryCompanionSubscribers.email, data.email))

          logger.info(
            { requestId, email: data.email, businessType: data.businessType },
            "[regulatory-companion] Updated existing subscriber's business type"
          )
        }

        return NextResponse.json(
          { success: true, message: "Already subscribed", updated: true },
          { status: 200, headers: corsHeaders }
        )
      }

      // If previously unsubscribed, resubscribe
      await drizzleDb
        .update(regulatoryCompanionSubscribers)
        .set({
          businessType: data.businessType,
          unsubscribedAt: null,
          subscribedAt: new Date(),
          updatedAt: new Date(),
          ipAddress: clientIp,
          userAgent: userAgent,
        })
        .where(eq(regulatoryCompanionSubscribers.email, data.email))

      logger.info(
        { requestId, email: data.email },
        "[regulatory-companion] Resubscribed previously unsubscribed user"
      )

      return NextResponse.json(
        { success: true, message: "Subscribed successfully" },
        { status: 201, headers: corsHeaders }
      )
    }

    // Insert new subscriber
    await drizzleDb.insert(regulatoryCompanionSubscribers).values({
      email: data.email,
      businessType: data.businessType,
      source: "marketing-site",
      ipAddress: clientIp,
      userAgent: userAgent,
    })

    logger.info(
      { requestId, email: data.email, businessType: data.businessType },
      "[regulatory-companion] New subscriber created"
    )

    return NextResponse.json(
      { success: true, message: "Subscribed successfully" },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    if (isValidationError(error)) {
      logger.warn({ requestId, error: error.errors }, "[regulatory-companion] Validation error")
      // Return first error message for simpler client handling
      const firstError =
        error.errors.formErrors[0] ||
        Object.values(error.errors.fieldErrors).flat().filter(Boolean)[0] ||
        "Invalid request"
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400, headers: corsHeaders }
      )
    }

    logger.error({ requestId, error }, "[regulatory-companion] Internal error")
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    )
  }
}
