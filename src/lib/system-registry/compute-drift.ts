/**
 * Compute Drift
 *
 * Compares observed components (from harvesters) against declared components (from registry).
 * Produces drift entries for:
 * - OBSERVED_NOT_DECLARED: Component exists in code but not in registry
 * - DECLARED_NOT_OBSERVED: Component is in registry but not found in code
 * - METADATA_GAP: Component is declared but missing required metadata
 * - CODEREF_MISSING: Declared codeRef path does not exist on disk
 *
 * This is the core of CI enforcement.
 */

import { existsSync, readdirSync } from "fs"
import { join } from "path"
import type {
  DriftEntry,
  SystemComponent,
  ObservedComponent,
  EnforcementRule,
  ComponentType,
  ComponentCriticality,
} from "./schema"
import {
  COMPONENT_TYPES,
  DEFAULT_ENFORCEMENT_RULES,
  CRITICAL_ROUTE_GROUPS,
  CRITICAL_JOBS,
  CRITICAL_QUEUES,
} from "./schema"

/**
 * Types that have full harvesters implemented.
 * All types now have harvesters - codeRef verification is a fallback.
 */
export const HARVESTED_TYPES: ComponentType[] = [
  "ROUTE_GROUP",
  "JOB",
  "WORKER",
  "QUEUE",
  "MODULE",
  "LIB",
  "STORE",
  "INTEGRATION",
  "UI",
]

/**
 * Types that don't have harvesters yet - require codeRef existence checks.
 * Currently empty - all types are now harvested.
 */
export const UNHARVESTED_TYPES: ComponentType[] = []

export interface TypeCoverage {
  type: ComponentType
  harvested: boolean
  declared: number
  observed: number
  codeRefVerified: number
  codeRefMissing: number
}

export interface DriftResult {
  observedNotDeclared: DriftEntry[]
  declaredNotObserved: DriftEntry[]
  metadataGaps: DriftEntry[]
  codeRefMissing: DriftEntry[]
  summary: {
    /** Components found by harvesters (harvested types only) */
    observedHarvested: number
    /** Total declared components in registry */
    declaredTotal: number
    /** Declared components in unharvested types */
    declaredUnharvested: number
    observedNotDeclaredCount: number
    declaredNotObservedCount: number
    metadataGapCount: number
    codeRefMissingCount: number
    criticalIssues: number
    highIssues: number
  }
  /** Type-by-type coverage matrix */
  typeCoverage: TypeCoverage[]
}

export interface EnforcementResult {
  passed: boolean
  failures: EnforcementFailure[]
  warnings: EnforcementFailure[]
}

export interface EnforcementFailure {
  componentId: string
  type: ComponentType
  rule: string
  message: string
}

/**
 * Infers criticality based on component ID and known critical lists.
 */
function inferCriticality(
  componentId: string,
  type: ComponentType
): ComponentCriticality {
  // Check against known critical lists
  if (CRITICAL_ROUTE_GROUPS.includes(componentId)) return "CRITICAL"
  if (CRITICAL_JOBS.includes(componentId)) return "CRITICAL"
  if (CRITICAL_QUEUES.includes(componentId)) return "CRITICAL"

  // Default criticality by type
  switch (type) {
    case "ROUTE_GROUP":
      if (
        componentId.includes("auth") ||
        componentId.includes("billing") ||
        componentId.includes("fiscal") ||
        componentId.includes("invoice")
      ) {
        return "HIGH"
      }
      return "MEDIUM"
    case "JOB":
      return "MEDIUM"
    case "QUEUE":
      return "MEDIUM"
    case "WORKER":
      return "HIGH"
    case "INTEGRATION":
      return "HIGH"
    case "STORE":
      return "CRITICAL"
    case "MODULE":
      return "MEDIUM"
    case "LIB":
      return "MEDIUM"
    case "UI":
      return "MEDIUM"
    default:
      return "LOW"
  }
}

/**
 * Verifies that a codeRef path exists on disk.
 * For directories, also checks that they're non-empty.
 */
function verifyCodeRef(projectRoot: string, codeRef: string): boolean {
  const fullPath = join(projectRoot, codeRef)

  if (!existsSync(fullPath)) {
    return false
  }

  // For directories, check they're not empty
  try {
    const entries = readdirSync(fullPath)
    // Filter out hidden files and common non-code files
    const codeFiles = entries.filter(
      (e) => !e.startsWith(".") && e !== "node_modules"
    )
    return codeFiles.length > 0
  } catch {
    // If it's a file (not a directory), it exists and that's enough
    return true
  }
}

/**
 * Computes drift between observed and declared components.
 */
export function computeDrift(
  observed: ObservedComponent[],
  declared: SystemComponent[],
  projectRoot: string = process.cwd()
): DriftResult {
  const observedIds = new Set(observed.map((c) => c.componentId))
  const declaredIds = new Set(declared.map((c) => c.componentId))
  const declaredMap = new Map(declared.map((c) => [c.componentId, c]))

  // Build alias resolution map
  const aliasMap = new Map<string, string>()
  for (const d of declared) {
    if (d.aliases) {
      for (const alias of d.aliases) {
        aliasMap.set(alias, d.componentId)
      }
    }
  }

  const observedNotDeclared: DriftEntry[] = []
  const declaredNotObserved: DriftEntry[] = []
  const metadataGaps: DriftEntry[] = []
  const codeRefMissing: DriftEntry[] = []

  // Track type coverage
  const typeStats = new Map<
    ComponentType,
    { declared: number; observed: number; codeRefVerified: number; codeRefMissing: number }
  >()
  for (const type of COMPONENT_TYPES) {
    typeStats.set(type, { declared: 0, observed: 0, codeRefVerified: 0, codeRefMissing: 0 })
  }

  // Count observed by type
  for (const obs of observed) {
    const stats = typeStats.get(obs.type)!
    stats.observed++
  }

  // Count declared by type and verify codeRefs for unharvested types
  for (const decl of declared) {
    const stats = typeStats.get(decl.type)!
    stats.declared++

    // For unharvested types, verify codeRef exists
    if (UNHARVESTED_TYPES.includes(decl.type) && decl.codeRef) {
      const exists = verifyCodeRef(projectRoot, decl.codeRef)
      if (exists) {
        stats.codeRefVerified++
      } else {
        stats.codeRefMissing++
        // Add to codeRefMissing list if CRITICAL or HIGH
        if (decl.criticality === "CRITICAL" || decl.criticality === "HIGH") {
          codeRefMissing.push({
            componentId: decl.componentId,
            type: decl.type,
            driftType: "DECLARED_NOT_OBSERVED",
            risk: decl.criticality,
            declaredSource: decl.codeRef,
            reason: `codeRef path does not exist: ${decl.codeRef}`,
          })
        }
      }
    }
  }

  // Find observed but not declared
  for (const obs of observed) {
    const resolvedId = aliasMap.get(obs.componentId) || obs.componentId
    if (!declaredIds.has(resolvedId)) {
      const criticality = inferCriticality(obs.componentId, obs.type)
      observedNotDeclared.push({
        componentId: obs.componentId,
        type: obs.type,
        driftType: "OBSERVED_NOT_DECLARED",
        risk: criticality,
        observedAt: obs.observedAt,
      })
    }
  }

  // Find declared but not observed (only for harvested types)
  for (const decl of declared) {
    // Only check harvested types for "not observed"
    if (!HARVESTED_TYPES.includes(decl.type)) continue

    let found = observedIds.has(decl.componentId)
    if (!found && decl.aliases) {
      found = decl.aliases.some((a) => observedIds.has(a))
    }

    if (!found) {
      declaredNotObserved.push({
        componentId: decl.componentId,
        type: decl.type,
        driftType: "DECLARED_NOT_OBSERVED",
        risk: decl.criticality,
        declaredSource: decl.codeRef || undefined,
      })
    }
  }

  // Find metadata gaps in declared components
  for (const decl of declared) {
    const gaps: DriftEntry["gaps"] = []

    if (!decl.owner) {
      if (decl.criticality === "CRITICAL" || decl.criticality === "HIGH") {
        gaps.push("NO_OWNER")
      }
    }

    if (!decl.docsRef) {
      if (decl.criticality === "CRITICAL") {
        gaps.push("NO_DOCS")
      }
    }

    if (!decl.codeRef) {
      if (decl.criticality === "CRITICAL" || decl.criticality === "HIGH") {
        gaps.push("NO_CODE_REF")
      }
    }

    if (decl.dependencies.length === 0) {
      if (decl.type !== "STORE" && decl.type !== "UI") {
        gaps.push("NO_DEPENDENCIES")
      }
    }

    if (gaps.length > 0) {
      metadataGaps.push({
        componentId: decl.componentId,
        type: decl.type,
        driftType: "METADATA_GAP",
        risk: decl.criticality,
        gaps,
      })
    }
  }

  // Sort all arrays for deterministic output
  const sortByComponentId = (a: DriftEntry, b: DriftEntry) =>
    a.componentId.localeCompare(b.componentId)
  observedNotDeclared.sort(sortByComponentId)
  declaredNotObserved.sort(sortByComponentId)
  metadataGaps.sort(sortByComponentId)
  codeRefMissing.sort(sortByComponentId)

  // Build type coverage matrix
  const typeCoverage: TypeCoverage[] = COMPONENT_TYPES.map((type) => {
    const stats = typeStats.get(type)!
    return {
      type,
      harvested: HARVESTED_TYPES.includes(type),
      declared: stats.declared,
      observed: stats.observed,
      codeRefVerified: stats.codeRefVerified,
      codeRefMissing: stats.codeRefMissing,
    }
  }).sort((a, b) => a.type.localeCompare(b.type))

  // Calculate summary
  const criticalIssues =
    observedNotDeclared.filter((d) => d.risk === "CRITICAL").length +
    declaredNotObserved.filter((d) => d.risk === "CRITICAL").length +
    metadataGaps.filter((d) => d.risk === "CRITICAL").length +
    codeRefMissing.filter((d) => d.risk === "CRITICAL").length

  const highIssues =
    observedNotDeclared.filter((d) => d.risk === "HIGH").length +
    declaredNotObserved.filter((d) => d.risk === "HIGH").length +
    metadataGaps.filter((d) => d.risk === "HIGH").length +
    codeRefMissing.filter((d) => d.risk === "HIGH").length

  const declaredUnharvested = declared.filter((d) =>
    UNHARVESTED_TYPES.includes(d.type)
  ).length

  return {
    observedNotDeclared,
    declaredNotObserved,
    metadataGaps,
    codeRefMissing,
    summary: {
      observedHarvested: observed.length,
      declaredTotal: declared.length,
      declaredUnharvested,
      observedNotDeclaredCount: observedNotDeclared.length,
      declaredNotObservedCount: declaredNotObserved.length,
      metadataGapCount: metadataGaps.length,
      codeRefMissingCount: codeRefMissing.length,
      criticalIssues,
      highIssues,
    },
    typeCoverage,
  }
}

/**
 * Enforces rules against drift results.
 * Returns pass/fail status for CI gates.
 */
export function enforceRules(
  driftResult: DriftResult,
  rules: EnforcementRule[] = DEFAULT_ENFORCEMENT_RULES
): EnforcementResult {
  const failures: EnforcementFailure[] = []
  const warnings: EnforcementFailure[] = []

  // Check OBSERVED_NOT_DECLARED against MUST_BE_DECLARED rules
  for (const drift of driftResult.observedNotDeclared) {
    for (const rule of rules) {
      if (rule.check !== "MUST_BE_DECLARED") continue
      if (!rule.types.includes(drift.type)) continue
      if (!rule.criticalities.includes(drift.risk)) continue

      const failure: EnforcementFailure = {
        componentId: drift.componentId,
        type: drift.type,
        rule: rule.description,
        message: `Component ${drift.componentId} must be declared in registry (${rule.description})`,
      }

      if (rule.action === "FAIL") {
        failures.push(failure)
      } else {
        warnings.push(failure)
      }
    }
  }

  // Check codeRef missing for CRITICAL/HIGH components
  for (const drift of driftResult.codeRefMissing) {
    if (drift.risk === "CRITICAL") {
      failures.push({
        componentId: drift.componentId,
        type: drift.type,
        rule: "CRITICAL components must have valid codeRef",
        message: `Component ${drift.componentId} has missing codeRef: ${drift.declaredSource}`,
      })
    } else if (drift.risk === "HIGH") {
      warnings.push({
        componentId: drift.componentId,
        type: drift.type,
        rule: "HIGH components should have valid codeRef",
        message: `Component ${drift.componentId} has missing codeRef: ${drift.declaredSource}`,
      })
    }
  }

  // Check metadata gaps against MUST_HAVE_OWNER and MUST_HAVE_DOCS rules
  for (const drift of driftResult.metadataGaps) {
    if (!drift.gaps) continue

    for (const rule of rules) {
      if (!rule.types.includes(drift.type)) continue
      if (!rule.criticalities.includes(drift.risk)) continue

      if (rule.check === "MUST_HAVE_OWNER" && drift.gaps.includes("NO_OWNER")) {
        const failure: EnforcementFailure = {
          componentId: drift.componentId,
          type: drift.type,
          rule: rule.description,
          message: `Component ${drift.componentId} must have an owner (${rule.description})`,
        }

        if (rule.action === "FAIL") {
          failures.push(failure)
        } else {
          warnings.push(failure)
        }
      }

      if (rule.check === "MUST_HAVE_DOCS" && drift.gaps.includes("NO_DOCS")) {
        const failure: EnforcementFailure = {
          componentId: drift.componentId,
          type: drift.type,
          rule: rule.description,
          message: `Component ${drift.componentId} must have documentation (${rule.description})`,
        }

        if (rule.action === "FAIL") {
          failures.push(failure)
        } else {
          warnings.push(failure)
        }
      }
    }
  }

  // Sort for deterministic output
  failures.sort((a, b) => a.componentId.localeCompare(b.componentId))
  warnings.sort((a, b) => a.componentId.localeCompare(b.componentId))

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  }
}

/**
 * Formats drift result as markdown for human consumption.
 */
export function formatDriftMarkdown(
  driftResult: DriftResult,
  enforcementResult?: EnforcementResult
): string {
  const lines: string[] = []

  lines.push("# System Registry Drift Report")
  lines.push("")
  lines.push(`> Generated: ${new Date().toISOString()}`)
  lines.push(`> Schema Version: 1.0.0`)
  lines.push("")

  // Summary with clarified metrics
  lines.push("## Summary")
  lines.push("")
  lines.push("| Metric | Count | Description |")
  lines.push("|--------|-------|-------------|")
  lines.push(
    `| Observed (Harvested) | ${driftResult.summary.observedHarvested} | Components found by harvesters |`
  )
  lines.push(
    `| Declared (Total) | ${driftResult.summary.declaredTotal} | Components in registry |`
  )
  lines.push(
    `| Declared (Unharvested Types) | ${driftResult.summary.declaredUnharvested} | UI/LIB/STORE/INTEGRATION (codeRef verified) |`
  )
  lines.push(
    `| Observed Not Declared | ${driftResult.summary.observedNotDeclaredCount} | Shadow systems |`
  )
  lines.push(
    `| Declared Not Observed | ${driftResult.summary.declaredNotObservedCount} | Possible rot (harvested types only) |`
  )
  lines.push(
    `| CodeRef Missing | ${driftResult.summary.codeRefMissingCount} | Declared paths that don't exist |`
  )
  lines.push(`| Metadata Gaps | ${driftResult.summary.metadataGapCount} | Missing owner/docs/deps |`)
  lines.push(`| Critical Issues | ${driftResult.summary.criticalIssues} | Requires immediate fix |`)
  lines.push(`| High Issues | ${driftResult.summary.highIssues} | Should fix soon |`)
  lines.push("")

  // Type Coverage Matrix
  lines.push("## Type Coverage Matrix")
  lines.push("")
  lines.push("| Type | Harvested | Declared | Observed | CodeRef OK | CodeRef Missing |")
  lines.push("|------|-----------|----------|----------|------------|-----------------|")
  for (const tc of driftResult.typeCoverage) {
    const harvested = tc.harvested ? "✅ Yes" : "❌ No"
    const observed = tc.harvested ? String(tc.observed) : "-"
    const codeRefOk = tc.harvested ? "-" : String(tc.codeRefVerified)
    const codeRefMissing = tc.harvested ? "-" : String(tc.codeRefMissing)
    lines.push(
      `| ${tc.type} | ${harvested} | ${tc.declared} | ${observed} | ${codeRefOk} | ${codeRefMissing} |`
    )
  }
  lines.push("")

  // Enforcement result
  if (enforcementResult) {
    lines.push("## Enforcement Status")
    lines.push("")
    lines.push(
      enforcementResult.passed
        ? "✅ **PASSED** - All enforcement rules satisfied"
        : "❌ **FAILED** - Enforcement rules violated"
    )
    lines.push("")

    if (enforcementResult.failures.length > 0) {
      lines.push("### Failures (Must Fix)")
      lines.push("")
      for (const f of enforcementResult.failures) {
        lines.push(`- **${f.componentId}** (${f.type}): ${f.message}`)
      }
      lines.push("")
    }

    if (enforcementResult.warnings.length > 0) {
      lines.push("### Warnings")
      lines.push("")
      for (const w of enforcementResult.warnings) {
        lines.push(`- **${w.componentId}** (${w.type}): ${w.message}`)
      }
      lines.push("")
    }
  }

  // CodeRef Missing (critical)
  if (driftResult.codeRefMissing.length > 0) {
    lines.push("## CodeRef Missing (Declared paths don't exist)")
    lines.push("")
    lines.push("| Component ID | Type | Risk | Missing Path |")
    lines.push("|--------------|------|------|--------------|")
    for (const d of driftResult.codeRefMissing) {
      lines.push(`| ${d.componentId} | ${d.type} | ${d.risk} | ${d.declaredSource} |`)
    }
    lines.push("")
  }

  // Observed not declared
  if (driftResult.observedNotDeclared.length > 0) {
    lines.push("## Observed Not Declared (Shadow Systems)")
    lines.push("")
    lines.push("| Component ID | Type | Risk |")
    lines.push("|--------------|------|------|")
    for (const d of driftResult.observedNotDeclared) {
      lines.push(`| ${d.componentId} | ${d.type} | ${d.risk} |`)
    }
    lines.push("")
  }

  // Declared not observed
  if (driftResult.declaredNotObserved.length > 0) {
    lines.push("## Declared Not Observed (Possible Rot)")
    lines.push("")
    lines.push("*Note: Only applies to harvested types (ROUTE_GROUP, JOB, WORKER, QUEUE, MODULE)*")
    lines.push("")
    lines.push("| Component ID | Type | Risk |")
    lines.push("|--------------|------|------|")
    for (const d of driftResult.declaredNotObserved) {
      lines.push(`| ${d.componentId} | ${d.type} | ${d.risk} |`)
    }
    lines.push("")
  }

  // Metadata gaps
  if (driftResult.metadataGaps.length > 0) {
    lines.push("## Metadata Gaps")
    lines.push("")
    lines.push("| Component ID | Type | Gaps |")
    lines.push("|--------------|------|------|")
    for (const d of driftResult.metadataGaps) {
      lines.push(`| ${d.componentId} | ${d.type} | ${d.gaps?.join(", ") || ""} |`)
    }
    lines.push("")
  }

  return lines.join("\n")
}
