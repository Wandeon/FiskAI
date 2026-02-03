import { initTRPC } from "@trpc/server"
import superjson from "superjson"
import type { db } from "@fiskai/db"

// Context type
export interface Context {
  db: typeof db
  userId?: string
  companyId?: string
}

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// Auth middleware
const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new Error("UNAUTHORIZED")
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)
