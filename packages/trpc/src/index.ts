// Re-export everything from trpc init
export * from "./trpc"

// Import routers
import { companyRouter } from "./routers/company"
import { invoiceRouter } from "./routers/invoice"
import { eInvoiceRouter } from "./routers/einvoice"
import { router } from "./trpc"

// App router
export const appRouter = router({
  company: companyRouter,
  invoice: invoiceRouter,
  eInvoice: eInvoiceRouter,
})

export type AppRouter = typeof appRouter
