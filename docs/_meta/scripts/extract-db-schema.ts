// docs/_meta/scripts/extract-db-schema.ts
import * as fs from "fs"
import * as path from "path"

interface ModelInfo {
  name: string
  line: number
  fields: { name: string; type: string; line: number }[]
  relations: string[]
}

function parseSchema(schemaPath: string): ModelInfo[] {
  if (!fs.existsSync(schemaPath)) {
    console.log("No prisma schema found at", schemaPath)
    return []
  }

  const content = fs.readFileSync(schemaPath, "utf-8")
  const lines = content.split("\n")
  const models: ModelInfo[] = []

  let currentModel: ModelInfo | null = null
  let braceDepth = 0

  lines.forEach((line, index) => {
    const lineNum = index + 1
    const trimmed = line.trim()

    // Start of model
    const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/)
    if (modelMatch) {
      currentModel = {
        name: modelMatch[1],
        line: lineNum,
        fields: [],
        relations: [],
      }
      braceDepth = 1
      return
    }

    if (currentModel) {
      if (trimmed.includes("{")) braceDepth++
      if (trimmed.includes("}")) braceDepth--

      if (braceDepth === 0) {
        models.push(currentModel)
        currentModel = null
        return
      }

      // Parse field
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?\s*/)
      if (fieldMatch && !trimmed.startsWith("//") && !trimmed.startsWith("@@")) {
        const fieldName = fieldMatch[1]
        const fieldType = fieldMatch[2] + (fieldMatch[3] || "")

        currentModel.fields.push({
          name: fieldName,
          type: fieldType,
          line: lineNum,
        })

        // Check for relation
        if (trimmed.includes("@relation")) {
          currentModel.relations.push(fieldType.replace("[]", ""))
        }
      }
    }
  })

  return models
}

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma")
const models = parseSchema(schemaPath)

const output = {
  generated: new Date().toISOString(),
  schemaFile: "prisma/schema.prisma",
  count: models.length,
  models: models.sort((a, b) => a.name.localeCompare(b.name)),
}

fs.writeFileSync("docs/_meta/inventory/db-tables.json", JSON.stringify(output, null, 2))

console.log(`Extracted ${models.length} database models to docs/_meta/inventory/db-tables.json`)
