import { Queue } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

async function main() {
  // Trigger sentinel to fetch pending items
  const sentinelQueue = new Queue("sentinel", { connection, prefix: "fiskai" })
  await sentinelQueue.add("fetch-items", { limit: 100, triggeredBy: "manual" })
  console.log("✓ Triggered sentinel fetch (100 items)")

  // Trigger extractor to process evidence
  const extractQueue = new Queue("extract", { connection, prefix: "fiskai" })
  for (let i = 0; i < 5; i++) {
    await extractQueue.add("process-batch", { triggeredBy: "manual", batch: i })
  }
  console.log("✓ Triggered 5 extraction batches")

  // Trigger composer
  const composeQueue = new Queue("compose", { connection, prefix: "fiskai" })
  await composeQueue.add("compose-rules", { triggeredBy: "manual" })
  console.log("✓ Triggered composer")

  // Trigger reviewer
  const reviewQueue = new Queue("review", { connection, prefix: "fiskai" })
  await reviewQueue.add("auto-approve", { triggeredBy: "manual" })
  console.log("✓ Triggered reviewer auto-approve")

  // Trigger releaser
  const releaseQueue = new Queue("release", { connection, prefix: "fiskai" })
  await releaseQueue.add("release-batch", { triggeredBy: "manual" })
  console.log("✓ Triggered releaser")

  await connection.quit()
  console.log("\nFull pipeline triggered!")
}

main().catch(console.error)
