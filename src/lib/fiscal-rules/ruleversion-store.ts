// src/lib/fiscal-rules/ruleversion-store.ts
/**
 * RuleVersion Store - Compatibility Layer for RuleVersion Migration
 *
 * PR#10: Abstracts RuleVersion reads to support migration from core to regulatory DB.
 *
 * Modes:
 * - "core": Read from core DB (db.ruleVersion) - default before migration
 * - "regulatory": Read from regulatory DB (dbReg.ruleVersion) - after migration verified
 * - "dual": Read from both, compare hashes, log mismatches, return core - for parity testing
 *
 * Usage:
 * - All code should use this store for RuleVersion/RuleTable reads
 * - Writes still go to core until full cutover (separate concern)
 * - Set RULE_VERSION_SOURCE env var to control source
 *
 * Observability (dual mode):
 * - Structured logs with tableKey, version, hashes for mismatch debugging
 * - Counters for reads and mismatches (exported for metrics collection)
 */

import { db, dbReg } from "@/lib/db"
import { logger } from "@/lib/logger"
import type { RuleTableKey } from "./types"

// =============================================================================
// SOURCE CONFIGURATION
// =============================================================================

type RuleVersionSource = "core" | "regulatory" | "dual"

function getSource(): RuleVersionSource {
  const envSource = process.env.RULE_VERSION_SOURCE?.toLowerCase()
  if (envSource === "regulatory" || envSource === "dual") {
    return envSource
  }
  return "core"
}

// =============================================================================
// METRICS COUNTERS
// Exported for metrics collection (Prometheus, etc.)
// =============================================================================

interface DualModeMetrics {
  reads: {
    core: number
    regulatory: number
  }
  mismatches: {
    total: number
    byTableKey: Record<string, number>
    byField: Record<string, number>
  }
  missing: {
    inCore: number
    inRegulatory: number
  }
}

const metrics: DualModeMetrics = {
  reads: { core: 0, regulatory: 0 },
  mismatches: { total: 0, byTableKey: {}, byField: {} },
  missing: { inCore: 0, inRegulatory: 0 },
}

/**
 * Get current dual-mode metrics for monitoring.
 * Call this from a /metrics endpoint or health check.
 */
export function getDualModeMetrics(): Readonly<DualModeMetrics> {
  return { ...metrics }
}

/**
 * Reset metrics (for testing).
 */
export function resetDualModeMetrics(): void {
  metrics.reads.core = 0
  metrics.reads.regulatory = 0
  metrics.mismatches.total = 0
  metrics.mismatches.byTableKey = {}
  metrics.mismatches.byField = {}
  metrics.missing.inCore = 0
  metrics.missing.inRegulatory = 0
}

// =============================================================================
// TYPES
// =============================================================================

interface RuleVersionRecord {
  id: string
  tableId: string
  version: string
  effectiveFrom: Date
  effectiveUntil: Date | null
  data: unknown
  dataHash: string
  publishedAt: Date
  createdAt: Date
}

interface RuleVersionWithTable extends RuleVersionRecord {
  table: {
    id: string
    key: string
    name: string
    description: string | null
  }
}

interface RuleTableRecord {
  id: string
  key: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// MISMATCH LOGGING & COUNTING
// =============================================================================

interface MismatchContext {
  entity: "RuleTable" | "RuleVersion"
  tableKey?: string
  version?: string
  id?: string
  field: string
  coreValue: unknown
  regulatoryValue: unknown
}

/**
 * Log and count a parity mismatch in dual mode.
 */
function recordMismatch(ctx: MismatchContext): void {
  // Increment counters
  metrics.mismatches.total++

  if (ctx.tableKey) {
    metrics.mismatches.byTableKey[ctx.tableKey] =
      (metrics.mismatches.byTableKey[ctx.tableKey] || 0) + 1
  }

  metrics.mismatches.byField[ctx.field] = (metrics.mismatches.byField[ctx.field] || 0) + 1

  // Structured log for debugging and alerting
  logger.warn(
    {
      component: "RuleVersionStore",
      event: "parity_mismatch",
      entity: ctx.entity,
      tableKey: ctx.tableKey,
      version: ctx.version,
      id: ctx.id,
      field: ctx.field,
      coreValue: ctx.coreValue,
      regulatoryValue: ctx.regulatoryValue,
      mismatchTotal: metrics.mismatches.total,
    },
    `PARITY MISMATCH: ${ctx.entity}.${ctx.field} differs between core and regulatory`
  )
}

/**
 * Log when an entity exists in one source but not the other.
 */
function recordMissing(
  entity: "RuleTable" | "RuleVersion",
  identifier: string,
  presentIn: "core" | "regulatory"
): void {
  if (presentIn === "core") {
    metrics.missing.inRegulatory++
  } else {
    metrics.missing.inCore++
  }

  logger.warn(
    {
      component: "RuleVersionStore",
      event: "parity_missing",
      entity,
      identifier,
      presentIn,
      missingIn: presentIn === "core" ? "regulatory" : "core",
    },
    `PARITY MISSING: ${entity} ${identifier} exists in ${presentIn} but not ${presentIn === "core" ? "regulatory" : "core"}`
  )
}

/**
 * Increment read counter for a source.
 */
function countRead(source: "core" | "regulatory"): void {
  metrics.reads[source]++
}

// =============================================================================
// STORE FUNCTIONS
// =============================================================================

/**
 * Get RuleTable by natural key.
 */
export async function getRuleTableByKey(key: string): Promise<RuleTableRecord | null> {
  const source = getSource()

  if (source === "core") {
    countRead("core")
    return db.ruleTable.findUnique({ where: { key } })
  }

  if (source === "regulatory") {
    countRead("regulatory")
    return dbReg.ruleTable.findUnique({ where: { key } })
  }

  // Dual mode: read from both, compare, return core
  const [core, reg] = await Promise.all([
    db.ruleTable.findUnique({ where: { key } }),
    dbReg.ruleTable.findUnique({ where: { key } }),
  ])

  countRead("core")
  countRead("regulatory")

  if (core && reg) {
    // Compare key fields
    if (core.name !== reg.name) {
      recordMismatch({
        entity: "RuleTable",
        tableKey: key,
        field: "name",
        coreValue: core.name,
        regulatoryValue: reg.name,
      })
    }
    if (core.description !== reg.description) {
      recordMismatch({
        entity: "RuleTable",
        tableKey: key,
        field: "description",
        coreValue: core.description,
        regulatoryValue: reg.description,
      })
    }
  } else if (core && !reg) {
    recordMissing("RuleTable", key, "core")
  } else if (!core && reg) {
    recordMissing("RuleTable", key, "regulatory")
  }

  return core
}

/**
 * Get RuleVersion by ID.
 */
export async function getRuleVersionById(id: string): Promise<RuleVersionRecord | null> {
  const source = getSource()

  if (source === "core") {
    countRead("core")
    return db.ruleVersion.findUnique({ where: { id } })
  }

  if (source === "regulatory") {
    countRead("regulatory")
    return dbReg.ruleVersion.findUnique({ where: { id } })
  }

  // Dual mode
  const [core, reg] = await Promise.all([
    db.ruleVersion.findUnique({ where: { id } }),
    dbReg.ruleVersion.findUnique({ where: { id } }),
  ])

  countRead("core")
  countRead("regulatory")

  if (core && reg) {
    if (core.dataHash !== reg.dataHash) {
      recordMismatch({
        entity: "RuleVersion",
        id,
        version: core.version,
        field: "dataHash",
        coreValue: core.dataHash,
        regulatoryValue: reg.dataHash,
      })
    }
    if (core.effectiveFrom.getTime() !== reg.effectiveFrom.getTime()) {
      recordMismatch({
        entity: "RuleVersion",
        id,
        version: core.version,
        field: "effectiveFrom",
        coreValue: core.effectiveFrom.toISOString(),
        regulatoryValue: reg.effectiveFrom.toISOString(),
      })
    }
    if ((core.effectiveUntil?.getTime() ?? null) !== (reg.effectiveUntil?.getTime() ?? null)) {
      recordMismatch({
        entity: "RuleVersion",
        id,
        version: core.version,
        field: "effectiveUntil",
        coreValue: core.effectiveUntil?.toISOString() ?? null,
        regulatoryValue: reg.effectiveUntil?.toISOString() ?? null,
      })
    }
  } else if (core && !reg) {
    recordMissing("RuleVersion", id, "core")
  } else if (!core && reg) {
    recordMissing("RuleVersion", id, "regulatory")
  }

  return core
}

/**
 * Get RuleVersion by ID with table included.
 */
export async function getRuleVersionByIdWithTable(
  id: string
): Promise<RuleVersionWithTable | null> {
  const source = getSource()

  if (source === "core") {
    countRead("core")
    return db.ruleVersion.findUnique({
      where: { id },
      include: { table: true },
    })
  }

  if (source === "regulatory") {
    countRead("regulatory")
    return dbReg.ruleVersion.findUnique({
      where: { id },
      include: { table: true },
    })
  }

  // Dual mode
  const [core, reg] = await Promise.all([
    db.ruleVersion.findUnique({ where: { id }, include: { table: true } }),
    dbReg.ruleVersion.findUnique({ where: { id }, include: { table: true } }),
  ])

  countRead("core")
  countRead("regulatory")

  if (core && reg) {
    if (core.dataHash !== reg.dataHash) {
      recordMismatch({
        entity: "RuleVersion",
        id,
        tableKey: core.table.key,
        version: core.version,
        field: "dataHash",
        coreValue: core.dataHash,
        regulatoryValue: reg.dataHash,
      })
    }
    if (core.table.key !== reg.table.key) {
      recordMismatch({
        entity: "RuleVersion",
        id,
        version: core.version,
        field: "table.key",
        coreValue: core.table.key,
        regulatoryValue: reg.table.key,
      })
    }
  } else if (core && !reg) {
    recordMissing("RuleVersion", id, "core")
  } else if (!core && reg) {
    recordMissing("RuleVersion", id, "regulatory")
  }

  return core
}

/**
 * Get effective RuleVersion for a table key and reference date.
 * Returns the most recent version that is effective on the given date.
 */
export async function getEffectiveRuleVersion(
  tableKey: RuleTableKey,
  referenceDate: Date
): Promise<RuleVersionRecord | null> {
  const source = getSource()

  const whereClause = {
    table: { key: tableKey },
    effectiveFrom: { lte: referenceDate },
    OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: referenceDate } }],
  }

  const orderBy = { effectiveFrom: "desc" as const }

  if (source === "core") {
    countRead("core")
    return db.ruleVersion.findFirst({ where: whereClause, orderBy })
  }

  if (source === "regulatory") {
    countRead("regulatory")
    return dbReg.ruleVersion.findFirst({ where: whereClause, orderBy })
  }

  // Dual mode
  const [core, reg] = await Promise.all([
    db.ruleVersion.findFirst({ where: whereClause, orderBy }),
    dbReg.ruleVersion.findFirst({ where: whereClause, orderBy }),
  ])

  countRead("core")
  countRead("regulatory")

  if (core && reg) {
    // For effective queries, compare which version was selected AND data hash
    if (core.id !== reg.id) {
      recordMismatch({
        entity: "RuleVersion",
        tableKey,
        id: `effective@${referenceDate.toISOString()}`,
        field: "selectedVersionId",
        coreValue: core.id,
        regulatoryValue: reg.id,
      })
    }
    if (core.dataHash !== reg.dataHash) {
      recordMismatch({
        entity: "RuleVersion",
        tableKey,
        id: core.id,
        version: core.version,
        field: "dataHash",
        coreValue: core.dataHash,
        regulatoryValue: reg.dataHash,
      })
    }
  } else if (core && !reg) {
    recordMissing(
      "RuleVersion",
      `effective:${tableKey}@${referenceDate.toISOString()} (id=${core.id})`,
      "core"
    )
  } else if (!core && reg) {
    recordMissing(
      "RuleVersion",
      `effective:${tableKey}@${referenceDate.toISOString()} (id=${reg.id})`,
      "regulatory"
    )
  }

  return core
}

/**
 * Get current source mode for debugging/logging.
 */
export function getCurrentSource(): RuleVersionSource {
  return getSource()
}
