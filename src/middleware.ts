import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "./lib/logger"

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()
  const startTime = Date.now()

  // Log incoming request
  logger.info(
    {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get("user-agent")?.slice(0, 100),
    },
    "Incoming request"
  )

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
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
