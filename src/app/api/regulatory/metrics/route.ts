// src/app/api/regulatory/metrics/route.ts
import { NextResponse } from "next/server"
import { getMetrics, queueDepth, allQueues } from "@/lib/regulatory-truth/workers"

export async function GET() {
  try {
    // Update queue depths before returning metrics
    for (const [name, queue] of Object.entries(allQueues)) {
      const counts = await queue.getJobCounts("waiting")
      queueDepth.set({ queue: name }, counts.waiting)
    }

    const metrics = await getMetrics()

    return new NextResponse(metrics, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
