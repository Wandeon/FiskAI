import { Queue } from "bullmq"
import Redis from "ioredis"

const REDIS_URL = process.env.REDIS_URL || ""

async function main() {
  const connection = new Redis(REDIS_URL)

  console.log("=== Queue Inspection ===\n")

  // Check DLQ
  const dlq = new Queue("deadletter", { connection })
  const dlqJobs = await dlq.getJobs(["waiting", "failed"], 0, 20)

  console.log("--- Dead Letter Queue ---")
  console.log(`Total jobs: ${await dlq.getJobCounts()}\n`)

  for (const job of dlqJobs.slice(0, 5)) {
    console.log(`Job ID: ${job.id}`)
    console.log(`  Name: ${job.name}`)
    console.log(`  Attempts: ${job.attemptsMade}`)
    console.log(`  Failed Reason: ${job.failedReason || "N/A"}`)
    const dataStr = JSON.stringify(job.data)
    console.log(`  Data: ${dataStr.length > 200 ? dataStr.slice(0, 200) + "..." : dataStr}`)
    console.log("")
  }

  // Check large queues
  const largeQueues = ["extract", "review", "arbiter", "compose"]

  for (const queueName of largeQueues) {
    console.log(`\n--- ${queueName} Queue ---`)
    const queue = new Queue(queueName, { connection })
    const counts = await queue.getJobCounts()
    console.log(`Counts: ${JSON.stringify(counts)}`)

    // Get a sample of waiting jobs
    const waitingJobs = await queue.getJobs(["waiting"], 0, 3)
    if (waitingJobs.length > 0) {
      console.log("\nSample waiting jobs:")
      for (const job of waitingJobs) {
        console.log(`  Job ${job.id}: ${job.name}`)
        const dataStr = JSON.stringify(job.data)
        console.log(`    Data: ${dataStr.length > 150 ? dataStr.slice(0, 150) + "..." : dataStr}`)
      }
    }

    await queue.close()
  }

  await dlq.close()
  await connection.quit()
}

main().catch(console.error)
