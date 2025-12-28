#!/usr/bin/env npx tsx
/**
 * Export CLI Entry Point
 *
 * Command-line interface for exporting system registry data in various formats.
 *
 * Usage:
 *   npx tsx src/lib/system-registry/scripts/export.ts --format csv
 *   npx tsx src/lib/system-registry/scripts/export.ts --format regulatory-pack
 *   npx tsx src/lib/system-registry/scripts/export.ts --format drift-history --since 2025-01-01
 *   npx tsx src/lib/system-registry/scripts/export.ts --format csv --output ./exports/
 *
 * Arguments:
 *   --format (required): csv | regulatory-pack | drift-history
 *   --output (optional): Output directory (default: docs/system-registry/exports/)
 *   --since (optional): Date filter for drift-history (YYYY-MM-DD)
 *   --project-root (optional): Project root path
 *   --metadata (optional): Include additional metadata in export
 *   --json (optional): Output result as JSON
 */

import { join, isAbsolute } from "path"
import {
  exportRegistry,
  EXPORT_FORMATS,
  DEFAULT_OUTPUT_DIR,
  type ExportFormat,
  type ExportOptions,
} from "../export"

// =============================================================================
// TYPES
// =============================================================================

interface CliOptions {
  format: ExportFormat | null
  output: string | null
  since: Date | null
  projectRoot: string
  includeMetadata: boolean
  json: boolean
  help: boolean
}

// =============================================================================
// HELP TEXT
// =============================================================================

const HELP_TEXT = `
System Registry Export CLI

Exports registry data in various formats for external consumption.

USAGE:
  npx tsx src/lib/system-registry/scripts/export.ts --format <format> [options]

FORMATS:
  csv              Simple CSV export of all components
  regulatory-pack  Structured JSON export for regulatory compliance audits
  drift-history    Historical drift tracking over time

OPTIONS:
  --format <format>      Required. Export format (csv, regulatory-pack, drift-history)
  --output <path>        Output directory or file path
                         Default: ${DEFAULT_OUTPUT_DIR}/<format>-<timestamp>.<ext>
  --since <YYYY-MM-DD>   For drift-history: only include entries since this date
  --project-root <path>  Project root directory (default: current working directory)
  --metadata             Include additional metadata in export
  --json                 Output result as JSON instead of human-readable
  --help                 Show this help message

EXAMPLES:
  # Export all components to CSV
  npx tsx src/lib/system-registry/scripts/export.ts --format csv

  # Export regulatory pack to custom location
  npx tsx src/lib/system-registry/scripts/export.ts --format regulatory-pack --output ./reports/

  # Export drift history since a specific date
  npx tsx src/lib/system-registry/scripts/export.ts --format drift-history --since 2025-01-01

  # Export with full metadata
  npx tsx src/lib/system-registry/scripts/export.ts --format csv --metadata
`

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)

  const options: CliOptions = {
    format: null,
    output: null,
    since: null,
    projectRoot: process.cwd(),
    includeMetadata: false,
    json: false,
    help: false,
  }

  // Check for help flag first
  if (args.includes("--help") || args.includes("-h")) {
    options.help = true
    return options
  }

  // Parse --format
  const formatIndex = args.indexOf("--format")
  if (formatIndex !== -1 && args[formatIndex + 1]) {
    const formatValue = args[formatIndex + 1]
    if (EXPORT_FORMATS.includes(formatValue as ExportFormat)) {
      options.format = formatValue as ExportFormat
    } else {
      console.error(`Error: Invalid format "${formatValue}"`)
      console.error(`Valid formats: ${EXPORT_FORMATS.join(", ")}`)
      process.exit(1)
    }
  }

  // Parse --output
  const outputIndex = args.indexOf("--output")
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.output = args[outputIndex + 1]
  }

  // Parse --since
  const sinceIndex = args.indexOf("--since")
  if (sinceIndex !== -1 && args[sinceIndex + 1]) {
    const sinceValue = args[sinceIndex + 1]
    const parsedDate = new Date(sinceValue)
    if (isNaN(parsedDate.getTime())) {
      console.error(`Error: Invalid date format "${sinceValue}"`)
      console.error(`Expected format: YYYY-MM-DD (e.g., 2025-01-01)`)
      process.exit(1)
    }
    options.since = parsedDate
  }

  // Parse --project-root
  const projectRootIndex = args.indexOf("--project-root")
  if (projectRootIndex !== -1 && args[projectRootIndex + 1]) {
    options.projectRoot = args[projectRootIndex + 1]
  }

  // Parse boolean flags
  options.includeMetadata = args.includes("--metadata")
  options.json = args.includes("--json")

  return options
}

// =============================================================================
// OUTPUT PATH RESOLUTION
// =============================================================================

/**
 * Resolve the output path from CLI options.
 * If output is a directory, generate a filename within it.
 * If output is not provided, use the default.
 */
function resolveOutputPath(
  output: string | null,
  format: ExportFormat,
  projectRoot: string
): string | undefined {
  if (!output) {
    return undefined // Use default from exportRegistry
  }

  // Make path absolute if relative
  const absolutePath = isAbsolute(output) ? output : join(projectRoot, output)

  // Check if output looks like a directory (ends with / or has no extension for json/csv)
  const isLikelyDirectory = output.endsWith("/") || output.endsWith("\\")

  if (isLikelyDirectory) {
    // Generate filename within the directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const extension = format === "csv" ? "csv" : "json"
    return join(absolutePath, `${format}-${timestamp}.${extension}`)
  }

  return absolutePath
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const options = parseArgs()

  // Show help if requested
  if (options.help) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  // Validate required format argument
  if (!options.format) {
    console.error("Error: --format is required")
    console.error(`Valid formats: ${EXPORT_FORMATS.join(", ")}`)
    console.error("")
    console.error("Run with --help for usage information")
    process.exit(1)
  }

  // Warn if --since is used with non-drift-history format
  if (options.since && options.format !== "drift-history") {
    console.error(`Warning: --since option is only used with drift-history format`)
  }

  const startTime = Date.now()

  if (!options.json) {
    console.error("System Registry Export")
    console.error("======================")
    console.error("")
    console.error(`Format: ${options.format}`)
    console.error(`Project root: ${options.projectRoot}`)
    if (options.output) {
      console.error(`Output: ${options.output}`)
    }
    if (options.since) {
      console.error(`Since: ${options.since.toISOString().slice(0, 10)}`)
    }
    console.error(`Include metadata: ${options.includeMetadata}`)
    console.error("")
  }

  // Build export options
  const exportOptions: ExportOptions = {
    format: options.format,
    outputPath: resolveOutputPath(options.output, options.format, options.projectRoot),
    since: options.since ?? undefined,
    includeMetadata: options.includeMetadata,
  }

  try {
    if (!options.json) {
      console.error("Exporting registry data...")
    }

    const result = await exportRegistry(exportOptions)

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            format: result.format,
            path: result.path,
            recordCount: result.recordCount,
            generatedAt: result.generatedAt.toISOString(),
            durationMs: Date.now() - startTime,
          },
          null,
          2
        )
      )
    } else {
      console.error("")
      console.error(`Export completed successfully`)
      console.error(`  Format: ${result.format}`)
      console.error(`  Path: ${result.path}`)
      console.error(`  Records: ${result.recordCount}`)
      console.error(`  Generated at: ${result.generatedAt.toISOString()}`)
      console.error(`  Duration: ${Date.now() - startTime}ms`)
      console.error("")
      console.log(result.path) // Output path to stdout for scripting
    }

    process.exit(0)
  } catch (err) {
    const error = err as Error

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            success: false,
            error: error.message,
            durationMs: Date.now() - startTime,
          },
          null,
          2
        )
      )
    } else {
      console.error("")
      console.error(`Export failed: ${error.message}`)
    }

    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
