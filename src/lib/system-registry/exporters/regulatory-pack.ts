/**
 * Regulatory Pack Exporter
 *
 * Exports registry data as a structured JSON package for regulatory compliance audits.
 */

import type { SystemComponent, CriticalPath, ComponentType, ComponentCriticality } from "../schema"

/**
 * Regulatory pack export options.
 */
export interface RegulatoryPackExportOptions {
  /** Include full component metadata */
  includeMetadata?: boolean
  /** Version string for the export */
  version?: string
}

/**
 * Regulatory pack structure.
 */
export interface RegulatoryPack {
  exportedAt: string
  version: string
  summary: {
    totalComponents: number
    criticalPathCount: number
    componentsByType: Record<string, number>
    componentsByCriticality: Record<string, number>
  }
  criticalPaths: Array<{
    pathId: string
    name: string
    reason: string
    sloTarget?: string
    components: string[]
  }>
  components: Array<{
    componentId: string
    type: ComponentType
    name: string
    status: string
    criticality: ComponentCriticality
    owner: string | null
    docsRef: string | null
    codeRef: string | null
    criticalPaths?: string[]
  }>
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

/**
 * Export to regulatory pack format.
 *
 * @param components - Components to export
 * @param criticalPaths - Critical paths to include
 * @param options - Export options
 * @returns JSON string
 */
export function exportRegulatoryPack(
  components: SystemComponent[],
  criticalPaths: CriticalPath[],
  options: RegulatoryPackExportOptions = {}
): string {
  const pack: RegulatoryPack = {
    exportedAt: new Date().toISOString(),
    version: options.version ?? "1.0",
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
      ? (components as RegulatoryPack["components"])
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
