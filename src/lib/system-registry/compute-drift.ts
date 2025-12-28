/**
 * Compute Drift
 *
 * Compares observed components (from harvesters) against declared components (from registry).
 * Produces drift entries for:
 * - OBSERVED_NOT_DECLARED: Component exists in code but not in registry
 * - DECLARED_NOT_OBSERVED: Component is in registry but not found in code
 * - METADATA_GAP: Component is declared but missing required metadata
 *
 * This is the core of CI enforcement.
 */

import type {
  DriftEntry,
  SystemComponent,
  ObservedComponent,
  EnforcementRule,
  ComponentType,
  ComponentCriticality,
} from "./schema"
import {
  DEFAULT_ENFORCEMENT_RULES,
  CRITICAL_ROUTE_GROUPS,
  CRITICAL_JOBS,
  CRITICAL_QUEUES,
} from "./schema"

export interface DriftResult {
  observedNotDeclared: DriftEntry[]
  declaredNotObserved: DriftEntry[]
  metadataGaps: DriftEntry[]
  summary: {
    totalObserved: number
    totalDeclared: number
    observedNotDeclaredCount: number
    declaredNotObservedCount: number
    metadataGapCount: number
    criticalIssues: number
    highIssues: number
  }
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
      // Route groups with certain prefixes are higher risk
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
      return "MEDIUM" // Jobs are at least medium by default
    case "QUEUE":
      return "MEDIUM"
    case "WORKER":
      return "HIGH" // Workers are infrastructure
    case "INTEGRATION":
      return "HIGH" // Integrations are external dependencies
    case "STORE":
      return "CRITICAL" // Data stores are always critical
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
 * Computes drift between observed and declared components.
 */
export function computeDrift(
  observed: ObservedComponent[],
  declared: SystemComponent[]
): DriftResult {
  const observedIds = new Set(observed.map((c) => c.componentId))
  const declaredIds = new Set(declared.map((c) => c.componentId))
  const declaredMap = new Map(declared.map((c) => [c.componentId, c]))

  // Also check aliases
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

  // Find observed but not declared
  for (const obs of observed) {
    // Check if declared directly or via alias
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

  // Find declared but not observed
  for (const decl of declared) {
    // Check if observed directly or via any alias
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

    // Check required metadata based on criticality
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
      // Most components should have at least one dependency
      // Exception: STORE and UI which are often leaf nodes
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

  // Calculate summary
  const criticalIssues =
    observedNotDeclared.filter((d) => d.risk === "CRITICAL").length +
    declaredNotObserved.filter((d) => d.risk === "CRITICAL").length +
    metadataGaps.filter((d) => d.risk === "CRITICAL").length

  const highIssues =
    observedNotDeclared.filter((d) => d.risk === "HIGH").length +
    declaredNotObserved.filter((d) => d.risk === "HIGH").length +
    metadataGaps.filter((d) => d.risk === "HIGH").length

  return {
    observedNotDeclared,
    declaredNotObserved,
    metadataGaps,
    summary: {
      totalObserved: observed.length,
      totalDeclared: declared.length,
      observedNotDeclaredCount: observedNotDeclared.length,
      declaredNotObservedCount: declaredNotObserved.length,
      metadataGapCount: metadataGaps.length,
      criticalIssues,
      highIssues,
    },
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
  lines.push("")

  // Summary
  lines.push("## Summary")
  lines.push("")
  lines.push("| Metric | Count |")
  lines.push("|--------|-------|")
  lines.push(`| Observed Components | ${driftResult.summary.totalObserved} |`)
  lines.push(`| Declared Components | ${driftResult.summary.totalDeclared} |`)
  lines.push(
    `| Observed Not Declared | ${driftResult.summary.observedNotDeclaredCount} |`
  )
  lines.push(
    `| Declared Not Observed | ${driftResult.summary.declaredNotObservedCount} |`
  )
  lines.push(`| Metadata Gaps | ${driftResult.summary.metadataGapCount} |`)
  lines.push(`| Critical Issues | ${driftResult.summary.criticalIssues} |`)
  lines.push(`| High Issues | ${driftResult.summary.highIssues} |`)
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

  // Observed not declared
  if (driftResult.observedNotDeclared.length > 0) {
    lines.push("## Observed Not Declared")
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
    lines.push("## Declared Not Observed")
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
      lines.push(
        `| ${d.componentId} | ${d.type} | ${d.gaps?.join(", ") || ""} |`
      )
    }
    lines.push("")
  }

  return lines.join("\n")
}
