// docs/_meta/scripts/extract-components.ts
import * as fs from "fs"
import * as path from "path"

interface ComponentInfo {
  name: string
  file: string
  directory: string
  exports: string[]
}

function extractExports(content: string): string[] {
  const exports: string[] = []

  // Named exports: export function/const/class Name
  const namedExportRegex = /export\s+(?:async\s+)?(?:function|const|class|let)\s+(\w+)/g
  let match
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1])
  }

  // Default exports with name: export default function Name
  const defaultNamedRegex = /export\s+default\s+(?:async\s+)?(?:function|class)\s+(\w+)/g
  while ((match = defaultNamedRegex.exec(content)) !== null) {
    exports.push(match[1] + " (default)")
  }

  // Simple default export
  if (
    /export\s+default\s+/.test(content) &&
    exports.filter((e) => e.includes("default")).length === 0
  ) {
    exports.push("default")
  }

  return exports
}

function findComponents(dir: string): ComponentInfo[] {
  const components: ComponentInfo[] = []

  if (!fs.existsSync(dir)) return components

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      components.push(...findComponents(fullPath))
    } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8")
      const exports = extractExports(content)

      if (exports.length > 0) {
        components.push({
          name: entry.name.replace(".tsx", ""),
          file: fullPath.replace(process.cwd() + "/", ""),
          directory: path.dirname(fullPath).replace(process.cwd() + "/", ""),
          exports,
        })
      }
    }
  }

  return components
}

const componentsDir = path.join(process.cwd(), "src/components")
const components = findComponents(componentsDir)

const output = {
  generated: new Date().toISOString(),
  count: components.length,
  components: components.sort((a, b) => a.file.localeCompare(b.file)),
}

fs.writeFileSync("docs/_meta/inventory/components.json", JSON.stringify(output, null, 2))

console.log(`Extracted ${components.length} components to docs/_meta/inventory/components.json`)
