/**
 * CSV Exporter
 *
 * Exports registry components as a CSV file following RFC 4180.
 *
 * Output format (14 columns):
 * component_id,type,name,owner,criticality,codeRef,dependencies,healthCheck_endpoint,healthCheck_command,slo_availability,slo_latencyP99,alertChannel,runbook,last_verified
 */

import type { SystemComponent, CriticalPath } from "../schema"

/**
 * CSV export options.
 */
export interface CsvExportOptions {
  /** Custom delimiter (default: comma) */
  delimiter?: string
  /** Timestamp for last_verified field (default: current time) */
  lastVerified?: Date
}

/**
 * CSV column headers (14 total).
 */
const CSV_HEADERS = [
  "component_id",
  "type",
  "name",
  "owner",
  "criticality",
  "codeRef",
  "dependencies",
  "healthCheck_endpoint",
  "healthCheck_command",
  "slo_availability",
  "slo_latencyP99",
  "alertChannel",
  "runbook",
  "last_verified",
] as const

/**
 * Escape a CSV field value following RFC 4180.
 *
 * Rules:
 * - Fields containing delimiter, double-quote, or newline must be enclosed in double-quotes
 * - Double-quotes within a field must be escaped by preceding with another double-quote
 */
export function escapeCsvField(value: string, delimiter: string = ","): string {
  // Check if field needs quoting
  const needsQuoting =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")

  if (needsQuoting) {
    // Escape double-quotes by doubling them
    const escaped = value.replace(/"/g, '""')
    return `"${escaped}"`
  }

  return value
}

/**
 * Format dependencies as comma-separated list of component IDs.
 */
function formatDependencies(component: SystemComponent): string {
  if (!component.dependencies || component.dependencies.length === 0) {
    return ""
  }

  return component.dependencies.map((d) => d.componentId).join(",")
}

/**
 * Extract a value or return empty string if undefined/null.
 */
function safeString(value: string | null | undefined): string {
  return value ?? ""
}

/**
 * Convert a component to a CSV row (array of field values).
 */
function componentToCsvRow(component: SystemComponent, lastVerified: string): string[] {
  return [
    component.componentId,
    component.type,
    component.name,
    safeString(component.owner),
    component.criticality,
    safeString(component.codeRef),
    formatDependencies(component),
    safeString(component.healthCheck?.endpoint),
    safeString(component.healthCheck?.command),
    safeString(component.slo?.availability),
    safeString(component.slo?.latencyP99),
    safeString(component.alertChannel),
    safeString(component.runbook),
    lastVerified,
  ]
}

/**
 * Export components to CSV format.
 *
 * Output columns (14 total):
 * - component_id: Stable identifier
 * - type: Component type (UI, MODULE, LIB, etc.)
 * - name: Human-readable name
 * - owner: Owner identifier (empty if none)
 * - criticality: CRITICAL, HIGH, MEDIUM, LOW
 * - codeRef: Primary code location (empty if none)
 * - dependencies: Comma-separated list of dependency component IDs
 * - healthCheck_endpoint: HTTP health check path (empty if none)
 * - healthCheck_command: Shell health check command (empty if none)
 * - slo_availability: Availability target (empty if none)
 * - slo_latencyP99: P99 latency target (empty if none)
 * - alertChannel: Alert channel (empty if none)
 * - runbook: Runbook path (empty if none)
 * - last_verified: ISO 8601 timestamp of export
 *
 * @param components - Components to export
 * @param _criticalPaths - Critical paths (not used in CSV format)
 * @param options - Export options
 * @returns CSV string following RFC 4180
 */
export function exportCsv(
  components: SystemComponent[],
  _criticalPaths: CriticalPath[],
  options: CsvExportOptions = {}
): string {
  const delimiter = options.delimiter ?? ","
  const lastVerified = (options.lastVerified ?? new Date()).toISOString()

  // Build header row
  const headerRow = CSV_HEADERS.join(delimiter)

  // Build data rows
  const dataRows = components.map((component) => {
    const fields = componentToCsvRow(component, lastVerified)
    return fields.map((field) => escapeCsvField(field, delimiter)).join(delimiter)
  })

  // Combine header and data rows
  return [headerRow, ...dataRows].join("\n")
}

/**
 * Parse a CSV string back to an array of rows.
 * Useful for testing and validation.
 */
export function parseCsv(csv: string, delimiter: string = ","): string[][] {
  const rows: string[][] = []
  const lines = csv.split("\n")

  for (const line of lines) {
    if (line.trim() === "") continue

    const fields: string[] = []
    let currentField = ""
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (inQuotes) {
        if (char === '"') {
          // Check if this is an escaped quote
          if (i + 1 < line.length && line[i + 1] === '"') {
            currentField += '"'
            i += 2
            continue
          } else {
            // End of quoted field
            inQuotes = false
            i++
            continue
          }
        } else {
          currentField += char
          i++
        }
      } else {
        if (char === '"') {
          inQuotes = true
          i++
        } else if (char === delimiter) {
          fields.push(currentField)
          currentField = ""
          i++
        } else {
          currentField += char
          i++
        }
      }
    }

    // Push the last field
    fields.push(currentField)
    rows.push(fields)
  }

  return rows
}
