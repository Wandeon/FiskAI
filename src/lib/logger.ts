// src/lib/logger.ts
import pino from "pino"
import { getContext } from "./context"

const isDev = process.env.NODE_ENV !== "production"

// In dev mode, don't use pino-pretty transport (worker threads crash with Next.js HMR)
// Instead use synchronous pretty printing via pino's built-in formatters
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  base: {
    env: process.env.NODE_ENV,
    app: "fiskai",
  },
  // Use synchronous formatting in dev instead of worker-based transport
  ...(isDev && {
    formatters: {
      level: (label) => ({ level: label }),
    },
  }),
  mixin() {
    const context = getContext()
    if (!context) return {}
    return {
      requestId: context.requestId,
      userId: context.userId,
      companyId: context.companyId,
      path: context.path,
      method: context.method,
    }
  },
  redact: {
    paths: ["password", "passwordHash", "apiKey", "secret", "token"],
    censor: "[REDACTED]",
  },
})

// Create child loggers for different contexts
export const createLogger = (context: string) => logger.child({ context })

// Pre-configured loggers for common use cases
export const authLogger = createLogger("auth")
export const dbLogger = createLogger("database")
export const invoiceLogger = createLogger("e-invoice")
export const apiLogger = createLogger("api")
