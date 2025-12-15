// docs/_meta/scripts/extract-api-endpoints.ts
import * as fs from "fs"
import * as path from "path"

interface ApiEndpoint {
  path: string
  file: string
  methods: string[]
}

function findApiEndpoints(dir: string, basePath: string = "/api"): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = []

  if (!fs.existsSync(dir)) return endpoints

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      let segment = entry.name

      // Handle dynamic routes
      if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
        segment = `:${entry.name.slice(1, -1)}`
      }

      endpoints.push(...findApiEndpoints(fullPath, `${basePath}/${segment}`))
    } else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      const content = fs.readFileSync(fullPath, "utf-8")
      const methods: string[] = []

      // Detect exported HTTP methods
      if (/export\s+(async\s+)?function\s+GET/i.test(content)) methods.push("GET")
      if (/export\s+(async\s+)?function\s+POST/i.test(content)) methods.push("POST")
      if (/export\s+(async\s+)?function\s+PUT/i.test(content)) methods.push("PUT")
      if (/export\s+(async\s+)?function\s+PATCH/i.test(content)) methods.push("PATCH")
      if (/export\s+(async\s+)?function\s+DELETE/i.test(content)) methods.push("DELETE")

      endpoints.push({
        path: basePath,
        file: fullPath.replace(process.cwd() + "/", ""),
        methods,
      })
    }
  }

  return endpoints
}

const apiDir = path.join(process.cwd(), "src/app/api")
const endpoints = findApiEndpoints(apiDir)

const output = {
  generated: new Date().toISOString(),
  count: endpoints.length,
  endpoints: endpoints.sort((a, b) => a.path.localeCompare(b.path)),
}

fs.writeFileSync("docs/_meta/inventory/api-endpoints.json", JSON.stringify(output, null, 2))

console.log(
  `Extracted ${endpoints.length} API endpoints to docs/_meta/inventory/api-endpoints.json`
)
