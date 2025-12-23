import { allQueues } from "../src/lib/regulatory-truth/workers/queues"

async function main() {
  const status: Record<string, { waiting: number; active: number; failed: number }> = {}
  for (const [name, queue] of Object.entries(allQueues)) {
    const counts = await queue.getJobCounts("waiting", "active", "failed")
    status[name] = {
      waiting: counts.waiting,
      active: counts.active,
      failed: counts.failed,
    }
  }
  console.log(JSON.stringify(status, null, 2))
  await Promise.all(Object.values(allQueues).map((queue) => queue.close()))
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
