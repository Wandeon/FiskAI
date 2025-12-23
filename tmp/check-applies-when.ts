import { Pool } from "pg"
import { parseAppliesWhen } from "../src/lib/regulatory-truth/dsl/applies-when"

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const { rows } = await pool.query('select id, "appliesWhen" from "RegulatoryRule"')
  let invalid = 0
  const invalidIds: string[] = []
  for (const row of rows) {
    try {
      parseAppliesWhen(row.appliesWhen)
    } catch (error) {
      invalid++
      invalidIds.push(row.id)
    }
  }
  console.log(JSON.stringify({ total: rows.length, invalid, invalidIds }))
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
