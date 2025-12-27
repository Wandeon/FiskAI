# Adaptive Sentinel Architecture Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Sentinel from a static, rules-based scraper into an adaptive, topology-aware crawler that prioritizes URLs based on velocity (change frequency) and risk (business impact).

**Architecture:** Pure Item-Level Scheduling with Host Grouping. Each `DiscoveredItem` maintains its own `nextScanDue` calculated from EWMA velocity and freshness risk. The scheduler groups due items by endpoint for rate-limited execution.

**Tech Stack:** Prisma migrations, TypeScript utilities, PostgreSQL indexes

---

## 1. Schema Changes

### New Enums

```prisma
enum NodeType {
  HUB    // Container page (lists, indexes, sitemaps)
  LEAF   // Content page (articles, regulations)
  ASSET  // Binary file (PDF, DOCX, XLS)
}

enum NodeRole {
  ARCHIVE      // Historical (/archive/, /2020/)
  INDEX        // Navigation/pagination
  NEWS_FEED    // High velocity (/vijesti/, /news/)
  REGULATION   // Core legal text
  FORM         // Downloadable forms (/obrasci/)
  GUIDANCE     // Official guidance (/upute/, /misljenja/)
}

enum FreshnessRisk {
  CRITICAL    // VAT rates, deadlines - hours matter
  HIGH        // New laws, gazette items
  MEDIUM      // Standard content
  LOW         // Archives, FAQs
}
```

### Updated DiscoveredItem Model

```prisma
model DiscoveredItem {
  // ... existing fields ...

  // --- Topology ---
  nodeType      NodeType   @default(LEAF)
  nodeRole      NodeRole?
  parentUrl     String?
  depth         Int        @default(0)

  // --- Velocity (EWMA: 0.0=static, 1.0=volatile) ---
  changeFrequency  Float      @default(0.5)
  lastChangedAt    DateTime?
  scanCount        Int        @default(0)  // For EWMA warmup

  // --- Risk ---
  freshnessRisk    FreshnessRisk  @default(MEDIUM)

  // --- Scheduling ---
  nextScanDue      DateTime   @default(now())

  @@index([nextScanDue, freshnessRisk])  // The "Manifest" query
  @@index([endpointId, nodeType])        // Grouping queries
}
```

**Key decisions:**

- `scanCount` for EWMA warmup (first 3 scans stay neutral)
- `lastChangedAt` nullable (null = never scanned, neutral velocity)
- Primary sort by `freshnessRisk`, not endpoint priority (avoids JOIN)

---

## 2. The Classifier (On Discovery)

Classifies URLs immediately upon discovery using URL patterns.

### Pattern Definitions

```typescript
const ROLE_PATTERNS: Array<{
  pattern: RegExp
  role: NodeRole
  risk: FreshnessRisk
  isHubCandidate: boolean
}> = [
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
```

### Classification Function

```typescript
interface ClassificationResult {
  nodeType: NodeType
  nodeRole: NodeRole | null
  freshnessRisk: FreshnessRisk
}

function classifyUrl(url: string, contentType?: string): ClassificationResult {
  // 1. Check for binary assets first
  if (
    ASSET_EXTENSIONS.test(url) ||
    contentType?.includes("pdf") ||
    contentType?.includes("document")
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
```

**Asset Risk Inheritance:** Handle at call site, not in pure function:

```typescript
const classification = classifyUrl(newLink)
if (classification.nodeType === "ASSET" && parentRisk === "CRITICAL") {
  classification.freshnessRisk = "CRITICAL"
}
```

---

## 3. The Profiler (EWMA Velocity)

Updates velocity score after each scan using Exponential Weighted Moving Average.

### EWMA Parameters

- **α (change):** 0.3 - React quickly to changes
- **α (stable):** 0.1 - Decay slowly on stability
- **Warmup:** First 3 scans stay at 0.5 (neutral)
- **Clamp:** [0.01, 0.99] to avoid extremes

### Velocity Function

```typescript
interface VelocityUpdate {
  newFrequency: number
  lastChangedAt: Date | null
}

function updateVelocity(
  currentFrequency: number,
  scanCount: number,
  contentChanged: boolean
): VelocityUpdate {
  const WARMUP_SCANS = 3
  const ALPHA_CHANGE = 0.3
  const ALPHA_STABLE = 0.1

  // During warmup, stay neutral
  if (scanCount < WARMUP_SCANS) {
    return {
      newFrequency: 0.5,
      lastChangedAt: contentChanged ? new Date() : null,
    }
  }

  // After warmup, apply EWMA
  const alpha = contentChanged ? ALPHA_CHANGE : ALPHA_STABLE
  const signal = contentChanged ? 1.0 : 0.0

  // EWMA: new = α * signal + (1 - α) * old
  const newFrequency = alpha * signal + (1 - alpha) * currentFrequency
  const clamped = Math.max(0.01, Math.min(0.99, newFrequency))

  return {
    newFrequency: clamped,
    lastChangedAt: contentChanged ? new Date() : null,
  }
}
```

### Behavior Characteristics

| Scenario       | After 5 stable scans | After 1 change |
| -------------- | -------------------- | -------------- |
| New (0.50)     | 0.30                 | 0.51           |
| Hot (0.80)     | 0.52                 | 0.86           |
| Archive (0.10) | 0.06                 | 0.37           |

**Asymmetric design:** One change wakes a dormant page; five stable scans needed to go back to sleep.

---

## 4. The Scheduler (nextScanDue)

Calculates next scan time from velocity and risk.

### Risk Factors

```typescript
const RISK_FACTORS: Record<FreshnessRisk, number> = {
  CRITICAL: 4.0, // 4x more frequent
  HIGH: 2.0, // 2x more frequent
  MEDIUM: 1.0, // Baseline
  LOW: 0.5, // Half as frequent
}

const DEFAULT_CONFIG = {
  baseIntervalHours: 4, // Minimum 4 hours
  maxIntervalHours: 720, // Maximum 30 days
}
```

### Scheduling Function

```typescript
function calculateNextScan(
  changeFrequency: number,
  freshnessRisk: FreshnessRisk,
  config = DEFAULT_CONFIG
): Date {
  const riskFactor = RISK_FACTORS[freshnessRisk]
  const velocityFactor = Math.max(0.01, changeFrequency)

  // Formula: base / (velocity * risk)
  let intervalHours = config.baseIntervalHours / (velocityFactor * riskFactor)

  // Clamp to bounds
  intervalHours = Math.max(config.baseIntervalHours, intervalHours)
  intervalHours = Math.min(config.maxIntervalHours, intervalHours)

  // Jitter: +/- 10% to prevent sync storms
  const jitter = 1 + (Math.random() * 0.2 - 0.1)
  intervalHours = intervalHours * jitter

  const nextScan = new Date()
  nextScan.setTime(nextScan.getTime() + intervalHours * 60 * 60 * 1000)
  return nextScan
}
```

### Resulting Intervals

| Risk     | Velocity 0.1 | Velocity 0.5 | Velocity 0.9 |
| -------- | ------------ | ------------ | ------------ |
| CRITICAL | 10h          | 4h (floor)   | 4h (floor)   |
| HIGH     | 20h          | 4h           | 4h           |
| MEDIUM   | 40h          | 8h           | 4.4h         |
| LOW      | 80h          | 16h          | 8.8h         |

---

## 5. The Executor (Polite Batcher)

Prevents overwhelming target servers.

### Execution Flow

```typescript
async function runSentinelCycle() {
  // 1. Fetch the "Manifest" - items due for scanning
  const dueItems = await db.discoveredItem.findMany({
    where: { nextScanDue: { lte: new Date() } },
    orderBy: [{ freshnessRisk: "desc" }, { nextScanDue: "asc" }],
    take: 500,
    include: { endpoint: true },
  })

  // 2. Group by endpoint for rate limiting
  const batches = groupBy(dueItems, (item) => item.endpointId)

  // 3. Execute with per-host concurrency limits
  for (const [endpointId, items] of Object.entries(batches)) {
    await processBatchWithRateLimit(endpointId, items, {
      maxConcurrent: 2,
      delayMinMs: 2000,
      delayMaxMs: 5000,
    })
  }
}
```

### Key Constraints

- **Max 500 items per cycle** - Prevents runaway scans
- **Max 2 concurrent requests per host** - Respects server limits
- **2-5 second random delay** - Avoids detection patterns

---

## 6. Migration Strategy

### Phase 1: Schema Migration

Add new fields with defaults, preserving existing data.

### Phase 2: Backfill Classification

Run classifier on existing DiscoveredItems to populate nodeType, nodeRole, freshnessRisk.

### Phase 3: Initialize Scheduling

Set nextScanDue based on current freshnessRisk (velocity starts at 0.5).

### Phase 4: Deprecate Legacy

Mark `DiscoveryEndpoint.scrapeFrequency` as deprecated (keep for rollback).

---

## 7. Files to Create/Modify

### New Files

- `src/lib/regulatory-truth/utils/node-classifier.ts`
- `src/lib/regulatory-truth/utils/velocity-profiler.ts`
- `src/lib/regulatory-truth/utils/scan-scheduler.ts`
- `prisma/migrations/YYYYMMDD_adaptive_sentinel/migration.sql`

### Modified Files

- `prisma/schema.prisma` - Add enums and fields
- `src/lib/regulatory-truth/agents/sentinel.ts` - Integrate new logic
- `src/lib/regulatory-truth/agents/site-crawler.ts` - Use classifier on discovery

---

## 8. Success Metrics

- **Efficiency:** 80%+ reduction in unnecessary scans of static pages
- **Coverage:** No missed CRITICAL changes within 4 hours
- **Politeness:** No IP bans from target servers
- **Velocity accuracy:** EWMA stabilizes within 5 scans for new items
