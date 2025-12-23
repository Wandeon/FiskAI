#!/usr/bin/env tsx
// Test script for sitemap scanner

import { scanSitemapEntrypoint } from "../agents/sitemap-scanner"

async function main() {
  console.log("Testing sitemap scanner with HZZO...")

  const result = await scanSitemapEntrypoint("hzzo.hr", "https://hzzo.hr/sitemap.xml", {
    name: "HZZO Sitemap Test",
    maxDepth: 2,
  })

  console.log("\nResult:")
  console.log(`  Success: ${result.success}`)
  console.log(`  Sitemaps scanned: ${result.sitemapsScanned}`)
  console.log(`  URLs discovered: ${result.urlsDiscovered}`)
  console.log(`  URLs registered: ${result.urlsRegistered}`)
  console.log(`  URLs skipped: ${result.urlsSkipped}`)
  console.log(`  Errors: ${result.errors.length}`)

  if (result.errors.length > 0) {
    console.log("\nErrors:")
    result.errors.forEach((err) => console.log(`  - ${err}`))
  }
}

main().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
