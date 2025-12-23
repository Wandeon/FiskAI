import { createHash } from "crypto"
import { Pool } from "pg"

const computeContentHash = (
  rules: Array<{
    conceptSlug: string
    appliesWhen: string
    value: string
    effectiveFrom: Date | string
    effectiveUntil: Date | string | null
  }>
) => {
  const sorted = [...rules].sort((a, b) => a.conceptSlug.localeCompare(b.conceptSlug))
  const content = sorted.map((r) => ({
    conceptSlug: r.conceptSlug,
    appliesWhen: r.appliesWhen,
    value: r.value,
    effectiveFrom: new Date(r.effectiveFrom).toISOString(),
    effectiveUntil: r.effectiveUntil ? new Date(r.effectiveUntil).toISOString() : null,
  }))
  return createHash("sha256").update(JSON.stringify(content), "utf8").digest("hex")
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const releaseRes = await pool.query(
    'select id, version, "contentHash" from "RuleRelease" order by "releasedAt" desc limit 1'
  )
  const release = releaseRes.rows[0]
  if (!release) {
    console.log("NO_RELEASE")
    await pool.end()
    return
  }
  const rulesRes = await pool.query(
    'select r.id, r."conceptSlug", r."appliesWhen", r.value, r."effectiveFrom", r."effectiveUntil" from "RegulatoryRule" r join "_ReleaseRules" rr on rr."A" = r.id where rr."B" = $1',
    [release.id]
  )
  const computed = computeContentHash(rulesRes.rows)
  console.log(
    JSON.stringify({
      releaseId: release.id,
      version: release.version,
      stored: release.contentHash,
      computed,
      match: release.contentHash === computed,
      ruleCount: rulesRes.rows.length,
    })
  )
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
