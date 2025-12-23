#!/usr/bin/env tsx
// src/lib/regulatory-truth/scripts/generate-review-bundle.ts
// Generates daily review bundles for human approval of T0/T1 rules

import { generateReviewBundle, formatBundleMarkdown } from "../utils/review-bundle"
import { closeCliDb } from "../cli-db"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const help = args.includes("--help") || args.includes("-h")
  const maxItems = parseInt(args.find((_, i, a) => a[i - 1] === "--max")?.toString() || "20")
  const prioritize = (args.find((_, i, a) => a[i - 1] === "--prioritize") || "risk") as
    | "risk"
    | "age"
  const outputOnly = args.includes("--output-only")
  const saveToFile = args.includes("--save") || !outputOnly

  if (help) {
    console.log(`
Daily Review Bundle Generator
==============================

Generates review bundles for T0/T1 rules pending human approval.

Usage: npx tsx src/lib/regulatory-truth/scripts/generate-review-bundle.ts [options]

Options:
  --max N              Maximum items to include (default: 20)
  --prioritize MODE    Prioritization mode: "risk" or "age" (default: risk)
  --save               Save bundle to file (default: true)
  --output-only        Only output to console, don't save file
  --help, -h           Show this help

Examples:
  # Generate bundle for up to 20 T0/T1 rules
  npx tsx src/lib/regulatory-truth/scripts/generate-review-bundle.ts

  # Generate bundle prioritized by age
  npx tsx src/lib/regulatory-truth/scripts/generate-review-bundle.ts --prioritize age

  # Generate large bundle
  npx tsx src/lib/regulatory-truth/scripts/generate-review-bundle.ts --max 50
`)
    await closeCliDb()
    process.exit(0)
  }

  console.log("Generating review bundle...")
  console.log(`  Max items: ${maxItems}`)
  console.log(`  Prioritize: ${prioritize}`)

  const bundle = await generateReviewBundle({
    maxItems,
    prioritize,
    riskTiers: ["T0", "T1"], // Only T0/T1 require human review
  })

  const markdown = formatBundleMarkdown(bundle)

  // Save to file
  if (saveToFile) {
    const date = new Date().toISOString().split("T")[0]
    const dir = "docs/regulatory-truth/review-bundles"
    mkdirSync(dir, { recursive: true })
    const path = join(dir, `${date}-review-bundle.md`)
    writeFileSync(path, markdown)
    console.log(`\nSaved to: ${path}`)
  }

  // Always output to console
  console.log("\n" + "=".repeat(72))
  console.log(markdown)
  console.log("=".repeat(72))

  if (bundle.totalItems === 0) {
    console.log("\n✓ No T0/T1 rules pending review!")
  } else {
    console.log(`\n${bundle.totalItems} rules ready for review`)
    console.log("\nNext steps:")
    console.log("1. Review each rule above")
    console.log("2. Approve individual rules or use the bulk approve command")
    console.log("3. Rejected rules should be manually handled with --reject flag")
  }

  await closeCliDb()
}

main().catch((err) => {
  console.error("Bundle generation failed:", err)
  process.exit(1)
})
