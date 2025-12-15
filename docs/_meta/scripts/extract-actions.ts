// docs/_meta/scripts/extract-actions.ts
import * as fs from "fs"
import * as path from "path"

interface ActionInfo {
  name: string
  file: string
  line: number
}

function findActions(dir: string): ActionInfo[] {
  const actions: ActionInfo[] = []

  if (!fs.existsSync(dir)) return actions

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      actions.push(...findActions(fullPath))
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8")
      const lines = content.split("\n")

      // Check for 'use server' directive
      if (!content.includes("'use server'") && !content.includes('"use server"')) {
        continue
      }

      // Find exported async functions (server actions)
      lines.forEach((line, index) => {
        const match = line.match(/export\s+async\s+function\s+(\w+)/)
        if (match) {
          actions.push({
            name: match[1],
            file: fullPath.replace(process.cwd() + "/", ""),
            line: index + 1,
          })
        }
      })
    }
  }

  return actions
}

const actionsDir = path.join(process.cwd(), "src/app/actions")
const actions = findActions(actionsDir)

// Also check src/actions if it exists
const altActionsDir = path.join(process.cwd(), "src/actions")
if (fs.existsSync(altActionsDir)) {
  actions.push(...findActions(altActionsDir))
}

const output = {
  generated: new Date().toISOString(),
  count: actions.length,
  actions: actions.sort((a, b) => a.file.localeCompare(b.file)),
}

fs.writeFileSync("docs/_meta/inventory/actions.json", JSON.stringify(output, null, 2))

console.log(`Extracted ${actions.length} server actions to docs/_meta/inventory/actions.json`)
