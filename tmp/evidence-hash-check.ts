import { Pool } from "pg"
import { hashContent } from "../src/lib/regulatory-truth/utils/content-hash"

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const { rows } = await pool.query(
    'select id, "contentHash", "rawContent" from "Evidence" where length("rawContent") < 5000 order by "fetchedAt" desc limit 1'
  )
  const row = rows[0]
  if (!row) {
    console.log("NO_EVIDENCE")
    await pool.end()
    return
  }
  const computed = hashContent(row.rawContent)
  console.log(
    JSON.stringify({
      id: row.id,
      stored: row.contentHash,
      computed,
      match: row.contentHash === computed,
    })
  )
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
