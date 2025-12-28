/**
 * System Registry Export Module
 *
 * Exports registry data in various formats for external consumption.
 *
 * Supported formats:
 * - csv: Simple CSV export of all components
 * - regulatory-pack: Structured export for regulatory compliance audits
 * - drift-history: Historical drift tracking over time
 */

import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join, dirname } from "path"

import type { SystemComponent, CriticalPath } from "./schema"
import { ALL_COMPONENTS, CRITICAL_PATHS } from "./declarations"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported export formats.
 */
export type ExportFormat = "csv" | "regulatory-pack" | "drift-history"

/**
 * All valid export format values.
 */
export const EXPORT_FORMATS: ExportFormat[] = ["csv", "regulatory-pack", "drift-history"]

/**
 * Options for the export operation.
 */
export interface ExportOptions {
  /** The format to export in */
  format: ExportFormat
  /** Output path for the export file. Defaults to docs/system-registry/exports/ */
  outputPath?: string
  /** For drift-history: only include entries since this date */
  since?: Date
  /** Include additional metadata in the export */
  includeMetadata?: boolean
}

/**
 * Result of an export operation.
 */
export interface ExportResult {
  /** The format that was exported */
  format: ExportFormat
  /** The path where the export was written */
  path: string
  /** Number of records exported */
  recordCount: number
  /** When the export was generated */
  generatedAt: Date
}

/**
 * Handler function signature for format-specific exporters.
 */
export type FormatHandler = (
  components: SystemComponent[],
  criticalPaths: CriticalPath[],
  options: ExportOptions
) => string

// =============================================================================
// DEFAULT OUTPUT PATH
// =============================================================================

/**
 * Default output directory for exports.
 */
export const DEFAULT_OUTPUT_DIR = "docs/system-registry/exports"

/**
 * Get the default output path for a given format.
 */
export function getDefaultOutputPath(format: ExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const extension = format === "csv" ? "csv" : "json"
  return join(DEFAULT_OUTPUT_DIR, `${format}-${timestamp}.${extension}`)
}

// =============================================================================
// FORMAT HANDLERS
// =============================================================================

/**
 * Export to CSV format.
 * Includes all component fields as columns.
 */
function exportCsv(
  components: SystemComponent[],
  _criticalPaths: CriticalPath[],
  options: ExportOptions
): string {
  const headers = [
    "componentId",
    "type",
    "name",
    "status",
    "criticality",
    "owner",
    "docsRef",
    "codeRef",
  ]

  if (options.includeMetadata) {
    headers.push("dependencies", "criticalPaths", "aliases")
  }

  const rows = components.map((c) => {
    const row = [
      c.componentId,
      c.type,
      c.name,
      c.status,
      c.criticality,
      c.owner ?? "",
      c.docsRef ?? "",
      c.codeRef ?? "",
    ]

    if (options.includeMetadata) {
      row.push(
        c.dependencies.map((d) => `${d.componentId}:${d.type}`).join(";"),
        c.criticalPaths?.join(";") ?? "",
        c.aliases?.join(";") ?? ""
      )
    }

    return row.map(escapeCsvField).join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

/**
 * Escape a CSV field value.
 */
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Export to regulatory pack format.
 * Structured JSON for compliance audits.
 */
function exportRegulatoryPack(
  components: SystemComponent[],
  criticalPaths: CriticalPath[],
  options: ExportOptions
): string {
  const pack = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    summary: {
      totalComponents: components.length,
      criticalPathCount: criticalPaths.length,
      componentsByType: countByType(components),
      componentsByCriticality: countByCriticality(components),
    },
    criticalPaths: criticalPaths.map((p) => ({
      pathId: p.pathId,
      name: p.name,
      reason: p.reason,
      sloTarget: p.sloTarget,
      components: p.components,
    })),
    components: options.includeMetadata
      ? components
      : components.map((c) => ({
          componentId: c.componentId,
          type: c.type,
          name: c.name,
          status: c.status,
          criticality: c.criticality,
          owner: c.owner,
          docsRef: c.docsRef,
          codeRef: c.codeRef,
          criticalPaths: c.criticalPaths,
        })),
  }

  return JSON.stringify(pack, null, 2)
}

/**
 * Export drift history format.
 * Placeholder - will be implemented when drift tracking is added.
 */
function exportDriftHistory(
  components: SystemComponent[],
  _criticalPaths: CriticalPath[],
  options: ExportOptions
): string {
  // Placeholder implementation
  // In the future, this will read from a drift history store
  const history = {
    exportedAt: new Date().toISOString(),
    since: options.since?.toISOString() ?? null,
    version: "1.0",
    note: "Drift history tracking not yet implemented",
    currentSnapshot: {
      componentCount: components.length,
      timestamp: new Date().toISOString(),
    },
    entries: [] as unknown[],
  }

  return JSON.stringify(history, null, 2)
}

/**
 * Count components by type.
 */
function countByType(components: SystemComponent[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of components) {
    counts[c.type] = (counts[c.type] ?? 0) + 1
  }
  return counts
}

/**
 * Count components by criticality.
 */
function countByCriticality(components: SystemComponent[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of components) {
    counts[c.criticality] = (counts[c.criticality] ?? 0) + 1
  }
  return counts
}

// =============================================================================
// FORMAT HANDLER REGISTRY
// =============================================================================

const FORMAT_HANDLERS: Record<ExportFormat, FormatHandler> = {
  csv: exportCsv,
  "regulatory-pack": exportRegulatoryPack,
  "drift-history": exportDriftHistory,
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Export the system registry in the specified format.
 *
 * @param options - Export options including format and output path
 * @returns Export result with metadata
 *
 * @example
 * ```typescript
 * // Export to CSV with default path
 * const result = await exportRegistry({ format: "csv" })
 *
 * // Export regulatory pack with metadata
 * const result = await exportRegistry({
 *   format: "regulatory-pack",
 *   outputPath: "reports/audit-2024.json",
 *   includeMetadata: true,
 * })
 * ```
 */
export async function exportRegistry(options: ExportOptions): Promise<ExportResult> {
  // Validate format
  if (!EXPORT_FORMATS.includes(options.format)) {
    throw new Error(`Unknown export format: ${options.format}. Valid formats: ${EXPORT_FORMATS.join(", ")}`)
  }

  // Load declarations
  const components = ALL_COMPONENTS
  const criticalPaths = CRITICAL_PATHS

  // Get handler for format
  const handler = FORMAT_HANDLERS[options.format]

  // Generate export content
  const content = handler(components, criticalPaths, options)

  // Determine output path
  const outputPath = options.outputPath ?? getDefaultOutputPath(options.format)

  // Ensure output directory exists
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Write export file
  writeFileSync(outputPath, content, "utf-8")

  // Return result
  return {
    format: options.format,
    path: outputPath,
    recordCount: components.length,
    generatedAt: new Date(),
  }
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

if (require.main === module) {
  const format = (process.argv[2] as ExportFormat) || "csv"
  const outputPath = process.argv[3]

  exportRegistry({
    format,
    outputPath,
    includeMetadata: process.argv.includes("--metadata"),
  })
    .then((result) => {
      console.log(`Exported ${result.recordCount} components to ${result.path}`)
    })
    .catch((err) => {
      console.error("Export failed:", err.message)
      process.exit(1)
    })
}
