import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "./lib/logger"

// Protected routes that should check visibility on the server side
// These paths correspond to page:* element IDs in the visibility system
const PROTECTED_ROUTES = ["/vat", "/reports", "/pos", "/doprinosi", "/corporate-tax", "/bank"]

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/verify-request",
  "/auth/error",
]

// Routes to skip (API, static assets, etc.)
function shouldSkipRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  )
}

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()
  const startTime = Date.now()
  const pathname = request.nextUrl.pathname

  // Log incoming request
  logger.info(
    {
      requestId,
      method: request.method,
      path: pathname,
      userAgent: request.headers.get("user-agent")?.slice(0, 100),
    },
    "Incoming request"
  )

  // Skip route protection for public routes and static assets
  if (shouldSkipRoute(pathname) || PUBLIC_ROUTES.includes(pathname)) {
    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)
    response.headers.set("x-response-time", `${Date.now() - startTime}ms`)
    return response
  }

  // Check if this is a protected route
  // The actual visibility check will happen in the page component using
  // server-side utilities (checkRouteAccess) since middleware runs in Edge runtime
  // and cannot access database/Prisma. This just marks the route for the page to check.
  if (PROTECTED_ROUTES.includes(pathname)) {
    // Add a header to indicate this route needs visibility checking
    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)
    response.headers.set("x-visibility-protected", "true")
    response.headers.set("x-response-time", `${Date.now() - startTime}ms`)
    return response
  }

  // Create response with request ID header
  const response = NextResponse.next()
  response.headers.set("x-request-id", requestId)

  // Calculate duration (note: this is middleware duration, not full request)
  const durationMs = Date.now() - startTime
  response.headers.set("x-response-time", `${durationMs}ms`)

  return response
}

export const config = {
  matcher: [
    // Skip static files and internal Next.js routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
