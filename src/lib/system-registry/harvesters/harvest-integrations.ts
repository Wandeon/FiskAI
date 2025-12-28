/**
 * Integrations Harvester
 *
 * Deterministically scans for external integration wrappers.
 * Discovery method: directory-exists or env-usage
 *
 * Detects integrations by:
 * - Wrapper directories in src/lib/<integration-name>/
 * - Environment variable patterns in .env.example
 * - Package.json dependencies for known services
 */

import { existsSync, readFileSync, readdirSync } from "fs"
import { join, relative } from "path"
import type { HarvesterResult, HarvesterError } from "./types"
import { createObservedComponent, toComponentId } from "./types"

interface IntegrationInfo {
  name: string
  displayName: string
  path: string
  discoveryMethod: "directory-exists" | "env-usage" | "code-reference"
}

// Known integration patterns to look for
const KNOWN_INTEGRATIONS: Record<string, { displayName: string; envPrefix?: string; packageName?: string }> = {
  stripe: { displayName: "Stripe", envPrefix: "STRIPE_", packageName: "stripe" },
  resend: { displayName: "Resend Email", envPrefix: "RESEND_", packageName: "resend" },
  gocardless: { displayName: "GoCardless", envPrefix: "GOCARDLESS_" },
  "fina-cis": { displayName: "FINA CIS", envPrefix: "FINA_" },
  ollama: { displayName: "Ollama", envPrefix: "OLLAMA_" },
  openai: { displayName: "OpenAI", envPrefix: "OPENAI_", packageName: "openai" },
  turnstile: { displayName: "Cloudflare Turnstile", envPrefix: "TURNSTILE_" },
  posthog: { displayName: "PostHog", envPrefix: "POSTHOG_", packageName: "posthog-js" },
  sentry: { displayName: "Sentry", envPrefix: "SENTRY_", packageName: "@sentry/nextjs" },
}

/**
 * Harvests all integrations from project.
 */
export async function harvestIntegrations(projectRoot: string): Promise<HarvesterResult> {
  const startTime = Date.now()
  const errors: HarvesterError[] = []
  const integrations: IntegrationInfo[] = []
  const seen = new Set<string>()
  const scannedPaths: string[] = []

  // Method 1: Check for wrapper directories in src/lib/
  const libPath = join(projectRoot, "src/lib")
  if (existsSync(libPath)) {
    scannedPaths.push("src/lib")
    const entries = readdirSync(libPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue

      const lowerName = entry.name.toLowerCase()

      // Check if it matches a known integration
      for (const [key, info] of Object.entries(KNOWN_INTEGRATIONS)) {
        if (lowerName === key || lowerName.includes(key)) {
          if (!seen.has(key)) {
            seen.add(key)
            integrations.push({
              name: key,
              displayName: info.displayName,
              path: relative(projectRoot, join(libPath, entry.name)),
              discoveryMethod: "directory-exists",
            })
          }
        }
      }
    }
  }

  // Method 2: Check .env.example for integration env vars
  const envExamplePath = join(projectRoot, ".env.example")
  if (existsSync(envExamplePath)) {
    scannedPaths.push(".env.example")
    try {
      const content = readFileSync(envExamplePath, "utf-8")
      const lines = content.split("\n")

      for (const [key, info] of Object.entries(KNOWN_INTEGRATIONS)) {
        if (info.envPrefix && !seen.has(key)) {
          const hasEnvVar = lines.some(
            (line) =>
              line.startsWith(info.envPrefix!) &&
              !line.startsWith("#")
          )
          if (hasEnvVar) {
            seen.add(key)
            integrations.push({
              name: key,
              displayName: info.displayName,
              path: ".env.example",
              discoveryMethod: "env-usage",
            })
          }
        }
      }
    } catch (e) {
      errors.push({
        path: envExamplePath,
        message: `Failed to read .env.example: ${e instanceof Error ? e.message : String(e)}`,
        recoverable: true,
      })
    }
  }

  // Method 3: Check package.json for known integration packages
  const packageJsonPath = join(projectRoot, "package.json")
  if (existsSync(packageJsonPath)) {
    scannedPaths.push("package.json")
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      for (const [key, info] of Object.entries(KNOWN_INTEGRATIONS)) {
        if (info.packageName && deps[info.packageName] && !seen.has(key)) {
          seen.add(key)
          integrations.push({
            name: key,
            displayName: info.displayName,
            path: `package.json (${info.packageName})`,
            discoveryMethod: "code-reference",
          })
        }
      }
    } catch (e) {
      errors.push({
        path: packageJsonPath,
        message: `Failed to parse package.json: ${e instanceof Error ? e.message : String(e)}`,
        recoverable: true,
      })
    }
  }

  // Convert to ObservedComponents
  const components = integrations.map((int) =>
    createObservedComponent(
      toComponentId("INTEGRATION", int.name),
      "INTEGRATION",
      int.displayName,
      [int.path],
      int.discoveryMethod
    )
  )

  return {
    components,
    errors,
    metadata: {
      harvesterName: "harvest-integrations",
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      scanPaths: scannedPaths,
    },
  }
}

// CLI entry point
if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd()
  harvestIntegrations(projectRoot).then((result) => {
    console.log(JSON.stringify(result, null, 2))
  })
}
