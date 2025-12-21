import { MarketingRegistry, RouteEntry } from "./types"

export function seedRegistry(routes: RouteEntry[]): MarketingRegistry {
  return {
    pages: routes.map((route) => ({
      route: route.route,
      file: route.file,
      ctas: [],
      dataDependencies: [],
      toolChecks: [],
      notes: "",
    })),
  }
}

export function serializeRegistry(registry: MarketingRegistry): string {
  const lines: string[] = []
  lines.push("version: 1")
  lines.push("pages:")

  if (registry.pages.length === 0) {
    lines[1] = "pages: []"
    return `${lines.join("\n")}\n`
  }

  for (const page of registry.pages) {
    lines.push(`  - route: ${page.route}`)
    lines.push(`    file: ${page.file}`)
    lines.push("    ctas: []")
    lines.push("    dataDependencies: []")
    lines.push("    toolChecks: []")
    lines.push(`    notes: "${page.notes}"`)
  }

  return `${lines.join("\n")}\n`
}
