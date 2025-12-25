import { Queue } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

async function main() {
  const arbiterQueue = new Queue("arbiter", { connection, prefix: "fiskai" })

  await arbiterQueue.add("resolve-conflict", {
    conflictId: "test-conflict-9c9b92b672950e08db5dcd918d1893ae",
    runId: "manual-test-" + Date.now(),
  })

  console.log("Triggered arbiter job for test conflict")

  await connection.quit()
}

main().catch(console.error)
