# Evidence-Based Documentation System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a complete, evidence-backed documentation system for FiskAI with full feature registry and coverage tracking.

**Architecture:** Script-generated inventory → Agent-clustered features → Batch documentation with reviewer validation → Cross-linked dependency graph. Human review gates between each phase.

**Tech Stack:** TypeScript/Node scripts for inventory, JSON artifacts, Markdown documentation, Mermaid for diagrams.

**Design Document:** `docs/plans/2025-12-15-documentation-system-design.md`

---

## Phase A: Scaffold & Inventory Generation

### Task 1: Create Documentation Folder Structure

**Files:**

- Create: `docs/00_INDEX.md`
- Create: `docs/01_ARCHITECTURE/.gitkeep`
- Create: `docs/02_FEATURES/FEATURE_REGISTRY.md`
- Create: `docs/02_FEATURES/features/.gitkeep`
- Create: `docs/03_CODEMAP/.gitkeep`
- Create: `docs/04_OPERATIONS/.gitkeep`
- Create: `docs/_meta/inventory/.gitkeep`
- Create: `docs/_meta/coverage.md`
- Create: `docs/_meta/evidence-rules.md`
- Create: `docs/_meta/templates/feature.md`

**Step 1: Create folder structure**

```bash
mkdir -p docs/01_ARCHITECTURE
mkdir -p docs/02_FEATURES/features
mkdir -p docs/03_CODEMAP
mkdir -p docs/04_OPERATIONS
mkdir -p docs/_meta/inventory
mkdir -p docs/_meta/templates
```

**Step 2: Create 00_INDEX.md**

```markdown
# FiskAI Documentation

> Evidence-based documentation system. Every claim links to code.

## Navigation

- [Architecture](01_ARCHITECTURE/) - Tech stack, app structure, data flow
- [Features](02_FEATURES/FEATURE_REGISTRY.md) - Complete feature registry
- [Codemap](03_CODEMAP/) - Routes, components, APIs, database
- [Operations](04_OPERATIONS/) - Deployment, environment, runbooks

## Meta

- [Coverage Report](_meta/coverage.md) - Documentation completeness
- [Evidence Rules](_meta/evidence-rules.md) - Definition of Done
- [Inventory](_meta/inventory/) - Raw extracted artifacts

## Status

| Metric              | Value |
| ------------------- | ----- |
| Features Identified | TBD   |
| Features Documented | TBD   |
| Coverage            | TBD   |
```

**Step 3: Create evidence-rules.md**

```markdown
# Evidence Rules - Definition of Done

## Required for ✅ Complete Status

| Rule                | Check                                        | How to Verify                         |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| File exists         | `docs/02_FEATURES/features/{name}.md` exists | `ls docs/02_FEATURES/features/`       |
| Minimum size        | > 200 bytes                                  | `wc -c < file.md`                     |
| Has Purpose         | Section "## Purpose" exists                  | `grep "## Purpose" file.md`           |
| Has Entry Points    | Section "## User Entry Points" exists        | `grep "## User Entry Points" file.md` |
| Has Evidence Links  | Section "## Evidence Links" exists           | `grep "## Evidence Links" file.md`    |
| Evidence count      | ≥ 5 file:line references                     | Count backtick references with `:`    |
| Evidence valid      | All referenced files exist                   | Script checks each path               |
| Dependencies listed | Has "Depends on" with content OR "None"      | `grep "Depends on" file.md`           |
| Status marked       | Has status badge in header                   | `grep "Documentation:" file.md`       |

## Status Definitions

| Status      | Meaning                             |
| ----------- | ----------------------------------- |
| ❌ Stub     | Only name and entry point exist     |
| 🟡 Partial  | Has content but fails ≥1 rule above |
| ✅ Complete | Passes all rules, reviewer approved |

## Validation Script

Run: `node docs/_meta/scripts/validate-feature.js <feature-file.md>`

Returns: `PASS` or `FAIL: <specific rule that failed>`
```

**Step 4: Create feature template**

```markdown
# Feature: [NAME]

## Status

- Documentation: ❌ Stub
- Last verified: [DATE]
- Evidence count: 0

## Purpose

[1-2 sentences: what user problem does this solve?]

## User Entry Points

| Type | Path  | Evidence                  |
| ---- | ----- | ------------------------- |
| Page | /path | `src/app/path/page.tsx:1` |

## Core Flow

1. Step one → `[file:line]`
2. Step two → `[file:line]`

## Key Modules

| Module        | Purpose      | Location                 |
| ------------- | ------------ | ------------------------ |
| ComponentName | What it does | `src/path/Component.tsx` |

## Data

- **Tables**: `table_name` → `prisma/schema.prisma:LINE`
- **Key fields**: field1, field2

## Dependencies

- **Depends on**: [[feature-name]] or None
- **Depended by**: [[feature-name]] or None

## Integrations

- Integration name → `src/lib/integration/file.ts:LINE`

## Verification Checklist

- [ ] User can perform action 1
- [ ] User can perform action 2

## Evidence Links

1. `src/path/file.tsx:1-50`
2. `src/path/file2.ts:20-80`
3. ...
```

**Step 5: Create initial FEATURE_REGISTRY.md**

```markdown
# Feature Registry

> Central tracker for all FiskAI features. Updated by documentation agents.

**Last Updated:** TBD
**Total Features:** TBD
**Coverage:** TBD

## Registry

| ID  | Feature | Category | Status | Entry Point | Complexity | Doc |
| --- | ------- | -------- | ------ | ----------- | ---------- | --- |
|     |         |          |        |             |            |     |

_Registry will be populated by Feature Mapper agent in Phase B_

## Categories

Categories will be identified during feature discovery:

- Auth
- Dashboard
- Invoicing
- Payments
- Admin
- Reports
- Settings
- Integrations
- (more TBD)
```

**Step 6: Create initial coverage.md**

```markdown
# Documentation Coverage

**Last Updated:** TBD
**Generated By:** Coverage tracking script

## Summary

| Metric          | Value |
| --------------- | ----- |
| Total Features  | 0     |
| ✅ Complete     | 0     |
| 🟡 Partial      | 0     |
| ❌ Stub/Pending | 0     |
| Coverage %      | 0%    |

## By Category

| Category | Total | ✅  | 🟡  | ❌  |
| -------- | ----- | --- | --- | --- |
|          |       |     |     |     |

_Will be populated after feature discovery_

## Evidence Health

| Metric                 | Count |
| ---------------------- | ----- |
| Total evidence links   | 0     |
| Verified (file exists) | 0     |
| Broken (file missing)  | 0     |

## Pending Features

_None yet - awaiting feature discovery_

## Partial Features (Need Attention)

_None yet - awaiting documentation_
```

**Step 7: Commit scaffold**

```bash
git add docs/
git commit -m "docs: create documentation system scaffold

- Add folder structure for evidence-based docs
- Add evidence rules and feature template
- Add empty FEATURE_REGISTRY and coverage tracking
- Ready for inventory generation"
```

---

### Task 2: Create Inventory Extraction Scripts

**Files:**

- Create: `docs/_meta/scripts/extract-routes.ts`
- Create: `docs/_meta/scripts/extract-components.ts`
- Create: `docs/_meta/scripts/extract-api-endpoints.ts`
- Create: `docs/_meta/scripts/extract-actions.ts`
- Create: `docs/_meta/scripts/extract-db-schema.ts`
- Create: `docs/_meta/scripts/run-all-inventory.ts`

**Step 1: Create extract-routes.ts**

This script finds all page.tsx files and extracts route information.

```typescript
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
```

**Step 2: Create extract-api-endpoints.ts**

```typescript
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
```

**Step 3: Create extract-components.ts**

```typescript
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
```

**Step 4: Create extract-actions.ts**

```typescript
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
```

**Step 5: Create extract-db-schema.ts**

```typescript
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
```

**Step 6: Create run-all-inventory.ts**

```typescript
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
```

**Step 7: Commit inventory scripts**

```bash
git add docs/_meta/scripts/
git commit -m "docs: add inventory extraction scripts

- extract-routes.ts: finds all page.tsx routes
- extract-api-endpoints.ts: finds all API route handlers
- extract-components.ts: finds all React components
- extract-actions.ts: finds all server actions
- extract-db-schema.ts: parses Prisma schema
- run-all-inventory.ts: orchestrates all scripts"
```

---

### Task 3: Run Inventory Extraction

**Step 1: Install tsx if needed**

```bash
npm install -D tsx
```

**Step 2: Run inventory extraction**

```bash
npx tsx docs/_meta/scripts/run-all-inventory.ts
```

**Expected output:**

```
=== FiskAI Inventory Extraction ===

Running extract-routes.ts...
Extracted NN routes to docs/_meta/inventory/routes.json

Running extract-api-endpoints.ts...
Extracted NN API endpoints to docs/_meta/inventory/api-endpoints.json

...

=== Inventory Summary ===

routes.json: NN items
api-endpoints.json: NN items
components.json: NN items
actions.json: NN items
db-tables.json: NN items

Total inventory items: NNN
```

**Step 3: Verify inventory files exist**

```bash
ls -la docs/_meta/inventory/
```

**Step 4: Commit inventory artifacts**

```bash
git add docs/_meta/inventory/
git commit -m "docs: generate initial inventory artifacts

Routes: NN
API Endpoints: NN
Components: NN
Actions: NN
DB Models: NN"
```

**Step 5: HUMAN REVIEW CHECKPOINT**

Review the inventory JSON files:

- Are routes captured correctly?
- Are API endpoints found?
- Do component counts seem reasonable?
- Any obvious gaps?

---

## Phase B: Feature Discovery

### Task 4: Feature Mapper Agent

**Input:** All inventory JSON files in `docs/_meta/inventory/`

**Output:** Populated `docs/02_FEATURES/FEATURE_REGISTRY.md`

**Agent Instructions:**

```markdown
You are the Feature Mapper agent. Your job is to analyze inventory artifacts and cluster them into user-facing features.

## Input Files

Read all JSON files in docs/\_meta/inventory/:

- routes.json
- api-endpoints.json
- components.json
- actions.json
- db-tables.json

## Your Task

1. Analyze the inventory and identify distinct user-facing features
2. Group related routes, APIs, components, and data together
3. Create a feature entry for each distinct capability
4. Assign categories: Auth, Dashboard, Invoicing, Payments, Admin, Reports, Settings, Integrations, etc.
5. Estimate complexity: Low (1-2 files), Medium (3-5 files), High (6+ files)

## Output Format

Update docs/02_FEATURES/FEATURE_REGISTRY.md with:

| ID   | Feature           | Category | Status | Entry Point | Complexity | Doc |
| ---- | ----------------- | -------- | ------ | ----------- | ---------- | --- |
| F001 | User Login        | Auth     | ❌     | /login      | Low        | -   |
| F002 | User Registration | Auth     | ❌     | /register   | Medium     | -   |

...

## Rules

- Every route should map to at least one feature
- Features should be user-facing capabilities, not internal modules
- Use descriptive names: "Create Invoice" not "InvoiceForm"
- Mark all status as ❌ (not documented yet)
- Leave Doc column as "-" (will be linked later)
```

**Step 1: Run Feature Mapper agent**

Use Task tool with subagent_type=general-purpose to run the Feature Mapper.

**Step 2: HUMAN REVIEW CHECKPOINT**

Review FEATURE_REGISTRY.md:

- Are features logically grouped?
- Any missing features you know exist?
- Are categories sensible?
- Adjust feature names/groupings as needed

**Step 3: Commit feature registry**

```bash
git add docs/02_FEATURES/FEATURE_REGISTRY.md
git commit -m "docs: create initial feature registry

Features identified: NN
Categories: Auth, Dashboard, Invoicing, ..."
```

---

## Phase C: Batch Documentation

### Task 5-N: Document Features in Batches

For each batch of 5-10 features:

**Step 1: Select batch from FEATURE_REGISTRY**

Pick 5-10 features with status ❌, prioritizing by category or complexity.

**Step 2: Dispatch Feature Writer agents (parallel)**

For each feature in batch, dispatch a Feature Writer agent with:

```markdown
You are a Feature Writer agent. Document ONE feature with full evidence.

## Your Feature

Name: [FEATURE_NAME]
Entry Point: [ROUTE]
Category: [CATEGORY]

## Available Inventory

Read from docs/\_meta/inventory/:

- routes.json
- api-endpoints.json
- components.json
- actions.json
- db-tables.json

## Your Task

1. Find all code related to this feature
2. Read the actual source files to understand the implementation
3. Create docs/02_FEATURES/features/[feature-slug].md using the template
4. Include MINIMUM 5 evidence links with file:line references
5. Fill in all sections of the template

## Evidence Rules

- Every claim needs a file:line reference
- If you cannot find evidence, mark section as "UNVERIFIED - needs investigation"
- Verify files exist before citing them

## Template Location

docs/\_meta/templates/feature.md
```

**Step 3: Run Reviewer agent on each doc**

```markdown
You are the Reviewer agent. Validate a feature document against evidence rules.

## Document to Review

[PATH_TO_FEATURE_DOC]

## Evidence Rules (from docs/\_meta/evidence-rules.md)

1. File exists and > 200 bytes
2. Has sections: Purpose, User Entry Points, Evidence Links
3. Has ≥ 5 file:line references
4. All referenced files exist
5. Has Dependencies section (with content or "None")
6. Has Status badge

## Your Task

1. Check each rule
2. For evidence links, verify the files exist
3. Return PASS or FAIL with specific reasons

## Output Format

STATUS: PASS or FAIL
ISSUES:

- [List any failed rules]
  EVIDENCE_VERIFIED: N/M files exist
```

**Step 4: Retry failed docs once**

If Reviewer returns FAIL, send specific feedback to Feature Writer for one retry.

**Step 5: Update FEATURE_REGISTRY**

Change status from ❌ to ✅ or 🟡 based on Reviewer result.

**Step 6: HUMAN REVIEW CHECKPOINT**

Review batch:

- Spot check 2-3 docs for quality
- Verify evidence links manually on 1-2 docs
- Adjust process if systematic issues found

**Step 7: Commit batch**

```bash
git add docs/02_FEATURES/
git commit -m "docs: document features batch N

Features documented: [list]
Status: N complete, M partial"
```

**Step 8: Repeat for next batch**

---

## Phase D: Cross-Linking

### Task Final-1: Dependency Mapping

**After all features have docs (even stubs):**

**Agent Instructions:**

```markdown
You are the Dependency Mapper agent. Create cross-links between features.

## Your Task

1. Read all feature docs in docs/02_FEATURES/features/
2. For each feature:
   - Identify what other features it depends on (imports, API calls, shared data)
   - Identify what features depend on it
3. Update each feature doc's Dependencies section
4. Create docs/02_FEATURES/DEPENDENCY_GRAPH.md with Mermaid diagram

## Output

Update each feature's Dependencies section:

- **Depends on**: [[auth-session]], [[customers-list]]
- **Depended by**: [[payments-process]], [[reports-revenue]]

Create Mermaid flowchart in DEPENDENCY_GRAPH.md showing relationships.
```

---

### Task Final-2: Update Coverage Tracking

**Step 1: Create coverage update script**

```typescript
// docs/_meta/scripts/update-coverage.ts
// Scans all feature docs and updates coverage.md with current status
```

**Step 2: Run coverage update**

```bash
npx tsx docs/_meta/scripts/update-coverage.ts
```

**Step 3: Final commit**

```bash
git add docs/
git commit -m "docs: complete documentation system

Features: NN total
Complete: NN (XX%)
Partial: NN (XX%)
Pending: NN (XX%)"
```

---

## Execution Checkpoints

| Checkpoint       | Criteria                 | Human Action             |
| ---------------- | ------------------------ | ------------------------ |
| After Task 1     | Scaffold exists          | Verify folder structure  |
| After Task 3     | Inventory generated      | Review JSON accuracy     |
| After Task 4     | Feature registry created | Adjust feature groupings |
| After each batch | Batch documented         | Spot check quality       |
| After Final-1    | Dependencies mapped      | Verify graph accuracy    |
| After Final-2    | Coverage updated         | Final review             |

---

## Notes for Execution

- **Batch size:** Start with 5 features per batch, increase to 10 if quality is good
- **Parallel agents:** Feature Writers can run in parallel within a batch
- **Reviewer is sequential:** Run after all writers in batch complete
- **Human review is mandatory:** Don't skip checkpoints even if things look good
- **Evidence validation:** Periodically verify that file:line references actually exist
