import { extractKeywords } from "../src/lib/assistant/query-engine/text-utils"
import { matchConcepts } from "../src/lib/assistant/query-engine/concept-matcher"

async function debug() {
  const query = "Random unrelated query xyz123 asdfghjkl"
  console.log("Query:", query)

  const keywords = extractKeywords(query)
  console.log("\nExtracted keywords:", keywords)

  const matches = await matchConcepts(keywords)
  console.log("\nConcept matches:", JSON.stringify(matches, null, 2))

  process.exit(0)
}

debug().catch(console.error)
