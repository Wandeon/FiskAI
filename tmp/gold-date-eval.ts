import { Pool } from "pg"

function toIso(match: RegExpMatchArray | null): string | null {
  if (!match) return null
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const { rows } = await pool.query(
    `select sp.id, sp."extractedValue" as extracted, sp."exactQuote" as quote, e.url
     from "SourcePointer" sp
     join "Evidence" e on e.id = sp."evidenceId"
     where sp."exactQuote" ~ '\\d{2}\\.\\d{2}\\.\\d{4}'
     order by sp."createdAt" desc
     limit 10`
  )

  let correct = 0
  const results = rows.map((row: any) => {
    const match = row.quote.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    const expected = toIso(match)
    const ok = expected === row.extracted
    if (ok) correct++
    return {
      id: row.id,
      expected,
      extracted: row.extracted,
      ok,
      quote: row.quote,
      url: row.url,
    }
  })

  const summary = {
    total: rows.length,
    correct,
    precision: rows.length ? correct / rows.length : 0,
  }
  console.log(JSON.stringify({ summary, results }, null, 2))
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
