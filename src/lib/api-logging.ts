import { NextRequest } from "next/server"
import { runWithContext } from "./context"
import { logger } from "./logger"

type RouteHandler<T = unknown> = (request: NextRequest, context: T) => Promise<Response>

/**
 * Wraps an API route handler with logging context.
 * Automatically:
 * - Creates/uses x-request-id header
 * - Sets up AsyncLocalStorage context
 * - Logs request completion with duration
 * - Logs errors with stack traces
 */
export function withApiLogging<T = unknown>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (request: NextRequest, context: T) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
    const startedAt = Date.now()

    return runWithContext(
      {
        requestId,
        path: request.nextUrl.pathname,
        method: request.method,
      },
      async () => {
        try {
          const response = await handler(request, context)
          const durationMs = Date.now() - startedAt

          logger.info(
            {
              status: response.status,
              durationMs,
            },
            "API request completed"
          )

          // Ensure response has request ID header
          if (!response.headers.has("x-request-id")) {
            response.headers.set("x-request-id", requestId)
          }

          return response
        } catch (error) {
          const durationMs = Date.now() - startedAt
          logger.error({ error, durationMs }, "API request failed")
          throw error
        }
      }
    )
  }
}
