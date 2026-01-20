#!/usr/bin/env npx tsx
/**
 * CI Guardrail: Repository Boundary Check
 *
 * Ensures FiskAI (app repo) does not contain worker-only files.
 *
 * FiskAI = app-only (Next.js app, API, queue producers)
 * fiskai-workers = workers-only (BullMQ workers, queue consumers)
 *
 * Worker runtime files belong in fiskai-workers, not here.
 */

import * as fs from "fs"
import * as path from "path"

interface Violation {
  file: string
  reason: string
  severity: "CRITICAL" | "WARNING"
}

const violations: Violation[] = []

// Files that should NOT exist in app repo (worker-only files)
const FORBIDDEN_PATTERNS = [
  // Worker entrypoint scripts (run-*.ts in regulatory-truth/scripts)
  // Note: We allow run-*.ts outside of regulatory-truth since those may be dev scripts
  {
    pattern: /^src\/lib\/regulatory-truth\/scripts\/run-[\w-]+\.ts$/,
    reason: "Worker entrypoint scripts belong in fiskai-workers repo",
    severity: "CRITICAL" as const,
    // Exceptions: scripts that are legitimate CLI tools, not worker entrypoints
    exceptions: [],
  },
  // Worker processor files (graph-rebuild-worker.ts, etc.)
  {
    pattern: /^src\/lib\/regulatory-truth\/[\w/]+[\w-]+-worker\.ts$/,
    reason: "Worker processor files belong in fiskai-workers repo",
    severity: "CRITICAL" as const,
    exceptions: [],
  },
]

// Directories that are worker-only and should not exist
const FORBIDDEN_DIRS = [
  // If we had a workers/ dir in src/, it would be forbidden
  // Currently not applicable
]

function checkFile(filePath: string): void {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/")

  for (const forbidden of FORBIDDEN_PATTERNS) {
    if (forbidden.pattern.test(relativePath)) {
      // Check exceptions
      const isException = forbidden.exceptions.some((exc) => relativePath.includes(exc))
      if (!isException) {
        violations.push({
          file: relativePath,
          reason: forbidden.reason,
          severity: forbidden.severity,
        })
      }
    }
  }
}

function walkDir(dir: string): void {
  if (!fs.existsSync(dir)) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip node_modules, dist, .git
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git" ||
      entry.name === ".next"
    ) {
      continue
    }

    if (entry.isDirectory()) {
      // Check if entire directory is forbidden
      const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/")
      if (FORBIDDEN_DIRS.some((fd) => relativePath === fd)) {
        violations.push({
          file: relativePath,
          reason: `Directory ${entry.name} should not exist in app repo`,
          severity: "CRITICAL",
        })
      } else {
        walkDir(fullPath)
      }
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      checkFile(fullPath)
    }
  }
}

// Check specifically under src/lib/regulatory-truth
const RTL_DIR = "src/lib/regulatory-truth"
if (fs.existsSync(RTL_DIR)) {
  walkDir(RTL_DIR)
}

// Report results
console.log("=== Repository Boundary Check ===")
console.log("")
console.log("This check ensures FiskAI (app repo) does not contain worker-only files.")
console.log("Worker runtime files belong in fiskai-workers repo.")
console.log("")

if (violations.length === 0) {
  console.log("✅ No boundary violations found.")
  process.exit(0)
}

const critical = violations.filter((v) => v.severity === "CRITICAL")
const warnings = violations.filter((v) => v.severity === "WARNING")

if (critical.length > 0) {
  console.log(`❌ Found ${critical.length} CRITICAL boundary violation(s):`)
  console.log("")
  for (const v of critical) {
    console.log(`  CRITICAL: ${v.file}`)
    console.log(`           ${v.reason}`)
    console.log("")
  }
}

if (warnings.length > 0) {
  console.log(`⚠️  Found ${warnings.length} WARNING(s):`)
  console.log("")
  for (const v of warnings) {
    console.log(`  WARNING: ${v.file}`)
    console.log(`          ${v.reason}`)
    console.log("")
  }
}

console.log("---")
console.log("To fix: Move worker-only files to fiskai-workers repo.")
console.log("See: docs/audits/rtl2-build-inventory.md for repo split details.")

// Exit with error only for CRITICAL violations
if (critical.length > 0) {
  process.exit(1)
}

process.exit(0)
