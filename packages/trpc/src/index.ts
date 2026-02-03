// Re-export everything from trpc init
export * from "./trpc"

// Import routers
import { companyRouter } from "./routers/company"
import { invoiceRouter } from "./routers/invoice"
import { router } from "./trpc"

// App router
export const appRouter = router({
  company: companyRouter,
  invoice: invoiceRouter,
})

export type AppRouter = typeof appRouter
