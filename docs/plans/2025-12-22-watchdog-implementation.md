# Watchdog System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the self-aware Watchdog autonomous monitoring system with staggered timing, health monitors, multi-channel alerting, random audits, and safe auto-recovery.

**Architecture:** Watchdog Daemon orchestrating phased pipeline execution (Scout → Scrape → Process → Audit) with health checks after each phase, Slack/Email notifications, and recovery state machine.

**Tech Stack:** TypeScript, Prisma, node-cron, Nodemailer, Slack Webhooks, Zod

---

## Phase 1: Database Schema & Core Types

### Task 1.1: Add Watchdog Prisma Models

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add the three Watchdog tables to schema**

```prisma
// Watchdog System Models

enum WatchdogSeverity {
  INFO
  WARNING
  CRITICAL
}

enum WatchdogHealthStatus {
  HEALTHY
  WARNING
  CRITICAL
}

enum WatchdogCheckType {
  STALE_SOURCE
  SCRAPER_FAILURE
  QUALITY_DEGRADATION
  PIPELINE_HEALTH
  REJECTION_RATE
}

enum WatchdogAlertType {
  STALE_SOURCE
  SCRAPER_FAILURE
  QUALITY_DEGRADATION
  PIPELINE_FAILURE
  PHASE_TIMEOUT
  HIGH_REJECTION_RATE
  AUDIT_FAIL
  AUDIT_PARTIAL
  SOURCE_SUSPENDED
}

enum AuditResult {
  PASS
  PARTIAL
  FAIL
}

model WatchdogHealth {
  id          String               @id @default(cuid())
  checkType   WatchdogCheckType
  entityId    String               // source ID, phase name, etc.
  status      WatchdogHealthStatus
  lastChecked DateTime             @default(now())
  lastHealthy DateTime?
  metric      Decimal?             @db.Decimal(10, 4)
  threshold   Decimal?             @db.Decimal(10, 4)
  message     String?

  @@unique([checkType, entityId])
  @@index([status])
  @@index([checkType])
}

model WatchdogAlert {
  id              String           @id @default(cuid())
  severity        WatchdogSeverity
  type            WatchdogAlertType
  entityId        String?
  message         String
  details         Json?
  occurredAt      DateTime         @default(now())
  acknowledgedAt  DateTime?
  acknowledgedBy  String?
  resolvedAt      DateTime?
  notifiedAt      DateTime?
  occurrenceCount Int              @default(1)

  @@index([severity])
  @@index([type])
  @@index([occurredAt])
  @@index([resolvedAt])
}

model WatchdogAudit {
  id           String      @id @default(cuid())
  runDate      DateTime    @db.Date
  auditedAt    DateTime    @default(now())
  rulesAudited Int
  rulesPassed  Int
  rulesFailed  Int
  overallScore Decimal     @db.Decimal(5, 2)
  result       AuditResult
  findings     Json
  alertsRaised String[]

  @@index([runDate])
  @@index([result])
}
```

**Step 2: Run migration**

Run: `npx prisma migrate dev --name add_watchdog_tables`
Expected: Migration successful, 3 tables created

**Step 3: Verify schema**

Run: `npx prisma generate`
Expected: Prisma Client generated successfully

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(watchdog): add WatchdogHealth, WatchdogAlert, WatchdogAudit tables"
```

---

### Task 1.2: Create Watchdog Type Definitions

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/types.ts`

**Step 1: Create the types file**

```typescript
// src/lib/regulatory-truth/watchdog/types.ts

import type {
  WatchdogSeverity,
  WatchdogHealthStatus,
  WatchdogCheckType,
  WatchdogAlertType,
  AuditResult,
} from "@prisma/client"

export interface DomainDelayConfig {
  base: number // base delay in ms
  maxJitter: number // max additional random delay in ms
}

export const DOMAIN_DELAYS: Record<string, DomainDelayConfig> = {
  "narodne-novine.nn.hr": { base: 3000, maxJitter: 1500 },
  "porezna-uprava.gov.hr": { base: 4000, maxJitter: 2000 },
  "hzzo.hr": { base: 5000, maxJitter: 2500 },
  "mirovinsko.hr": { base: 4000, maxJitter: 2000 },
  "fina.hr": { base: 3000, maxJitter: 1500 },
  "mfin.gov.hr": { base: 4000, maxJitter: 2000 },
}

export interface HealthCheckResult {
  checkType: WatchdogCheckType
  entityId: string
  status: WatchdogHealthStatus
  metric?: number
  threshold?: number
  message?: string
}

export interface AlertPayload {
  severity: WatchdogSeverity
  type: WatchdogAlertType
  entityId?: string
  message: string
  details?: Record<string, unknown>
}

export interface AuditCheckResult {
  name: string
  passed: boolean
  weight: number
  details?: string
}

export interface RuleAuditResult {
  ruleId: string
  conceptSlug: string
  checks: AuditCheckResult[]
  score: number
  passed: boolean
}

export interface AuditReport {
  runDate: Date
  rulesAudited: number
  rulesPassed: number
  rulesFailed: number
  overallScore: number
  result: AuditResult
  findings: RuleAuditResult[]
}

export interface PhaseResult {
  phase: "SCOUT" | "SCRAPE" | "PROCESS" | "HEALTH" | "AUDIT"
  startedAt: Date
  completedAt: Date
  success: boolean
  itemsProcessed: number
  itemsFailed: number
  error?: string
}

export interface WatchdogRunResult {
  runId: string
  startedAt: Date
  completedAt: Date
  phases: PhaseResult[]
  alertsRaised: string[]
}

// Thresholds (can be overridden via env)
export const DEFAULT_THRESHOLDS = {
  STALE_SOURCE_WARNING_DAYS: 7,
  STALE_SOURCE_CRITICAL_DAYS: 14,
  FAILURE_RATE_WARNING: 0.3,
  FAILURE_RATE_CRITICAL: 0.5,
  CONFIDENCE_WARNING: 0.85,
  CONFIDENCE_CRITICAL: 0.75,
  REJECTION_RATE_WARNING: 0.4,
  REJECTION_RATE_CRITICAL: 0.6,
  PHASE_DURATION_WARNING_MULTIPLIER: 2,
  PHASE_DURATION_CRITICAL_MULTIPLIER: 3,
}

export function getThreshold(key: keyof typeof DEFAULT_THRESHOLDS): number {
  const envKey = key.replace(/_/g, "_")
  const envValue = process.env[envKey]
  return envValue ? parseFloat(envValue) : DEFAULT_THRESHOLDS[key]
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/types.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/types.ts
git commit -m "feat(watchdog): add type definitions and constants"
```

---

## Phase 2: Rate Limiting & Content Chunking

### Task 2.1: Implement Variable Rate Limiter

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/rate-limiter.ts`

**Step 1: Create the rate limiter**

```typescript
// src/lib/regulatory-truth/watchdog/rate-limiter.ts

import { DOMAIN_DELAYS, type DomainDelayConfig } from "./types"

const DEFAULT_DELAY: DomainDelayConfig = { base: 3000, maxJitter: 1500 }

/**
 * Get a randomized delay for a given domain
 * Includes base delay + random jitter + 10% chance of long pause
 */
export function getDelayForDomain(domain: string): number {
  const config = DOMAIN_DELAYS[domain] ?? DEFAULT_DELAY
  const jitter = Math.random() * config.maxJitter
  const longPause = Math.random() < 0.1 ? config.base : 0 // 10% chance of 2x delay
  return Math.round(config.base + jitter + longPause)
}

/**
 * Get a random delay within a range (for scout/scrape phases)
 */
export function getRandomDelay(minMs: number, maxMs: number): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs))
}

/**
 * Sleep for a given number of milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sleep with domain-specific delay
 */
export async function sleepForDomain(domain: string): Promise<number> {
  const delay = getDelayForDomain(domain)
  await sleep(delay)
  return delay
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return "unknown"
  }
}
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/rate-limiter.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/rate-limiter.ts
git commit -m "feat(watchdog): add variable rate limiter with per-domain delays"
```

---

### Task 2.2: Implement Content Chunker

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/content-chunker.ts`

**Step 1: Create the content chunker**

```typescript
// src/lib/regulatory-truth/watchdog/content-chunker.ts

const MAX_TOKENS = 4000
const OVERLAP_TOKENS = 500
const AVG_CHARS_PER_TOKEN = 4 // rough estimate for mixed content

export interface ContentChunk {
  content: string
  index: number
  totalChunks: number
  startOffset: number
  endOffset: number
}

/**
 * Estimate token count from character count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN)
}

/**
 * Split content into chunks at paragraph boundaries
 */
export function chunkContent(content: string): ContentChunk[] {
  const tokens = estimateTokens(content)

  // If content is small enough, return as single chunk
  if (tokens <= MAX_TOKENS) {
    return [
      {
        content,
        index: 0,
        totalChunks: 1,
        startOffset: 0,
        endOffset: content.length,
      },
    ]
  }

  const maxChars = MAX_TOKENS * AVG_CHARS_PER_TOKEN
  const overlapChars = OVERLAP_TOKENS * AVG_CHARS_PER_TOKEN
  const chunks: ContentChunk[] = []

  let startOffset = 0

  while (startOffset < content.length) {
    let endOffset = Math.min(startOffset + maxChars, content.length)

    // Try to break at paragraph boundary (double newline)
    if (endOffset < content.length) {
      const searchStart = Math.max(startOffset + maxChars - 500, startOffset)
      const searchEnd = Math.min(startOffset + maxChars + 500, content.length)
      const searchRegion = content.slice(searchStart, searchEnd)

      // Look for paragraph break
      const paragraphBreak = searchRegion.lastIndexOf("\n\n")
      if (paragraphBreak !== -1) {
        endOffset = searchStart + paragraphBreak + 2
      } else {
        // Fall back to sentence break
        const sentenceBreak = searchRegion.lastIndexOf(". ")
        if (sentenceBreak !== -1) {
          endOffset = searchStart + sentenceBreak + 2
        }
      }
    }

    chunks.push({
      content: content.slice(startOffset, endOffset),
      index: chunks.length,
      totalChunks: 0, // will be updated after
      startOffset,
      endOffset,
    })

    // Move start with overlap
    startOffset = endOffset - overlapChars
    if (startOffset >= content.length - overlapChars) {
      break // avoid tiny final chunk
    }
  }

  // Update totalChunks
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length
  }

  return chunks
}

/**
 * Check if content needs chunking
 */
export function needsChunking(content: string): boolean {
  return estimateTokens(content) > MAX_TOKENS
}
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/content-chunker.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/content-chunker.ts
git commit -m "feat(watchdog): add content chunker for large documents"
```

---

## Phase 3: Alerting System

### Task 3.1: Implement Slack Notifier

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/slack.ts`

**Step 1: Create Slack notification module**

```typescript
// src/lib/regulatory-truth/watchdog/slack.ts

import type { WatchdogSeverity, AuditResult } from "@prisma/client"
import type { AuditReport } from "./types"

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || "#fiskai-alerts"

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  elements?: Array<{ type: string; text: string }>
  fields?: Array<{ type: string; text: string }>
}

interface SlackMessage {
  channel?: string
  blocks: SlackBlock[]
}

/**
 * Send a message to Slack
 */
async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.log("[slack] No webhook URL configured, skipping notification")
    return false
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        ...message,
      }),
    })

    if (!response.ok) {
      console.error("[slack] Failed to send message:", response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error("[slack] Error sending message:", error)
    return false
  }
}

/**
 * Send a critical alert to Slack
 */
export async function sendCriticalAlert(
  type: string,
  message: string,
  details?: Record<string, unknown>
): Promise<boolean> {
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "🚨 Critical Alert", emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Type:*\n${type}` },
        { type: "mrkdwn", text: `*Time:*\n${new Date().toISOString()}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Message:*\n${message}` },
    },
  ]

  if (details) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Details:*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
      },
    })
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "<https://fiskai.hr/admin/watchdog|View Dashboard>" }],
  })

  return sendSlackMessage({ blocks })
}

/**
 * Send audit result to Slack
 */
export async function sendAuditResult(report: AuditReport): Promise<boolean> {
  const emoji = report.result === "PASS" ? "✅" : report.result === "PARTIAL" ? "⚠️" : "🚨"
  const color =
    report.result === "PASS" ? "good" : report.result === "PARTIAL" ? "warning" : "danger"

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} Audit ${report.result}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Run Date:*\n${report.runDate.toISOString().split("T")[0]}` },
        { type: "mrkdwn", text: `*Score:*\n${report.overallScore.toFixed(1)}%` },
        { type: "mrkdwn", text: `*Rules Checked:*\n${report.rulesAudited}` },
        { type: "mrkdwn", text: `*Passed:*\n${report.rulesPassed}/${report.rulesAudited}` },
      ],
    },
  ]

  if (report.result !== "PASS" && report.findings.length > 0) {
    const failedRules = report.findings
      .filter((f) => !f.passed)
      .map(
        (f) =>
          `• ${f.conceptSlug}: ${f.checks
            .filter((c) => !c.passed)
            .map((c) => c.name)
            .join(", ")}`
      )
      .slice(0, 5)
      .join("\n")

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Issues:*\n${failedRules}` },
    })
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "<https://fiskai.hr/admin/watchdog/audits|View Details>" }],
  })

  return sendSlackMessage({ blocks })
}
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/slack.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/slack.ts
git commit -m "feat(watchdog): add Slack notification module"
```

---

### Task 3.2: Implement Email Notifier

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/email.ts`

**Step 1: Create email notification module**

```typescript
// src/lib/regulatory-truth/watchdog/email.ts

import nodemailer from "nodemailer"
import type { WatchdogAlert } from "@prisma/client"

const SMTP_HOST = process.env.SMTP_HOST || "localhost"
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587")
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || "noreply@fiskai.hr"
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  }
  return transporter
}

/**
 * Send critical alert email immediately
 */
export async function sendCriticalEmail(alert: WatchdogAlert): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    console.log("[email] No admin email configured, skipping notification")
    return false
  }

  const subject = `[FiskAI CRITICAL] ${alert.type}: ${alert.message}`
  const html = `
    <h2>Regulatory Truth Pipeline Alert</h2>
    <table>
      <tr><td><strong>Severity:</strong></td><td style="color: red;">CRITICAL</td></tr>
      <tr><td><strong>Type:</strong></td><td>${alert.type}</td></tr>
      <tr><td><strong>Entity:</strong></td><td>${alert.entityId || "N/A"}</td></tr>
      <tr><td><strong>Time:</strong></td><td>${alert.occurredAt.toISOString()}</td></tr>
    </table>
    <h3>Message</h3>
    <p>${alert.message}</p>
    ${alert.details ? `<h3>Details</h3><pre>${JSON.stringify(alert.details, null, 2)}</pre>` : ""}
    <hr>
    <p><a href="https://fiskai.hr/admin/watchdog">View Dashboard</a></p>
  `

  try {
    await getTransporter().sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject,
      html,
    })
    console.log(`[email] Critical alert sent to ${ADMIN_EMAIL}`)
    return true
  } catch (error) {
    console.error("[email] Failed to send critical alert:", error)
    return false
  }
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(
  warnings: WatchdogAlert[],
  stats: {
    sourcesChecked: number
    itemsDiscovered: number
    rulesCreated: number
    avgConfidence: number
  }
): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    console.log("[email] No admin email configured, skipping digest")
    return false
  }

  const date = new Date().toISOString().split("T")[0]
  const status = warnings.length === 0 ? "HEALTHY" : "WARNINGS"
  const subject = `[FiskAI] Daily Watchdog Report - ${date}`

  const warningsList =
    warnings.length > 0
      ? warnings.map((w) => `<li>${w.type}: ${w.message}</li>`).join("\n")
      : "<li>No warnings</li>"

  const html = `
    <h2>Daily Watchdog Report</h2>
    <p><strong>Status:</strong> ${status}</p>

    <h3>Warnings (last 24h)</h3>
    <ul>${warningsList}</ul>

    <h3>Health Summary</h3>
    <ul>
      <li>Sources checked: ${stats.sourcesChecked}</li>
      <li>Items discovered: ${stats.itemsDiscovered}</li>
      <li>Rules created: ${stats.rulesCreated}</li>
      <li>Avg confidence: ${(stats.avgConfidence * 100).toFixed(1)}%</li>
    </ul>

    <hr>
    <p><a href="https://fiskai.hr/admin/watchdog">View Dashboard</a></p>
  `

  try {
    await getTransporter().sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject,
      html,
    })
    console.log(`[email] Daily digest sent to ${ADMIN_EMAIL}`)
    return true
  } catch (error) {
    console.error("[email] Failed to send daily digest:", error)
    return false
  }
}
```

**Step 2: Install nodemailer if not present**

Run: `npm list nodemailer || npm install nodemailer && npm install -D @types/nodemailer`
Expected: nodemailer installed

**Step 3: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/email.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/email.ts package.json package-lock.json
git commit -m "feat(watchdog): add email notification module"
```

---

### Task 3.3: Implement Alert Manager

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/alerting.ts`

**Step 1: Create unified alerting module**

```typescript
// src/lib/regulatory-truth/watchdog/alerting.ts

import { db } from "@/lib/db"
import type { WatchdogSeverity, WatchdogAlertType } from "@prisma/client"
import type { AlertPayload, AuditReport } from "./types"
import { sendCriticalAlert as sendSlackCritical, sendAuditResult as sendSlackAudit } from "./slack"
import { sendCriticalEmail, sendDailyDigest } from "./email"

/**
 * Raise an alert - handles deduplication, storage, and routing
 */
export async function raiseAlert(payload: AlertPayload): Promise<string> {
  const { severity, type, entityId, message, details } = payload

  // Check for duplicate in last 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const existing = await db.watchdogAlert.findFirst({
    where: {
      type,
      entityId: entityId ?? undefined,
      occurredAt: { gte: cutoff },
      resolvedAt: null,
    },
    orderBy: { occurredAt: "desc" },
  })

  if (existing) {
    // Increment occurrence count instead of creating new
    await db.watchdogAlert.update({
      where: { id: existing.id },
      data: { occurrenceCount: { increment: 1 } },
    })
    console.log(
      `[alerting] Deduplicated alert ${type} for ${entityId} (count: ${existing.occurrenceCount + 1})`
    )
    return existing.id
  }

  // Create new alert
  const alert = await db.watchdogAlert.create({
    data: {
      severity,
      type,
      entityId,
      message,
      details: details ?? undefined,
    },
  })

  console.log(`[alerting] Created ${severity} alert: ${type} - ${message}`)

  // Route based on severity
  if (severity === "CRITICAL") {
    await Promise.all([sendSlackCritical(type, message, details), sendCriticalEmail(alert)])
    await db.watchdogAlert.update({
      where: { id: alert.id },
      data: { notifiedAt: new Date() },
    })
  }

  return alert.id
}

/**
 * Send audit result notifications
 */
export async function notifyAuditResult(report: AuditReport): Promise<void> {
  // Always send to Slack
  await sendSlackAudit(report)

  // If failed, also raise an alert
  if (report.result === "FAIL") {
    await raiseAlert({
      severity: "CRITICAL",
      type: "AUDIT_FAIL",
      message: `Audit failed with score ${report.overallScore.toFixed(1)}%`,
      details: {
        rulesAudited: report.rulesAudited,
        rulesFailed: report.rulesFailed,
        failedRules: report.findings.filter((f) => !f.passed).map((f) => f.conceptSlug),
      },
    })
  } else if (report.result === "PARTIAL") {
    await raiseAlert({
      severity: "WARNING",
      type: "AUDIT_PARTIAL",
      message: `Audit partial pass with score ${report.overallScore.toFixed(1)}%`,
      details: {
        rulesAudited: report.rulesAudited,
        rulesFailed: report.rulesFailed,
      },
    })
  }
}

/**
 * Send daily digest of warnings
 */
export async function sendDailyDigestEmail(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const warnings = await db.watchdogAlert.findMany({
    where: {
      severity: "WARNING",
      occurredAt: { gte: cutoff },
    },
    orderBy: { occurredAt: "desc" },
  })

  // Gather stats
  const stats = await db.$queryRaw<
    [
      {
        sources: number
        discovered: number
        rules: number
        avgConf: number
      },
    ]
  >`
    SELECT
      (SELECT COUNT(*) FROM "RegulatorySource" WHERE "isActive" = true) as sources,
      (SELECT COUNT(*) FROM "Evidence" WHERE "fetchedAt" >= ${cutoff}) as discovered,
      (SELECT COUNT(*) FROM "RegulatoryRule" WHERE "createdAt" >= ${cutoff}) as rules,
      (SELECT AVG(confidence) FROM "RegulatoryRule" WHERE "createdAt" >= ${cutoff}) as "avgConf"
  `

  await sendDailyDigest(warnings, {
    sourcesChecked: Number(stats[0].sources),
    itemsDiscovered: Number(stats[0].discovered),
    rulesCreated: Number(stats[0].rules),
    avgConfidence: Number(stats[0].avgConf) || 0,
  })
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId?: string): Promise<void> {
  await db.watchdogAlert.update({
    where: { id: alertId },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
    },
  })
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<void> {
  await db.watchdogAlert.update({
    where: { id: alertId },
    data: { resolvedAt: new Date() },
  })
}
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/alerting.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/alerting.ts
git commit -m "feat(watchdog): add unified alert manager with deduplication"
```

---

## Phase 4: Health Monitors

### Task 4.1: Implement Health Monitor Checks

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/health-monitors.ts`

**Step 1: Create health monitors**

```typescript
// src/lib/regulatory-truth/watchdog/health-monitors.ts

import { db } from "@/lib/db"
import type { WatchdogHealthStatus, WatchdogCheckType } from "@prisma/client"
import type { HealthCheckResult } from "./types"
import { getThreshold } from "./types"
import { raiseAlert } from "./alerting"

/**
 * Update health status in database
 */
async function updateHealth(result: HealthCheckResult): Promise<void> {
  await db.watchdogHealth.upsert({
    where: {
      checkType_entityId: {
        checkType: result.checkType,
        entityId: result.entityId,
      },
    },
    create: {
      checkType: result.checkType,
      entityId: result.entityId,
      status: result.status,
      metric: result.metric,
      threshold: result.threshold,
      message: result.message,
      lastHealthy: result.status === "HEALTHY" ? new Date() : undefined,
    },
    update: {
      status: result.status,
      metric: result.metric,
      threshold: result.threshold,
      message: result.message,
      lastChecked: new Date(),
      lastHealthy: result.status === "HEALTHY" ? new Date() : undefined,
    },
  })
}

/**
 * Check for stale sources (no new items in X days)
 */
export async function checkStaleSources(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const warningDays = getThreshold("STALE_SOURCE_WARNING_DAYS")
  const criticalDays = getThreshold("STALE_SOURCE_CRITICAL_DAYS")

  const sources = await db.regulatorySource.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      evidence: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: { fetchedAt: true },
      },
    },
  })

  for (const source of sources) {
    const lastFetch = source.evidence[0]?.fetchedAt
    const daysSince = lastFetch
      ? (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    let status: WatchdogHealthStatus = "HEALTHY"
    if (daysSince >= criticalDays) {
      status = "CRITICAL"
      await raiseAlert({
        severity: "CRITICAL",
        type: "STALE_SOURCE",
        entityId: source.id,
        message: `Source "${source.name}" has no new items for ${Math.floor(daysSince)} days`,
      })
    } else if (daysSince >= warningDays) {
      status = "WARNING"
      await raiseAlert({
        severity: "WARNING",
        type: "STALE_SOURCE",
        entityId: source.id,
        message: `Source "${source.name}" has no new items for ${Math.floor(daysSince)} days`,
      })
    }

    const result: HealthCheckResult = {
      checkType: "STALE_SOURCE",
      entityId: source.id,
      status,
      metric: daysSince,
      threshold: status === "CRITICAL" ? criticalDays : warningDays,
      message: `${Math.floor(daysSince)} days since last item`,
    }

    await updateHealth(result)
    results.push(result)
  }

  return results
}

/**
 * Check scraper failure rate
 */
export async function checkScraperFailureRate(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const warningRate = getThreshold("FAILURE_RATE_WARNING")
  const criticalRate = getThreshold("FAILURE_RATE_CRITICAL")
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Count fetches by status in last 24h
  const fetchStats = await db.evidence.groupBy({
    by: ["sourceId"],
    where: { fetchedAt: { gte: cutoff } },
    _count: { id: true },
  })

  // This is simplified - in practice you'd track fetch attempts vs successes
  // For now, we'll check based on evidence with empty content
  for (const stat of fetchStats) {
    const total = stat._count.id
    const failed = await db.evidence.count({
      where: {
        sourceId: stat.sourceId,
        fetchedAt: { gte: cutoff },
        OR: [{ content: "" }, { content: null as any }],
      },
    })

    const failureRate = total > 0 ? failed / total : 0
    let status: WatchdogHealthStatus = "HEALTHY"

    if (failureRate >= criticalRate) {
      status = "CRITICAL"
      await raiseAlert({
        severity: "CRITICAL",
        type: "SCRAPER_FAILURE",
        entityId: stat.sourceId,
        message: `Scraper failure rate is ${(failureRate * 100).toFixed(1)}%`,
      })
    } else if (failureRate >= warningRate) {
      status = "WARNING"
      await raiseAlert({
        severity: "WARNING",
        type: "SCRAPER_FAILURE",
        entityId: stat.sourceId,
        message: `Scraper failure rate is ${(failureRate * 100).toFixed(1)}%`,
      })
    }

    const result: HealthCheckResult = {
      checkType: "SCRAPER_FAILURE",
      entityId: stat.sourceId,
      status,
      metric: failureRate,
      threshold: status === "CRITICAL" ? criticalRate : warningRate,
      message: `${(failureRate * 100).toFixed(1)}% failure rate (${failed}/${total})`,
    }

    await updateHealth(result)
    results.push(result)
  }

  return results
}

/**
 * Check rule quality (average confidence)
 */
export async function checkQualityDegradation(): Promise<HealthCheckResult> {
  const warningConf = getThreshold("CONFIDENCE_WARNING")
  const criticalConf = getThreshold("CONFIDENCE_CRITICAL")
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const stats = await db.regulatoryRule.aggregate({
    where: { createdAt: { gte: cutoff } },
    _avg: { confidence: true },
    _count: { id: true },
  })

  const avgConfidence = stats._avg.confidence ?? 1
  let status: WatchdogHealthStatus = "HEALTHY"

  if (avgConfidence < criticalConf) {
    status = "CRITICAL"
    await raiseAlert({
      severity: "CRITICAL",
      type: "QUALITY_DEGRADATION",
      message: `Average rule confidence is ${(avgConfidence * 100).toFixed(1)}%`,
    })
  } else if (avgConfidence < warningConf) {
    status = "WARNING"
    await raiseAlert({
      severity: "WARNING",
      type: "QUALITY_DEGRADATION",
      message: `Average rule confidence is ${(avgConfidence * 100).toFixed(1)}%`,
    })
  }

  const result: HealthCheckResult = {
    checkType: "QUALITY_DEGRADATION",
    entityId: "global",
    status,
    metric: avgConfidence,
    threshold: status === "CRITICAL" ? criticalConf : warningConf,
    message: `Avg confidence: ${(avgConfidence * 100).toFixed(1)}% (${stats._count.id} rules)`,
  }

  await updateHealth(result)
  return result
}

/**
 * Check rejection rate
 */
export async function checkRejectionRate(): Promise<HealthCheckResult> {
  const warningRate = getThreshold("REJECTION_RATE_WARNING")
  const criticalRate = getThreshold("REJECTION_RATE_CRITICAL")
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const approved = await db.regulatoryRule.count({
    where: { status: "APPROVED", updatedAt: { gte: cutoff } },
  })
  const rejected = await db.regulatoryRule.count({
    where: { status: "REJECTED", updatedAt: { gte: cutoff } },
  })

  const total = approved + rejected
  const rejectionRate = total > 0 ? rejected / total : 0
  let status: WatchdogHealthStatus = "HEALTHY"

  if (rejectionRate >= criticalRate) {
    status = "CRITICAL"
    await raiseAlert({
      severity: "CRITICAL",
      type: "HIGH_REJECTION_RATE",
      message: `Rejection rate is ${(rejectionRate * 100).toFixed(1)}%`,
    })
  } else if (rejectionRate >= warningRate) {
    status = "WARNING"
    await raiseAlert({
      severity: "WARNING",
      type: "HIGH_REJECTION_RATE",
      message: `Rejection rate is ${(rejectionRate * 100).toFixed(1)}%`,
    })
  }

  const result: HealthCheckResult = {
    checkType: "REJECTION_RATE",
    entityId: "global",
    status,
    metric: rejectionRate,
    threshold: status === "CRITICAL" ? criticalRate : warningRate,
    message: `${(rejectionRate * 100).toFixed(1)}% rejection rate (${rejected}/${total})`,
  }

  await updateHealth(result)
  return result
}

/**
 * Run all health checks
 */
export async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
  console.log("[health] Running all health checks...")

  const results: HealthCheckResult[] = []

  const staleResults = await checkStaleSources()
  results.push(...staleResults)

  const failureResults = await checkScraperFailureRate()
  results.push(...failureResults)

  const qualityResult = await checkQualityDegradation()
  results.push(qualityResult)

  const rejectionResult = await checkRejectionRate()
  results.push(rejectionResult)

  const healthy = results.filter((r) => r.status === "HEALTHY").length
  const warning = results.filter((r) => r.status === "WARNING").length
  const critical = results.filter((r) => r.status === "CRITICAL").length

  console.log(`[health] Complete: ${healthy} healthy, ${warning} warnings, ${critical} critical`)

  return results
}
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/health-monitors.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/health-monitors.ts
git commit -m "feat(watchdog): add health monitor checks"
```

---

## Phase 5: Audit System

### Task 5.1: Implement Random Audit System

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/audit.ts`

**Step 1: Create audit system**

```typescript
// src/lib/regulatory-truth/watchdog/audit.ts

import { db } from "@/lib/db"
import type { AuditResult } from "@prisma/client"
import type { AuditReport, RuleAuditResult, AuditCheckResult } from "./types"
import { notifyAuditResult } from "./alerting"
import { createHash } from "crypto"

/**
 * Hash content for comparison
 */
function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

/**
 * Select a random run from the last 7 days
 * Weighted toward recent (50% chance of last 2 days)
 */
async function selectRandomRun(): Promise<Date | null> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentCutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

  // 50% chance to pick from last 2 days
  const useRecent = Math.random() < 0.5

  const rules = await db.regulatoryRule.findMany({
    where: {
      createdAt: { gte: useRecent ? recentCutoff : cutoff },
      status: { in: ["APPROVED", "PUBLISHED"] },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  if (rules.length === 0) return null

  // Get unique dates
  const dates = [...new Set(rules.map((r) => r.createdAt.toISOString().split("T")[0]))]
  const randomDate = dates[Math.floor(Math.random() * dates.length)]

  return new Date(randomDate)
}

/**
 * Select random rules from a run
 */
async function selectRandomRules(runDate: Date, count: number = 5) {
  const startOfDay = new Date(runDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(runDate)
  endOfDay.setHours(23, 59, 59, 999)

  const rules = await db.regulatoryRule.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ["APPROVED", "PUBLISHED"] },
    },
    include: {
      sourcePointers: {
        include: {
          evidence: true,
        },
      },
    },
  })

  if (rules.length === 0) return []

  // Shuffle and take count
  const shuffled = rules.sort(() => Math.random() - 0.5)

  // Try to include mix of high/low confidence
  const highConf = shuffled.filter((r) => r.confidence >= 0.9)
  const lowConf = shuffled.filter((r) => r.confidence < 0.9)

  const selected = []
  if (highConf.length > 0) selected.push(highConf[0])
  if (lowConf.length > 0) selected.push(lowConf[0])

  // Fill rest randomly
  const remaining = shuffled.filter((r) => !selected.includes(r))
  selected.push(...remaining.slice(0, count - selected.length))

  return selected.slice(0, count)
}

/**
 * Audit a single rule
 */
async function auditRule(
  rule: Awaited<ReturnType<typeof selectRandomRules>>[0]
): Promise<RuleAuditResult> {
  const checks: AuditCheckResult[] = []

  // Check 1: Evidence exists (weight 10)
  const hasEvidence =
    rule.sourcePointers.length > 0 && rule.sourcePointers.some((sp) => sp.evidence)
  checks.push({
    name: "evidence_exists",
    passed: hasEvidence,
    weight: 10,
    details: hasEvidence ? `${rule.sourcePointers.length} source pointers` : "No source pointers",
  })

  if (!hasEvidence) {
    // Can't do other checks without evidence
    return {
      ruleId: rule.id,
      conceptSlug: rule.conceptSlug,
      checks,
      score: 0,
      passed: false,
    }
  }

  const primaryPointer = rule.sourcePointers[0]
  const evidence = primaryPointer.evidence

  // Check 2: Quote in content (weight 8)
  const quoteExists = evidence?.content?.includes(primaryPointer.exactQuote) ?? false
  checks.push({
    name: "quote_in_content",
    passed: quoteExists,
    weight: 8,
    details: quoteExists ? "Quote found in content" : "Quote not found in content",
  })

  // Check 3: Content hash matches (weight 7) - skip if no stored hash
  if (evidence?.contentHash) {
    const currentHash = hashContent(evidence.content || "")
    const hashMatches = currentHash === evidence.contentHash
    checks.push({
      name: "content_hash_matches",
      passed: hashMatches,
      weight: 7,
      details: hashMatches ? "Content unchanged" : "Content has changed since extraction",
    })
  }

  // Check 4: URL still accessible (weight 5)
  let urlAccessible = false
  if (evidence?.url) {
    try {
      const response = await fetch(evidence.url, { method: "HEAD" })
      urlAccessible = response.ok
    } catch {
      urlAccessible = false
    }
  }
  checks.push({
    name: "url_still_accessible",
    passed: urlAccessible,
    weight: 5,
    details: urlAccessible ? "URL accessible" : "URL not accessible or 404",
  })

  // Check 5: Dates logical (weight 6)
  const effectiveUntil = rule.effectiveUntil ?? new Date("2100-01-01")
  const datesLogical = rule.effectiveFrom <= effectiveUntil
  checks.push({
    name: "dates_logical",
    passed: datesLogical,
    weight: 6,
    details: datesLogical
      ? `${rule.effectiveFrom.toISOString().split("T")[0]} to ${effectiveUntil.toISOString().split("T")[0]}`
      : "effectiveFrom > effectiveUntil",
  })

  // Check 6: Value extractable (weight 9)
  const valueInContent = evidence?.content?.includes(String(rule.value)) ?? false
  checks.push({
    name: "value_extractable",
    passed: valueInContent,
    weight: 9,
    details: valueInContent
      ? `Value "${rule.value}" found in content`
      : `Value "${rule.value}" not found`,
  })

  // Calculate score
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  const passedWeight = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0)
  const score = (passedWeight / totalWeight) * 100

  return {
    ruleId: rule.id,
    conceptSlug: rule.conceptSlug,
    checks,
    score,
    passed: score >= 70,
  }
}

/**
 * Run a random audit
 */
export async function runRandomAudit(): Promise<AuditReport | null> {
  console.log("[audit] Starting random audit...")

  const runDate = await selectRandomRun()
  if (!runDate) {
    console.log("[audit] No rules to audit")
    return null
  }

  console.log(`[audit] Selected run date: ${runDate.toISOString().split("T")[0]}`)

  const rules = await selectRandomRules(runDate, 5)
  if (rules.length === 0) {
    console.log("[audit] No rules found for selected date")
    return null
  }

  console.log(`[audit] Auditing ${rules.length} rules...`)

  const findings: RuleAuditResult[] = []
  for (const rule of rules) {
    const result = await auditRule(rule)
    findings.push(result)
    console.log(
      `[audit] ${rule.conceptSlug}: ${result.score.toFixed(1)}% (${result.passed ? "PASS" : "FAIL"})`
    )
  }

  const rulesPassed = findings.filter((f) => f.passed).length
  const rulesFailed = findings.length - rulesPassed
  const overallScore = findings.reduce((sum, f) => sum + f.score, 0) / findings.length

  let result: AuditResult = "PASS"
  if (overallScore < 70) result = "FAIL"
  else if (overallScore < 90) result = "PARTIAL"

  const report: AuditReport = {
    runDate,
    rulesAudited: findings.length,
    rulesPassed,
    rulesFailed,
    overallScore,
    result,
    findings,
  }

  // Store in database
  await db.watchdogAudit.create({
    data: {
      runDate,
      rulesAudited: report.rulesAudited,
      rulesPassed: report.rulesPassed,
      rulesFailed: report.rulesFailed,
      overallScore: report.overallScore,
      result: report.result,
      findings: report.findings as any,
      alertsRaised: [],
    },
  })

  // Notify
  await notifyAuditResult(report)

  console.log(`[audit] Complete: ${result} (${overallScore.toFixed(1)}%)`)

  return report
}
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/audit.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/audit.ts
git commit -m "feat(watchdog): add random audit system"
```

---

## Phase 6: Orchestrator & Scheduler

### Task 6.1: Implement Watchdog Orchestrator

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/orchestrator.ts`

**Step 1: Create orchestrator**

```typescript
// src/lib/regulatory-truth/watchdog/orchestrator.ts

import { runSentinel, fetchDiscoveredItems } from "../agents/sentinel"
import { runExtractor } from "../agents/extractor"
import { runComposer, groupSourcePointersByDomain } from "../agents/composer"
import { runReviewer, autoApproveEligibleRules } from "../agents/reviewer"
import { runArbiter } from "../agents/arbiter"
import { runReleaser } from "../agents/releaser"
import { buildKnowledgeGraph } from "../graph/knowledge-graph"
import { runAllHealthChecks } from "./health-monitors"
import { runRandomAudit } from "./audit"
import { sendDailyDigestEmail, raiseAlert } from "./alerting"
import { getRandomDelay, sleep } from "./rate-limiter"
import { db } from "@/lib/db"
import type { PhaseResult, WatchdogRunResult } from "./types"

const SCOUT_DELAY_MIN = 50000 // 50 seconds
const SCOUT_DELAY_MAX = 70000 // 70 seconds
const SCRAPE_DELAY_MIN = 20000 // 20 seconds
const SCRAPE_DELAY_MAX = 30000 // 30 seconds
const SCOUT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const SCRAPE_TIMEOUT_MS = 90 * 60 * 1000 // 90 minutes

/**
 * Run Scout Phase - check all endpoints for new items
 */
async function runScoutPhase(): Promise<PhaseResult> {
  const startedAt = new Date()
  let itemsProcessed = 0
  let itemsFailed = 0

  try {
    console.log("\n[watchdog] === SCOUT PHASE ===")

    // Get active endpoints
    const endpoints = await db.regulatorySource.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
    })

    const timeoutAt = Date.now() + SCOUT_TIMEOUT_MS

    for (const endpoint of endpoints) {
      if (Date.now() >= timeoutAt) {
        console.log("[watchdog] Scout phase timeout reached")
        break
      }

      // Random delay between scouts
      const delay = getRandomDelay(SCOUT_DELAY_MIN, SCOUT_DELAY_MAX)
      console.log(`[watchdog] Waiting ${(delay / 1000).toFixed(1)}s before next scout...`)
      await sleep(delay)

      try {
        // Run sentinel for this endpoint's priority
        const result = await runSentinel(endpoint.priority as any)
        itemsProcessed += result.endpointsChecked
        console.log(`[watchdog] Scouted ${endpoint.name}: ${result.newItemsDiscovered} new items`)
      } catch (error) {
        itemsFailed++
        console.error(`[watchdog] Scout failed for ${endpoint.name}:`, error)
      }
    }

    return {
      phase: "SCOUT",
      startedAt,
      completedAt: new Date(),
      success: true,
      itemsProcessed,
      itemsFailed,
    }
  } catch (error) {
    return {
      phase: "SCOUT",
      startedAt,
      completedAt: new Date(),
      success: false,
      itemsProcessed,
      itemsFailed,
      error: String(error),
    }
  }
}

/**
 * Run Scrape Phase - fetch discovered items
 */
async function runScrapePhase(): Promise<PhaseResult> {
  const startedAt = new Date()
  let itemsProcessed = 0
  let itemsFailed = 0

  try {
    console.log("\n[watchdog] === SCRAPE PHASE ===")

    const timeoutAt = Date.now() + SCRAPE_TIMEOUT_MS

    // Fetch in batches with random delays
    while (Date.now() < timeoutAt) {
      const delay = getRandomDelay(SCRAPE_DELAY_MIN, SCRAPE_DELAY_MAX)
      console.log(`[watchdog] Waiting ${(delay / 1000).toFixed(1)}s before next fetch batch...`)
      await sleep(delay)

      const result = await fetchDiscoveredItems(10)
      itemsProcessed += result.fetched
      itemsFailed += result.failed

      if (result.fetched === 0 && result.failed === 0) {
        console.log("[watchdog] No more items to fetch")
        break
      }

      console.log(`[watchdog] Fetched batch: ${result.fetched} success, ${result.failed} failed`)
    }

    return {
      phase: "SCRAPE",
      startedAt,
      completedAt: new Date(),
      success: true,
      itemsProcessed,
      itemsFailed,
    }
  } catch (error) {
    return {
      phase: "SCRAPE",
      startedAt,
      completedAt: new Date(),
      success: false,
      itemsProcessed,
      itemsFailed,
      error: String(error),
    }
  }
}

/**
 * Run Process Phase - extract, compose, review, release
 */
async function runProcessPhase(): Promise<PhaseResult> {
  const startedAt = new Date()
  let itemsProcessed = 0
  let itemsFailed = 0

  try {
    console.log("\n[watchdog] === PROCESS PHASE ===")

    // Extract from unprocessed evidence
    const unprocessedEvidence = await db.evidence.findMany({
      where: {
        sourcePointers: { none: {} },
      },
      take: 20,
    })

    for (const evidence of unprocessedEvidence) {
      try {
        await runExtractor(evidence.id)
        itemsProcessed++
      } catch (error) {
        itemsFailed++
        console.error(`[watchdog] Extract failed for ${evidence.id}:`, error)
      }
    }

    // Compose rules from ungrouped pointers
    const ungroupedPointers = await db.sourcePointer.findMany({
      where: {
        rules: { none: {} },
      },
    })

    if (ungroupedPointers.length > 0) {
      const grouped = groupSourcePointersByDomain(ungroupedPointers)
      for (const [domain, pointerIds] of Object.entries(grouped)) {
        try {
          await runComposer(pointerIds)
          itemsProcessed++
        } catch (error) {
          itemsFailed++
          console.error(`[watchdog] Compose failed for ${domain}:`, error)
        }
      }
    }

    // Review pending rules
    const pendingRules = await db.regulatoryRule.findMany({
      where: { status: "DRAFT" },
      take: 10,
    })

    for (const rule of pendingRules) {
      try {
        await runReviewer(rule.id)
        itemsProcessed++
      } catch (error) {
        itemsFailed++
        console.error(`[watchdog] Review failed for ${rule.id}:`, error)
      }
    }

    // Auto-approve eligible rules
    await autoApproveEligibleRules()

    // Resolve conflicts
    const openConflicts = await db.regulatoryConflict.findMany({
      where: { status: "OPEN" },
      take: 5,
    })

    for (const conflict of openConflicts) {
      try {
        await runArbiter(conflict.id)
        itemsProcessed++
      } catch (error) {
        itemsFailed++
        console.error(`[watchdog] Arbiter failed for ${conflict.id}:`, error)
      }
    }

    // Release approved rules
    const approvedRules = await db.regulatoryRule.findMany({
      where: {
        status: "APPROVED",
        releases: { none: {} },
      },
      take: 20,
    })

    if (approvedRules.length > 0) {
      try {
        await runReleaser(approvedRules.map((r) => r.id))
        itemsProcessed += approvedRules.length
      } catch (error) {
        itemsFailed += approvedRules.length
        console.error("[watchdog] Release failed:", error)
      }
    }

    // Build knowledge graph
    await buildKnowledgeGraph()

    return {
      phase: "PROCESS",
      startedAt,
      completedAt: new Date(),
      success: true,
      itemsProcessed,
      itemsFailed,
    }
  } catch (error) {
    return {
      phase: "PROCESS",
      startedAt,
      completedAt: new Date(),
      success: false,
      itemsProcessed,
      itemsFailed,
      error: String(error),
    }
  }
}

/**
 * Run Health Phase - check all health monitors
 */
async function runHealthPhase(): Promise<PhaseResult> {
  const startedAt = new Date()

  try {
    console.log("\n[watchdog] === HEALTH PHASE ===")

    const results = await runAllHealthChecks()
    const critical = results.filter((r) => r.status === "CRITICAL").length

    return {
      phase: "HEALTH",
      startedAt,
      completedAt: new Date(),
      success: critical === 0,
      itemsProcessed: results.length,
      itemsFailed: critical,
    }
  } catch (error) {
    return {
      phase: "HEALTH",
      startedAt,
      completedAt: new Date(),
      success: false,
      itemsProcessed: 0,
      itemsFailed: 0,
      error: String(error),
    }
  }
}

/**
 * Run the full watchdog pipeline
 */
export async function runWatchdogPipeline(): Promise<WatchdogRunResult> {
  const runId = `watchdog-${Date.now()}`
  const startedAt = new Date()
  const phases: PhaseResult[] = []
  const alertsRaised: string[] = []

  console.log("\n========================================")
  console.log("  WATCHDOG PIPELINE STARTING")
  console.log(`  Run ID: ${runId}`)
  console.log(`  Started: ${startedAt.toISOString()}`)
  console.log("========================================\n")

  try {
    // Phase 1: Scout
    const scoutResult = await runScoutPhase()
    phases.push(scoutResult)
    if (!scoutResult.success) {
      const alertId = await raiseAlert({
        severity: "CRITICAL",
        type: "PIPELINE_FAILURE",
        message: `Scout phase failed: ${scoutResult.error}`,
      })
      alertsRaised.push(alertId)
    }

    // Phase 2: Scrape
    const scrapeResult = await runScrapePhase()
    phases.push(scrapeResult)
    if (!scrapeResult.success) {
      const alertId = await raiseAlert({
        severity: "CRITICAL",
        type: "PIPELINE_FAILURE",
        message: `Scrape phase failed: ${scrapeResult.error}`,
      })
      alertsRaised.push(alertId)
    }

    // Phase 3: Process
    const processResult = await runProcessPhase()
    phases.push(processResult)
    if (!processResult.success) {
      const alertId = await raiseAlert({
        severity: "CRITICAL",
        type: "PIPELINE_FAILURE",
        message: `Process phase failed: ${processResult.error}`,
      })
      alertsRaised.push(alertId)
    }

    // Phase 4: Health checks
    const healthResult = await runHealthPhase()
    phases.push(healthResult)
  } catch (error) {
    console.error("[watchdog] Fatal error in pipeline:", error)
    const alertId = await raiseAlert({
      severity: "CRITICAL",
      type: "PIPELINE_FAILURE",
      message: `Pipeline fatal error: ${error}`,
    })
    alertsRaised.push(alertId)
  }

  const completedAt = new Date()
  const duration = (completedAt.getTime() - startedAt.getTime()) / 1000

  console.log("\n========================================")
  console.log("  WATCHDOG PIPELINE COMPLETE")
  console.log(`  Duration: ${duration.toFixed(1)}s`)
  console.log(`  Phases: ${phases.length}`)
  console.log(`  Alerts: ${alertsRaised.length}`)
  console.log("========================================\n")

  return {
    runId,
    startedAt,
    completedAt,
    phases,
    alertsRaised,
  }
}

/**
 * Run standalone audit (called separately from main pipeline)
 */
export async function runStandaloneAudit(): Promise<void> {
  console.log("\n[watchdog] Running standalone audit...")
  await runRandomAudit()
}

/**
 * Send daily digest (called at 08:00)
 */
export async function sendDigest(): Promise<void> {
  console.log("\n[watchdog] Sending daily digest...")
  await sendDailyDigestEmail()
}
```

**Step 2: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/watchdog/orchestrator.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/orchestrator.ts
git commit -m "feat(watchdog): add orchestrator with phased pipeline execution"
```

---

### Task 6.2: Update Scheduler with Watchdog Schedule

**Files:**

- Modify: `src/lib/regulatory-truth/scheduler/cron.ts`

**Step 1: Read current scheduler**

Read current file first.

**Step 2: Update scheduler with watchdog schedule**

```typescript
// src/lib/regulatory-truth/scheduler/cron.ts

import cron from "node-cron"
import { runWatchdogPipeline, runStandaloneAudit, sendDigest } from "../watchdog/orchestrator"

const TIMEZONE = process.env.WATCHDOG_TIMEZONE || "Europe/Zagreb"
const WATCHDOG_ENABLED = process.env.WATCHDOG_ENABLED === "true"

let isRunning = false

/**
 * Start the watchdog scheduler
 */
export function startScheduler(): void {
  if (!WATCHDOG_ENABLED) {
    console.log("[scheduler] Watchdog disabled via WATCHDOG_ENABLED env var")
    return
  }

  console.log("[scheduler] Starting watchdog scheduler...")
  console.log(`[scheduler] Timezone: ${TIMEZONE}`)

  // Main pipeline at 06:00 daily
  cron.schedule(
    "0 6 * * *",
    async () => {
      if (isRunning) {
        console.log("[scheduler] Pipeline already running, skipping")
        return
      }

      isRunning = true
      try {
        await runWatchdogPipeline()
      } finally {
        isRunning = false
      }
    },
    { timezone: TIMEZONE }
  )
  console.log("[scheduler] Scheduled: Main pipeline at 06:00")

  // Daily digest at 08:00
  cron.schedule(
    "0 8 * * *",
    async () => {
      await sendDigest()
    },
    { timezone: TIMEZONE }
  )
  console.log("[scheduler] Scheduled: Daily digest at 08:00")

  // Random audit 1: between 10:00-14:00
  const audit1Hour = 10 + Math.floor(Math.random() * 4)
  const audit1Minute = Math.floor(Math.random() * 60)
  cron.schedule(
    `${audit1Minute} ${audit1Hour} * * *`,
    async () => {
      await runStandaloneAudit()
    },
    { timezone: TIMEZONE }
  )
  console.log(
    `[scheduler] Scheduled: Audit 1 at ${audit1Hour}:${audit1Minute.toString().padStart(2, "0")}`
  )

  // Random audit 2: between 16:00-20:00 (50% chance)
  if (Math.random() < 0.5) {
    const audit2Hour = 16 + Math.floor(Math.random() * 4)
    const audit2Minute = Math.floor(Math.random() * 60)
    cron.schedule(
      `${audit2Minute} ${audit2Hour} * * *`,
      async () => {
        await runStandaloneAudit()
      },
      { timezone: TIMEZONE }
    )
    console.log(
      `[scheduler] Scheduled: Audit 2 at ${audit2Hour}:${audit2Minute.toString().padStart(2, "0")}`
    )
  }

  console.log("[scheduler] Watchdog scheduler started")
}

/**
 * Run pipeline manually (for testing)
 */
export async function runManually(): Promise<void> {
  if (isRunning) {
    throw new Error("Pipeline already running")
  }

  isRunning = true
  try {
    await runWatchdogPipeline()
  } finally {
    isRunning = false
  }
}
```

**Step 3: Verify compiles**

Run: `npx tsc --noEmit src/lib/regulatory-truth/scheduler/cron.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/regulatory-truth/scheduler/cron.ts
git commit -m "feat(watchdog): update scheduler with watchdog schedule"
```

---

### Task 6.3: Create Watchdog Index Export

**Files:**

- Create: `src/lib/regulatory-truth/watchdog/index.ts`

**Step 1: Create index file**

```typescript
// src/lib/regulatory-truth/watchdog/index.ts

export * from "./types"
export * from "./rate-limiter"
export * from "./content-chunker"
export * from "./alerting"
export * from "./health-monitors"
export * from "./audit"
export * from "./orchestrator"
export { sendCriticalAlert, sendAuditResult } from "./slack"
export { sendCriticalEmail, sendDailyDigest } from "./email"
```

**Step 2: Commit**

```bash
git add src/lib/regulatory-truth/watchdog/index.ts
git commit -m "feat(watchdog): add index export"
```

---

## Phase 7: Environment & Documentation

### Task 7.1: Update Environment Variables

**Files:**

- Modify: `.env.example` (or create if doesn't exist)

**Step 1: Add watchdog env vars**

```env
# Watchdog Configuration
WATCHDOG_ENABLED=true
WATCHDOG_TIMEZONE=Europe/Zagreb

# Timing
SCOUT_START_HOUR=6
SCOUT_TIMEOUT_MINUTES=30
SCRAPE_TIMEOUT_HOUR=8

# Alerting
ADMIN_ALERT_EMAIL=admin@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_CHANNEL=#fiskai-alerts

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@fiskai.hr

# Thresholds (optional - defaults shown)
STALE_SOURCE_WARNING_DAYS=7
STALE_SOURCE_CRITICAL_DAYS=14
FAILURE_RATE_WARNING=0.3
FAILURE_RATE_CRITICAL=0.5
CONFIDENCE_WARNING=0.85
CONFIDENCE_CRITICAL=0.75
REJECTION_RATE_WARNING=0.4
REJECTION_RATE_CRITICAL=0.6
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add watchdog environment variables"
```

---

### Task 7.2: Final Integration Test

**Step 1: Run TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run Prisma generate**

Run: `npx prisma generate`
Expected: Success

**Step 3: Test import**

Run: `node -e "require('./src/lib/regulatory-truth/watchdog')"`
Expected: No errors (or expected module system error)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(watchdog): complete watchdog system implementation"
```

---

## Summary

This implementation plan covers:

1. **Phase 1**: Database schema (3 new tables: WatchdogHealth, WatchdogAlert, WatchdogAudit)
2. **Phase 2**: Rate limiting (per-domain delays) and content chunking (4000 token limit)
3. **Phase 3**: Alerting system (Slack, Email, unified alert manager)
4. **Phase 4**: Health monitors (stale sources, failure rate, quality, rejection rate)
5. **Phase 5**: Random audit system (trace source-to-DB, quality scoring)
6. **Phase 6**: Orchestrator and scheduler (phased execution, cron jobs)
7. **Phase 7**: Environment configuration and documentation

Total: **14 tasks** across **7 phases**

New files created:

- `src/lib/regulatory-truth/watchdog/types.ts`
- `src/lib/regulatory-truth/watchdog/rate-limiter.ts`
- `src/lib/regulatory-truth/watchdog/content-chunker.ts`
- `src/lib/regulatory-truth/watchdog/slack.ts`
- `src/lib/regulatory-truth/watchdog/email.ts`
- `src/lib/regulatory-truth/watchdog/alerting.ts`
- `src/lib/regulatory-truth/watchdog/health-monitors.ts`
- `src/lib/regulatory-truth/watchdog/audit.ts`
- `src/lib/regulatory-truth/watchdog/orchestrator.ts`
- `src/lib/regulatory-truth/watchdog/index.ts`

Modified files:

- `prisma/schema.prisma`
- `src/lib/regulatory-truth/scheduler/cron.ts`
- `.env.example`
