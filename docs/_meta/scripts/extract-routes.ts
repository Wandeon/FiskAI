// docs/_meta/scripts/extract-routes.ts
import * as fs from "fs"
import * as path from "path"

interface RouteInfo {
  path: string
  file: string
  type: "page" | "layout" | "loading" | "error"
  routeGroup: string | null
}

function findRoutes(dir: string, basePath: string = ""): RouteInfo[] {
  const routes: RouteInfo[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue

    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      let routeSegment = entry.name
      let routeGroup: string | null = null

      // Handle route groups (parentheses)
      if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
        routeGroup = entry.name.slice(1, -1)
        routeSegment = ""
      }

      // Handle dynamic routes
      if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
        routeSegment = `:${entry.name.slice(1, -1)}`
      }

      const newBasePath = routeSegment ? `${basePath}/${routeSegment}` : basePath

      routes.push(...findRoutes(fullPath, newBasePath))
    } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
      routes.push({
        path: basePath || "/",
        file: fullPath.replace(process.cwd() + "/", ""),
        type: "page",
        routeGroup: null,
      })
    } else if (entry.name === "layout.tsx" || entry.name === "layout.ts") {
      routes.push({
        path: basePath || "/",
        file: fullPath.replace(process.cwd() + "/", ""),
        type: "layout",
        routeGroup: null,
      })
    }
  }

  return routes
}

const appDir = path.join(process.cwd(), "src/app")
const routes = findRoutes(appDir)

const output = {
  generated: new Date().toISOString(),
  count: routes.length,
  routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
}

fs.writeFileSync("docs/_meta/inventory/routes.json", JSON.stringify(output, null, 2))

console.log(`Extracted ${routes.length} routes to docs/_meta/inventory/routes.json`)
