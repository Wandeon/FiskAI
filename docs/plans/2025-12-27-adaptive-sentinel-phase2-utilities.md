# Adaptive Sentinel Phase 2: Utility Modules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Create three utility modules: node-classifier, velocity-profiler, and scan-scheduler.

**Architecture:** Pure functions with no database dependencies. Each module is independently testable.

**Tech Stack:** TypeScript, Prisma types

---

## Task 1: Create Node Classifier Module

**Files:**

- Create: `src/lib/regulatory-truth/utils/node-classifier.ts`

**Step 1: Create the file with types and patterns**

```typescript
// src/lib/regulatory-truth/utils/node-classifier.ts

import { NodeType, NodeRole, FreshnessRisk } from "@prisma/client"

export interface ClassificationResult {
  nodeType: NodeType
  nodeRole: NodeRole | null
  freshnessRisk: FreshnessRisk
}

interface RolePattern {
  pattern: RegExp
  role: NodeRole
  risk: FreshnessRisk
  isHubCandidate: boolean
}

/**
 * URL patterns for Croatian regulatory sites.
 * Order matters - first match wins.
 */
const ROLE_PATTERNS: RolePattern[] = [
  // Archives - Low velocity, low risk
  {
    pattern: /\/(arhiva?|archive|povijest|history|stari-?)\//,
    role: "ARCHIVE",
    risk: "LOW",
    isHubCandidate: true,
  },

  // Consultations (Early Warning) - CRITICAL
  {
    pattern: /\/(savjetovanja|e-?savjetovanja|javna-rasprava|public-consult)/,
    role: "GUIDANCE",
    risk: "CRITICAL",
    isHubCandidate: true,
  },

  // Tenders/Competitions - High velocity
  {
    pattern: /\/(natjecaji|tenders|javna-nabava|pozivi)/,
    role: "NEWS_FEED",
    risk: "HIGH",
    isHubCandidate: true,
  },

  // News feeds - High velocity
  {
    pattern: /\/(vijesti|novosti|news|priopcenja|priopćenja|aktual|objave|mediji)/,
    role: "NEWS_FEED",
    risk: "HIGH",
    isHubCandidate: true,
  },

  // Forms - Yearly updates
  {
    pattern: /\/(obrasci?|forms?|tiskanice|prijave?|zahtjevi)/,
    role: "FORM",
    risk: "MEDIUM",
    isHubCandidate: false,
  },

  // Guidance/Opinions
  {
    pattern:
      /\/(uput[ea]|misljenj[ea]|mišljenj[ea]|tumacenj[ea]|tumačenj[ea]|stajalist[ea]|guidance)/,
    role: "GUIDANCE",
    risk: "MEDIUM",
    isHubCandidate: false,
  },

  // Regulations (Core) - CRITICAL
  {
    pattern: /\/(propisi|zakoni?|pravilnici?|uredbe?|odluke?|akti|sluzbeni)/,
    role: "REGULATION",
    risk: "CRITICAL",
    isHubCandidate: false,
  },

  // Indexes
  {
    pattern: /\/(index|sadržaj|sadrzaj|pregled|contents?)\./,
    role: "INDEX",
    risk: "LOW",
    isHubCandidate: true,
  },
]

const ASSET_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|odt|ods)$/i

/**
 * Classify a URL based on its path and content type.
 *
 * @param url - The URL to classify
 * @param contentType - Optional content-type header value
 * @returns Classification result with nodeType, nodeRole, and freshnessRisk
 */
export function classifyUrl(url: string, contentType?: string): ClassificationResult {
  // 1. Check for binary assets first
  if (
    ASSET_EXTENSIONS.test(url) ||
    contentType?.includes("pdf") ||
    contentType?.includes("document") ||
    contentType?.includes("msword") ||
    contentType?.includes("spreadsheet")
  ) {
    return { nodeType: "ASSET", nodeRole: null, freshnessRisk: "MEDIUM" }
  }

  // 2. Check role patterns
  for (const { pattern, role, risk, isHubCandidate } of ROLE_PATTERNS) {
    if (pattern.test(url)) {
      return {
        nodeType: isHubCandidate ? "HUB" : "LEAF",
        nodeRole: role,
        freshnessRisk: risk,
      }
    }
  }

  // 3. Default: unknown content page
  return { nodeType: "LEAF", nodeRole: null, freshnessRisk: "MEDIUM" }
}

/**
 * Apply risk inheritance for assets.
 * Assets linked from CRITICAL pages should inherit CRITICAL risk.
 *
 * @param classification - The initial classification result
 * @param parentRisk - The parent page's freshness risk
 * @returns Updated classification with inherited risk if applicable
 */
export function applyRiskInheritance(
  classification: ClassificationResult,
  parentRisk: FreshnessRisk | null
): ClassificationResult {
  if (classification.nodeType === "ASSET" && parentRisk === "CRITICAL") {
    return { ...classification, freshnessRisk: "CRITICAL" }
  }
  if (classification.nodeType === "ASSET" && parentRisk === "HIGH") {
    return { ...classification, freshnessRisk: "HIGH" }
  }
  return classification
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/utils/node-classifier.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/node-classifier.ts
git commit -m "feat: add node-classifier utility for URL classification"
```

---

## Task 2: Create Velocity Profiler Module

**Files:**

- Create: `src/lib/regulatory-truth/utils/velocity-profiler.ts`

**Step 1: Create the file with EWMA logic**

```typescript
// src/lib/regulatory-truth/utils/velocity-profiler.ts

/**
 * EWMA (Exponential Weighted Moving Average) velocity profiler.
 *
 * Tracks how frequently content changes using asymmetric alpha values:
 * - Changes spike the score quickly (α = 0.3)
 * - Stability decays the score slowly (α = 0.1)
 *
 * This creates a "paranoid but efficient" system that wakes up fast
 * when a dormant page changes, but takes multiple stable scans to calm down.
 */

export interface VelocityUpdate {
  newFrequency: number
  lastChangedAt: Date | null
}

export interface VelocityConfig {
  warmupScans: number
  alphaChange: number
  alphaStable: number
  minFrequency: number
  maxFrequency: number
}

const DEFAULT_CONFIG: VelocityConfig = {
  warmupScans: 3, // First 3 scans stay neutral
  alphaChange: 0.3, // React quickly to changes
  alphaStable: 0.1, // Decay slowly on stability
  minFrequency: 0.01, // Floor to avoid zero
  maxFrequency: 0.99, // Ceiling to avoid one
}

/**
 * Update velocity score using EWMA formula.
 *
 * @param currentFrequency - Current velocity score (0.0 to 1.0)
 * @param scanCount - Number of times this URL has been scanned
 * @param contentChanged - Whether content changed on this scan
 * @param config - Optional EWMA configuration
 * @returns Updated velocity info
 *
 * @example
 * // First scan, content changed
 * updateVelocity(0.5, 0, true) // { newFrequency: 0.5, lastChangedAt: Date }
 *
 * // After warmup, stable content
 * updateVelocity(0.8, 5, false) // { newFrequency: 0.72, lastChangedAt: null }
 */
export function updateVelocity(
  currentFrequency: number,
  scanCount: number,
  contentChanged: boolean,
  config: VelocityConfig = DEFAULT_CONFIG
): VelocityUpdate {
  // During warmup, stay neutral to avoid wild swings
  if (scanCount < config.warmupScans) {
    return {
      newFrequency: 0.5,
      lastChangedAt: contentChanged ? new Date() : null,
    }
  }

  // After warmup, apply EWMA
  const alpha = contentChanged ? config.alphaChange : config.alphaStable
  const signal = contentChanged ? 1.0 : 0.0

  // EWMA formula: new = α * signal + (1 - α) * old
  const rawFrequency = alpha * signal + (1 - alpha) * currentFrequency

  // Clamp to bounds
  const newFrequency = Math.max(config.minFrequency, Math.min(config.maxFrequency, rawFrequency))

  return {
    newFrequency,
    lastChangedAt: contentChanged ? new Date() : null,
  }
}

/**
 * Get a human-readable description of velocity level.
 * Useful for logging and debugging.
 */
export function describeVelocity(frequency: number): string {
  if (frequency >= 0.8) return "volatile"
  if (frequency >= 0.5) return "active"
  if (frequency >= 0.2) return "moderate"
  return "static"
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/utils/velocity-profiler.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/velocity-profiler.ts
git commit -m "feat: add velocity-profiler utility with EWMA algorithm"
```

---

## Task 3: Create Scan Scheduler Module

**Files:**

- Create: `src/lib/regulatory-truth/utils/scan-scheduler.ts`

**Step 1: Create the file with scheduling logic**

```typescript
// src/lib/regulatory-truth/utils/scan-scheduler.ts

import { FreshnessRisk } from "@prisma/client"

/**
 * Scan scheduler that calculates next scan time based on velocity and risk.
 *
 * Formula: interval = baseInterval / (velocity * riskFactor)
 * - High velocity + high risk = frequent scans
 * - Low velocity + low risk = infrequent scans
 *
 * Includes jitter (+/- 10%) to prevent "sync storms" where many URLs
 * become due at exactly the same time.
 */

export interface ScheduleConfig {
  baseIntervalHours: number
  maxIntervalHours: number
  jitterPercent: number
}

const DEFAULT_CONFIG: ScheduleConfig = {
  baseIntervalHours: 4, // Minimum 4 hours between scans
  maxIntervalHours: 720, // Maximum 30 days
  jitterPercent: 0.1, // +/- 10% randomness
}

/**
 * Risk factors - higher number = more frequent scans.
 */
const RISK_FACTORS: Record<FreshnessRisk, number> = {
  CRITICAL: 4.0, // 4x more frequent
  HIGH: 2.0, // 2x more frequent
  MEDIUM: 1.0, // Baseline
  LOW: 0.5, // Half as frequent
}

/**
 * Calculate the next scan time for a URL.
 *
 * @param changeFrequency - Velocity score (0.01 to 0.99)
 * @param freshnessRisk - Risk level (CRITICAL, HIGH, MEDIUM, LOW)
 * @param config - Optional scheduling configuration
 * @returns Date when this URL should next be scanned
 *
 * @example
 * // CRITICAL risk + high velocity (0.9) = ~1.1 hours
 * calculateNextScan(0.9, "CRITICAL")
 *
 * // LOW risk + low velocity (0.1) = ~80 hours
 * calculateNextScan(0.1, "LOW")
 */
export function calculateNextScan(
  changeFrequency: number,
  freshnessRisk: FreshnessRisk,
  config: ScheduleConfig = DEFAULT_CONFIG
): Date {
  const riskFactor = RISK_FACTORS[freshnessRisk]
  const velocityFactor = Math.max(0.01, changeFrequency)

  // Core formula: base / (velocity * risk)
  let intervalHours = config.baseIntervalHours / (velocityFactor * riskFactor)

  // Clamp to bounds
  intervalHours = Math.max(config.baseIntervalHours, intervalHours)
  intervalHours = Math.min(config.maxIntervalHours, intervalHours)

  // Add jitter to prevent sync storms
  const jitterRange = config.jitterPercent * 2 // e.g., 0.2 for +/- 10%
  const jitter = 1 + (Math.random() * jitterRange - config.jitterPercent)
  intervalHours = intervalHours * jitter

  const nextScan = new Date()
  nextScan.setTime(nextScan.getTime() + intervalHours * 60 * 60 * 1000)
  return nextScan
}

/**
 * Calculate interval in hours (for logging/debugging).
 * Does NOT include jitter for deterministic output.
 */
export function calculateIntervalHours(
  changeFrequency: number,
  freshnessRisk: FreshnessRisk,
  config: ScheduleConfig = DEFAULT_CONFIG
): number {
  const riskFactor = RISK_FACTORS[freshnessRisk]
  const velocityFactor = Math.max(0.01, changeFrequency)

  let intervalHours = config.baseIntervalHours / (velocityFactor * riskFactor)
  intervalHours = Math.max(config.baseIntervalHours, intervalHours)
  intervalHours = Math.min(config.maxIntervalHours, intervalHours)

  return Math.round(intervalHours * 10) / 10 // Round to 1 decimal
}

/**
 * Get a human-readable description of the scan interval.
 */
export function describeInterval(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`
  if (hours < 168) return `${Math.round(hours / 24)}d`
  return `${Math.round(hours / 168)}w`
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/utils/scan-scheduler.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/scan-scheduler.ts
git commit -m "feat: add scan-scheduler utility with risk-aware scheduling"
```

---

## Task 4: Create Index Export

**Files:**

- Create: `src/lib/regulatory-truth/utils/adaptive-sentinel.ts`

**Step 1: Create barrel export for all utilities**

```typescript
// src/lib/regulatory-truth/utils/adaptive-sentinel.ts

/**
 * Adaptive Sentinel utilities for topology-aware crawling.
 *
 * @module adaptive-sentinel
 */

export { classifyUrl, applyRiskInheritance, type ClassificationResult } from "./node-classifier"

export {
  updateVelocity,
  describeVelocity,
  type VelocityUpdate,
  type VelocityConfig,
} from "./velocity-profiler"

export {
  calculateNextScan,
  calculateIntervalHours,
  describeInterval,
  type ScheduleConfig,
} from "./scan-scheduler"
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/utils/adaptive-sentinel.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/adaptive-sentinel.ts
git commit -m "feat: add barrel export for adaptive sentinel utilities"
```

---

## Verification

After all tasks, run:

```bash
npx tsc --noEmit && echo "TypeScript valid"
```

Should pass with no errors.
