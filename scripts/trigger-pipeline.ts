import { Queue } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

async function main() {
  const sentinelQueue = new Queue("sentinel", {
    connection,
    prefix: "fiskai",
  })

  // Add a sentinel job to trigger discovery
  await sentinelQueue.add("run-sentinel", {
    priority: "CRITICAL",
    triggeredBy: "manual",
  })

  console.log("Triggered sentinel job")

  const extractQueue = new Queue("extract", {
    connection,
    prefix: "fiskai",
  })

  // Add an extract job
  await extractQueue.add("process-evidence", {
    triggeredBy: "manual",
  })

  console.log("Triggered extract job")

  await connection.quit()
}

main().catch(console.error)
