// src/lib/regulatory-truth/workers/startup-log.ts
// Worker startup logging for build drift detection

import { existsSync } from "fs"
import { resolve } from "path"

interface StartupInfo {
  workerName: string
  commitSha: string
  containerImage: string | null
  agentCodeExists: boolean
  nodeEnv: string
  startedAt: string
}

/**
 * Log worker startup info for build drift detection.
 * Called at worker initialization to verify correct deployment.
 */
export function logWorkerStartup(workerName: string): StartupInfo {
  const commitSha = process.env.COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "unknown"
  const containerImage = process.env.CONTAINER_IMAGE || process.env.COOLIFY_CONTAINER_NAME || null

  // Check if agent code exists in the expected location
  const agentPath = resolve(process.cwd(), "src/lib/regulatory-truth/agents")
  const agentCodeExists = existsSync(agentPath)

  const info: StartupInfo = {
    workerName,
    commitSha,
    containerImage,
    agentCodeExists,
    nodeEnv: process.env.NODE_ENV || "development",
    startedAt: new Date().toISOString(),
  }

  console.log("╔══════════════════════════════════════════════════════════════╗")
  console.log(`║ WORKER STARTUP: ${workerName.padEnd(43)} ║`)
  console.log("╠══════════════════════════════════════════════════════════════╣")
  console.log(`║ Commit SHA:      ${commitSha.substring(0, 40).padEnd(42)} ║`)
  console.log(`║ Container:       ${(containerImage || "N/A").substring(0, 40).padEnd(42)} ║`)
  console.log(`║ Agent Code:      ${(agentCodeExists ? "EXISTS ✓" : "MISSING ✗").padEnd(42)} ║`)
  console.log(`║ Node Env:        ${info.nodeEnv.padEnd(42)} ║`)
  console.log(`║ Started At:      ${info.startedAt.padEnd(42)} ║`)
  console.log("╚══════════════════════════════════════════════════════════════╝")

  if (!agentCodeExists) {
    console.error("[CRITICAL] Agent code not found at:", agentPath)
    console.error("[CRITICAL] Worker may not function correctly!")
  }

  return info
}
