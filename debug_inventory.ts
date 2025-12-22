import { db } from "./src/lib/db"

async function main() {
  console.log("--- SOURCES ---")
  try {
    const sources = await db.regulatorySource.findMany({ where: { isActive: true } })
    sources.forEach((s) => console.log(`${s.slug}: ${s.url}`))

    console.log("\n--- LATEST EVIDENCE ---")
    const evidence = await db.evidence.findFirst({
      orderBy: { fetchedAt: "desc" },
      include: { source: true },
    })
    if (evidence) {
      console.log(`Latest Evidence ID: ${evidence.id}`)
      console.log(`Source: ${evidence.source.slug}`)
      console.log(`URL: ${evidence.url}`)
    } else {
      console.log("No evidence found.")
    }
  } catch (e) {
    console.error("DB Error:", e)
  }
}

main()
//.finally(async () => await db.$disconnect()) // db is extended client, might not have disconnect on top level if wrapped
