/**
 * Queues Harvester
 *
 * Deterministically scans for BullMQ queue definitions.
 * Discovery method: code-reference
 *
 * Scans for:
 * - Queue instantiations (new Queue())
 * - Queue name constants
 * - Export statements with "Queue" in name
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"
import type { HarvesterResult, HarvesterError } from "./types"
import { createObservedComponent, toComponentId } from "./types"

// Known queue definition files
const QUEUE_FILES = [
  "src/lib/regulatory-truth/workers/queues.ts",
  "src/lib/queues/index.ts",
  "src/lib/queues.ts",
]

// Regex patterns for queue detection
const QUEUE_PATTERNS = [
  // new Queue("name", ...)
  /new\s+Queue\s*\(\s*["']([^"']+)["']/g,
  // export const NAME_QUEUE = "name"
  /export\s+const\s+(\w+QUEUE\w*)\s*=\s*["']([^"']+)["']/gi,
  // Queue name from QUEUES object
  /(\w+):\s*["']([^"']+)["']/g,
]

interface QueueInfo {
  name: string
  path: string
  constName?: string
}

/**
 * Validates that a queue name is a real queue name, not a variable or placeholder.
 */
function isValidQueueName(name: string): boolean {
  // Filter out obvious non-queue names
  if (!name || name.length < 2) return false
  if (name === "name" || name === "...") return false
  if (name.startsWith("$")) return false
  // Queue names should be simple lowercase identifiers
  return /^[a-z][a-z0-9-]*$/.test(name)
}

/**
 * Extracts queue names from a TypeScript file.
 */
function extractQueues(filePath: string, projectRoot: string): QueueInfo[] {
  const queues: QueueInfo[] = []
  const seen = new Set<string>()

  if (!existsSync(filePath)) {
    return queues
  }

  const content = readFileSync(filePath, "utf-8")
  const relativePath = relative(projectRoot, filePath)

  // Pattern 1: createQueue("name", ...) - factory pattern
  const createQueuePattern = /createQueue\s*\(\s*["']([^"']+)["']/g
  let match
  while ((match = createQueuePattern.exec(content)) !== null) {
    const name = match[1]
    if (!seen.has(name) && isValidQueueName(name)) {
      seen.add(name)
      queues.push({ name, path: relativePath })
    }
  }

  // Pattern 2: new Queue("name", ...)
  const newQueuePattern = /new\s+Queue\s*\(\s*["']([^"']+)["']/g
  while ((match = newQueuePattern.exec(content)) !== null) {
    const name = match[1]
    if (!seen.has(name) && isValidQueueName(name)) {
      seen.add(name)
      queues.push({ name, path: relativePath })
    }
  }

  // Pattern 3: QUEUES = { sentinel: "sentinel", ... }
  const queuesObjectMatch = content.match(/QUEUES\s*=\s*\{([\s\S]*?)\}/)
  if (queuesObjectMatch) {
    const objectContent = queuesObjectMatch[1]
    const entryPattern = /(\w+):\s*["']([^"']+)["']/g
    while ((match = entryPattern.exec(objectContent)) !== null) {
      const name = match[2]
      if (!seen.has(name) && isValidQueueName(name)) {
        seen.add(name)
        queues.push({ name, path: relativePath, constName: match[1] })
      }
    }
  }

  // Pattern 4: export const QUEUE_NAME = "..."
  const exportPattern = /export\s+const\s+(\w+)\s*=\s*["']([^"']+)["']/g
  while ((match = exportPattern.exec(content)) !== null) {
    if (match[1].toLowerCase().includes("queue")) {
      const name = match[2]
      if (!seen.has(name) && isValidQueueName(name)) {
        seen.add(name)
        queues.push({ name, path: relativePath, constName: match[1] })
      }
    }
  }

  return queues
}

/**
 * Recursively searches for queue definitions in a directory.
 */
function searchForQueues(
  dirPath: string,
  projectRoot: string
): QueueInfo[] {
  const queues: QueueInfo[] = []

  if (!existsSync(dirPath)) {
    return queues
  }

  const entries = readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        queues.push(...searchForQueues(fullPath, projectRoot))
      }
    } else if (
      entry.name.includes("queue") &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      queues.push(...extractQueues(fullPath, projectRoot))
    }
  }

  return queues
}

/**
 * Harvests all queues from known queue definition files.
 */
export async function harvestQueues(projectRoot: string): Promise<HarvesterResult> {
  const startTime = Date.now()
  const errors: HarvesterError[] = []
  const allQueues: QueueInfo[] = []
  const seen = new Set<string>()
  const scannedPaths: string[] = []

  // First, check known queue files
  for (const queueFile of QUEUE_FILES) {
    const fullPath = join(projectRoot, queueFile)
    if (existsSync(fullPath)) {
      scannedPaths.push(queueFile)
      const queues = extractQueues(fullPath, projectRoot)
      for (const q of queues) {
        if (!seen.has(q.name)) {
          seen.add(q.name)
          allQueues.push(q)
        }
      }
    }
  }

  // If no queues found in known files, search src/lib
  if (allQueues.length === 0) {
    const libPath = join(projectRoot, "src/lib")
    if (existsSync(libPath)) {
      scannedPaths.push("src/lib")
      const queues = searchForQueues(libPath, projectRoot)
      for (const q of queues) {
        if (!seen.has(q.name)) {
          seen.add(q.name)
          allQueues.push(q)
        }
      }
    }
  }

  // Convert to ObservedComponents
  const components = allQueues.map((queue) =>
    createObservedComponent(
      toComponentId("QUEUE", queue.name),
      "QUEUE",
      `${queue.name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")} Queue`,
      [queue.path],
      "code-reference",
      queue.constName ? { constName: queue.constName } : undefined
    )
  )

  return {
    components,
    errors,
    metadata: {
      harvesterName: "harvest-queues",
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      scanPaths: scannedPaths,
    },
  }
}

// CLI entry point
if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd()
  harvestQueues(projectRoot).then((result) => {
    console.log(JSON.stringify(result, null, 2))
  })
}
