/**
 * CSV Exporter
 *
 * Exports registry components as a CSV file.
 */

import type { SystemComponent, CriticalPath } from "../schema"

/**
 * CSV export options.
 */
export interface CsvExportOptions {
  /** Include additional metadata columns */
  includeMetadata?: boolean
  /** Custom delimiter (default: comma) */
  delimiter?: string
}

/**
 * Escape a CSV field value.
 */
function escapeCsvField(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Export components to CSV format.
 *
 * @param components - Components to export
 * @param _criticalPaths - Critical paths (not used in CSV format)
 * @param options - Export options
 * @returns CSV string
 */
export function exportCsv(
  components: SystemComponent[],
  _criticalPaths: CriticalPath[],
  options: CsvExportOptions = {}
): string {
  const delimiter = options.delimiter ?? ","
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
    headers.push("dependencies", "criticalPaths", "aliases", "healthCheck", "slo", "alertChannel")
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
        c.aliases?.join(";") ?? "",
        c.healthCheck ? JSON.stringify(c.healthCheck) : "",
        c.slo ? JSON.stringify(c.slo) : "",
        c.alertChannel ?? ""
      )
    }

    return row.map((v) => escapeCsvField(v, delimiter)).join(delimiter)
  })

  return [headers.join(delimiter), ...rows].join("\n")
}
