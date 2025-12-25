#!/usr/bin/env npx tsx
/**
 * Documentation Integrity Checker
 *
 * CI guard against documentation duplication and drift.
 * Run: npx tsx scripts/check-docs.ts
 *
 * Checks:
 * 1. New .md files are in approved locations
 * 2. Deprecated files have proper deprecation notices
 * 3. No concept keywords appear in multiple canonical docs (basic heuristic)
 * 4. DOC-MAP.md and DOC-COVERAGE-MAP.md exist
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs"
import { join, relative } from "path"

const ROOT = process.cwd()

// Approved documentation locations
const APPROVED_LOCATIONS = [
  "docs/01_ARCHITECTURE",
  "docs/02_FEATURES",
  "docs/03_CODEMAP",
  "docs/04_OPERATIONS",
  "docs/05_REGULATORY",
  "docs/06_ROADMAP",
  "docs/07_AUDITS",
  "docs/_archive",
  "docs/_meta",
  "docs/_inventory",
  "docs/design",
  "docs/implementation-reports",
  "docs/infrastructure",
  "docs/plans",
  "docs/regulatory-truth",
  "docs/reports",
  "docs/research",
  "src", // Inline READMEs allowed
  "public", // Asset documentation allowed
]

// Files allowed at root level
const ALLOWED_ROOT_FILES = [
  "README.md",
  "CLAUDE.md",
  "FISCALIZATION.md",
  "MODAL_SYSTEM_USAGE.md",
  "TENANT_ISOLATION_TESTS.md",
]

// Files that should have deprecation notices
const DEPRECATED_FILES = [
  "AGENTS.md",
  "DASHBOARD_STRUCTURE.md",
  "README-FISCALIZATION.md",
  "NEXT_STEP_BANK_RECONCILIATION.md",
  "QUICK_START_BANK_RECONCILIATION.md",
  "QUICK_REFERENCE_DEPLOYMENT.md",
  "QUICK_START_MONITORING.md",
  "MONITORING_ENDPOINTS.md",
  "DESIGN_TEAM_README.md",
  "STATUS_AFTER_BARCODE.md",
  "GEMINI.md",
  "TASK_8_AI_FEEDBACK_INTEGRATION.md",
]

// Concept keywords that should only appear in one canonical doc
const CONCEPT_KEYWORDS = [
  "two-layer model",
  "evidence-backed",
  "fail-closed",
  "regulatory truth layer",
]

interface CheckResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

function findMarkdownFiles(dir: string, files: string[] = []): string[] {
  try {
    const items = readdirSync(dir)
    for (const item of items) {
      const fullPath = join(dir, item)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          if (!item.startsWith(".") && item !== "node_modules" && item !== ".next") {
            findMarkdownFiles(fullPath, files)
          }
        } else if (item.endsWith(".md")) {
          files.push(relative(ROOT, fullPath))
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return files
}

function isInApprovedLocation(file: string): boolean {
  // Root-level allowed files
  if (!file.includes("/") && ALLOWED_ROOT_FILES.includes(file)) {
    return true
  }

  // Check approved directories
  for (const loc of APPROVED_LOCATIONS) {
    if (file.startsWith(loc + "/") || file.startsWith(loc + "\\")) {
      return true
    }
  }

  // Also allow docs/ root for specific files
  if (file.startsWith("docs/") && !file.includes("/", 5)) {
    return true // Allow docs/*.md files
  }

  return false
}

function hasDeprecationNotice(file: string): boolean {
  try {
    const content = readFileSync(join(ROOT, file), "utf-8")
    return content.includes("# DEPRECATED") || content.includes("This document is obsolete")
  } catch {
    return false
  }
}

function checkDocumentation(): CheckResult {
  const result: CheckResult = {
    passed: true,
    errors: [],
    warnings: [],
  }

  // Check required files exist
  const requiredFiles = ["docs/DOC-MAP.md", "docs/DOC-COVERAGE-MAP.md", "README.md", "CLAUDE.md"]

  for (const file of requiredFiles) {
    if (!existsSync(join(ROOT, file))) {
      result.errors.push(`Missing required file: ${file}`)
      result.passed = false
    }
  }

  // Find all markdown files
  const allFiles = findMarkdownFiles(ROOT)

  // Check for files in unapproved locations
  for (const file of allFiles) {
    // Skip worktrees and archive
    if (file.includes(".worktrees") || file.includes("_archive")) continue

    // Skip deprecated files (they have notices)
    const basename = file.split("/").pop() || file
    if (DEPRECATED_FILES.includes(basename)) {
      // Verify deprecation notice exists
      if (!hasDeprecationNotice(file)) {
        result.warnings.push(`Deprecated file missing notice: ${file}`)
      }
      continue
    }

    // Check if in approved location
    if (!isInApprovedLocation(file)) {
      // If file has deprecation notice, it's properly deprecated - skip
      if (hasDeprecationNotice(file)) {
        continue
      }

      // Check if it's in legacy folders that should be deprecated
      if (
        file.startsWith("audit/") ||
        file.startsWith("docs/audit/") ||
        file.startsWith("docs/audits/") ||
        file.startsWith("docs/regulatory_truth/")
      ) {
        result.warnings.push(`Legacy file should have deprecation notice: ${file}`)
        continue
      }

      result.warnings.push(`File in unapproved location: ${file}`)
    }
  }

  // Check for concept duplication (basic heuristic)
  const canonicalDocs = allFiles.filter(
    (f) =>
      f.startsWith("docs/01_ARCHITECTURE") ||
      f.startsWith("docs/05_REGULATORY") ||
      f === "docs/PRODUCT_BIBLE.md"
  )

  for (const keyword of CONCEPT_KEYWORDS) {
    const filesWithKeyword: string[] = []

    for (const file of canonicalDocs) {
      try {
        const content = readFileSync(join(ROOT, file), "utf-8").toLowerCase()
        if (content.includes(keyword.toLowerCase())) {
          filesWithKeyword.push(file)
        }
      } catch {
        // Skip files we can't read
      }
    }

    // Allow up to 4 files to reference same concept (cross-references are expected)
    if (filesWithKeyword.length > 4) {
      result.warnings.push(
        `Concept "${keyword}" may be over-documented in ${filesWithKeyword.length} files: ${filesWithKeyword.slice(0, 3).join(", ")}...`
      )
    }
  }

  return result
}

// Main execution
console.log("📚 Documentation Integrity Check\n")
console.log("================================\n")

const result = checkDocumentation()

if (result.errors.length > 0) {
  console.log("❌ ERRORS:\n")
  for (const error of result.errors) {
    console.log(`  • ${error}`)
  }
  console.log()
}

if (result.warnings.length > 0) {
  console.log("⚠️  WARNINGS:\n")
  for (const warning of result.warnings) {
    console.log(`  • ${warning}`)
  }
  console.log()
}

if (result.passed && result.warnings.length === 0) {
  console.log("✅ All documentation checks passed!\n")
} else if (result.passed) {
  console.log(`✅ Passed with ${result.warnings.length} warnings\n`)
} else {
  console.log(`❌ Failed with ${result.errors.length} errors\n`)
  process.exit(1)
}
