// src/instrumentation.ts
// Next.js instrumentation file - runs on server startup

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[instrumentation] Server starting...")

    // Start regulatory truth scheduler
    if (process.env.REGULATORY_CRON_ENABLED === "true") {
      try {
        const { startScheduler } = await import("@/lib/regulatory-truth/scheduler/cron")
        startScheduler()
        console.log("[instrumentation] Regulatory truth scheduler started")
      } catch (error) {
        console.error("[instrumentation] Failed to start scheduler:", error)
      }
    } else {
      console.log("[instrumentation] Regulatory cron disabled (REGULATORY_CRON_ENABLED !== true)")
    }
  }
}
