// docs/_meta/scripts/run-all-inventory.ts
import { execSync } from "child_process"
import * as fs from "fs"

console.log("=== FiskAI Inventory Extraction ===\n")

const scripts = [
  "extract-routes.ts",
  "extract-api-endpoints.ts",
  "extract-components.ts",
  "extract-actions.ts",
  "extract-db-schema.ts",
]

for (const script of scripts) {
  console.log(`Running ${script}...`)
  try {
    execSync(`npx tsx docs/_meta/scripts/${script}`, { stdio: "inherit" })
  } catch (error) {
    console.error(`Error running ${script}:`, error)
  }
  console.log("")
}

// Generate summary
console.log("=== Inventory Summary ===\n")

const inventoryDir = "docs/_meta/inventory"
const files = fs.readdirSync(inventoryDir).filter((f) => f.endsWith(".json"))

let totalItems = 0
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(`${inventoryDir}/${file}`, "utf-8"))
  console.log(`${file}: ${content.count} items`)
  totalItems += content.count
}

console.log(`\nTotal inventory items: ${totalItems}`)
console.log("\nInventory extraction complete!")
