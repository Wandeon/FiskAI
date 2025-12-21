import { promises as fs } from "node:fs"
import path from "node:path"
import { getAuditConfig } from "../../src/lib/marketing-audit/config"
import { buildRouteInventory } from "../../src/lib/marketing-audit/route-inventory"
import { seedRegistry, serializeRegistry } from "../../src/lib/marketing-audit/registry"

async function main() {
  const config = getAuditConfig()
  const allRoutes = []

  for (const repo of config.repos) {
    const routes = await buildRouteInventory(repo, config.marketingRoot)
    allRoutes.push(...routes)
  }

  const registry = seedRegistry(allRoutes)
  const outputPath = path.resolve(process.cwd(), config.registryPath)

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, serializeRegistry(registry), "utf8")

  console.log(`Wrote registry to ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
