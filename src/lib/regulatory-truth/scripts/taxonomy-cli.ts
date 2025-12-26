// src/lib/regulatory-truth/scripts/taxonomy-cli.ts
import { seedTaxonomy } from "../taxonomy/seed-taxonomy"
import { expandQueryConcepts } from "../taxonomy/query-expansion"
import { buildOverridesEdges } from "../taxonomy/precedence-builder"
import { findConceptsByTerm } from "../taxonomy/concept-graph"

async function main() {
  const command = process.argv[2]
  const args = process.argv.slice(3)

  switch (command) {
    case "seed": {
      console.log("Seeding taxonomy...")
      const result = await seedTaxonomy()
      console.log(`Created: ${result.created}, Updated: ${result.updated}`)
      break
    }

    case "expand": {
      if (!args[0]) {
        console.error("Usage: taxonomy-cli expand <query>")
        process.exit(1)
      }
      const query = args.join(" ")
      console.log(`Expanding query: "${query}"`)
      const result = await expandQueryConcepts(query)
      console.log("\nOriginal terms:", result.originalTerms)
      console.log("Expanded terms:", result.expandedTerms)
      console.log("Matched concepts:", result.matchedConcepts)
      console.log("Legal categories:", result.legalCategories)
      console.log("VAT categories:", result.vatCategories)
      break
    }

    case "find": {
      if (!args[0]) {
        console.error("Usage: taxonomy-cli find <term>")
        process.exit(1)
      }
      const term = args.join(" ")
      console.log(`Finding concepts for: "${term}"`)
      const concepts = await findConceptsByTerm(term)
      for (const c of concepts) {
        console.log(`\n${c.slug}:`)
        console.log(`  Name: ${c.nameHr}`)
        console.log(`  Synonyms: ${c.synonyms.join(", ")}`)
        console.log(`  Legal category: ${c.legalCategory}`)
        console.log(`  VAT category: ${c.vatCategory}`)
      }
      break
    }

    case "build-overrides": {
      console.log("Building OVERRIDES edges...")
      const result = await buildOverridesEdges()
      console.log(`Created: ${result.created}, Skipped: ${result.skipped}`)
      if (result.errors.length > 0) {
        console.log("Errors:")
        result.errors.forEach((e) => console.log(`  - ${e}`))
      }
      break
    }

    default:
      console.log(`
Taxonomy CLI

Commands:
  seed              Seed initial taxonomy
  expand <query>    Expand query with taxonomy
  find <term>       Find concepts matching term
  build-overrides   Build OVERRIDES edges from ClaimException
      `)
      break
  }

  process.exit(0)
}

main().catch((error) => {
  console.error("Error:", error)
  process.exit(1)
})
