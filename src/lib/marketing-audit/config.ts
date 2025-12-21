import path from "node:path"
import { MarketingAuditConfig } from "./types"

const DEFAULT_MARKETING_ROOT = "src/app/(marketing)"
const DEFAULT_AUDIT_OUTPUT = "docs/MARKETING_CONTENT_AUDIT.md"
const DEFAULT_REGISTRY_PATH = "docs/marketing-content-registry.yml"
const DEFAULT_TARGET_URL = "https://fiskai.hr"

function isWorktreePath(cwd: string) {
  return cwd.includes(`${path.sep}.worktrees${path.sep}`)
}

function resolveBaseRoot(cwd: string) {
  if (isWorktreePath(cwd)) {
    return path.resolve(cwd, "..", "..", "..")
  }

  return path.resolve(cwd, "..")
}

function resolveRepoRoots() {
  const cwd = process.cwd()
  const baseRoot = resolveBaseRoot(cwd)
  const repoName = path.basename(cwd)

  const fiskaiRootFromEnv = process.env.FISKAI_ROOT
  const fiskaiNextFromEnv = process.env.FISKAI_NEXT_ROOT

  if (fiskaiRootFromEnv || fiskaiNextFromEnv) {
    return {
      fiskaiRoot: fiskaiRootFromEnv ?? path.join(baseRoot, "FiskAI"),
      fiskaiNextRoot: fiskaiNextFromEnv ?? path.join(baseRoot, "FiskAI-next"),
    }
  }

  if (repoName === "FiskAI-next") {
    return {
      fiskaiRoot: path.join(baseRoot, "FiskAI"),
      fiskaiNextRoot: cwd,
    }
  }

  const fiskaiRoot = isWorktreePath(cwd) ? path.resolve(cwd, "..", "..") : cwd

  return {
    fiskaiRoot,
    fiskaiNextRoot: path.join(baseRoot, "FiskAI-next"),
  }
}

export function getAuditConfig(): MarketingAuditConfig {
  const { fiskaiRoot, fiskaiNextRoot } = resolveRepoRoots()

  return {
    repos: [fiskaiRoot, fiskaiNextRoot],
    marketingRoot: process.env.MARKETING_AUDIT_ROOT ?? DEFAULT_MARKETING_ROOT,
    auditOutput: process.env.MARKETING_AUDIT_OUTPUT ?? DEFAULT_AUDIT_OUTPUT,
    registryPath: process.env.MARKETING_AUDIT_REGISTRY ?? DEFAULT_REGISTRY_PATH,
    targetBaseUrl: process.env.MARKETING_AUDIT_TARGET_URL ?? DEFAULT_TARGET_URL,
  }
}
