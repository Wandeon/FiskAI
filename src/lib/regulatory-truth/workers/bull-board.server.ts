// src/lib/regulatory-truth/workers/bull-board.server.ts
import express from "express"
import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ExpressAdapter } from "@bull-board/express"
import {
  sentinelQueue,
  extractQueue,
  composeQueue,
  reviewQueue,
  arbiterQueue,
  releaseQueue,
  scheduledQueue,
  deadletterQueue,
} from "./queues"

const PORT = process.env.BULL_BOARD_PORT || 3003

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath("/")

createBullBoard({
  queues: [
    new BullMQAdapter(sentinelQueue),
    new BullMQAdapter(extractQueue),
    new BullMQAdapter(composeQueue),
    new BullMQAdapter(reviewQueue),
    new BullMQAdapter(arbiterQueue),
    new BullMQAdapter(releaseQueue),
    new BullMQAdapter(scheduledQueue),
    new BullMQAdapter(deadletterQueue),
  ],
  serverAdapter,
})

const app = express()
app.use("/", serverAdapter.getRouter())

app.listen(PORT, () => {
  console.log(`[bull-board] Dashboard running at http://localhost:${PORT}`)
})
