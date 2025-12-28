/**
 * Libraries Harvester
 *
 * Deterministically scans src/lib/ for library directories.
 * Discovery method: directory-exists
 *
 * A library is any directory under src/lib/ that:
 * - Contains at least one .ts file
 * - Is not excluded in governance.ts
 *
 * IMPORTANT: Exclusions are controlled by governance.ts, not hardcoded here.
 * Changes to exclusions require CODEOWNERS approval.
 */

import { existsSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"
import type { HarvesterResult, HarvesterError } from "./types"
import { createObservedComponent, toComponentId } from "./types"
import { getLibExclusions } from "../governance"

const LIB_ROOT = "src/lib"

interface LibInfo {
  name: string
  path: string
  fileCount: number
}

/**
 * Checks if a directory is a valid library.
 */
function isLibrary(dirPath: string): boolean {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    // Must have at least one .ts or .tsx file (not just index.ts)
    const tsFiles = entries.filter(
      (e) =>
        e.isFile() && (e.name.endsWith(".ts") || e.name.endsWith(".tsx"))
    )
    return tsFiles.length > 0
  } catch {
    return false
  }
}

/**
 * Counts TypeScript files in a directory.
 */
function countTsFiles(dirPath: string): number {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    let count = 0
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        count++
      } else if (entry.isDirectory() && !entry.name.startsWith("__")) {
        count += countTsFiles(join(dirPath, entry.name))
      }
    }
    return count
  } catch {
    return 0
  }
}

/**
 * Harvests all libraries from src/lib/.
 */
export async function harvestLibs(projectRoot: string): Promise<HarvesterResult> {
  const startTime = Date.now()
  const errors: HarvesterError[] = []
  const libs: LibInfo[] = []

  const libRoot = join(projectRoot, LIB_ROOT)

  if (!existsSync(libRoot)) {
    return {
      components: [],
      errors: [
        {
          path: libRoot,
          message: "lib root directory does not exist",
          recoverable: false,
        },
      ],
      metadata: {
        harvesterName: "harvest-libs",
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        scanPaths: [LIB_ROOT],
      },
    }
  }

  // Get exclusions from governance
  const excludedDirs = getLibExclusions()

  // Get top-level directories
  const entries = readdirSync(libRoot, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue
    if (excludedDirs.includes(entry.name)) continue

    const libPath = join(libRoot, entry.name)

    if (isLibrary(libPath)) {
      libs.push({
        name: entry.name,
        path: relative(projectRoot, libPath),
        fileCount: countTsFiles(libPath),
      })
    }
  }

  // Convert to ObservedComponents
  const components = libs.map((lib) =>
    createObservedComponent(
      toComponentId("LIB", lib.name),
      "LIB",
      `${lib.name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")} Library`,
      [lib.path],
      "directory-exists",
      {
        fileCount: lib.fileCount,
      }
    )
  )

  return {
    components,
    errors,
    metadata: {
      harvesterName: "harvest-libs",
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      scanPaths: [LIB_ROOT],
    },
  }
}

// CLI entry point
if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd()
  harvestLibs(projectRoot).then((result) => {
    console.log(JSON.stringify(result, null, 2))
  })
}
