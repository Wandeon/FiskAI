# Croatian Regulatory Truth Layer - Finalization Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-ready, self-healing, observable regulatory knowledge base from Croatian government sources with a 06:00 AM daily cycle.

**Date:** 2025-12-21

---

## 1. Executive Summary

This design finalizes the Croatian Regulatory Truth Layer system based on comprehensive discovery scans of all 6 primary Croatian government sources. The system will:

1. **Discover** new regulatory content through sitemap and listing page monitoring
2. **Extract** specific regulatory facts (rates, thresholds, deadlines) using AI agents
3. **Compose** rules from extracted pointers
4. **Review** rules for accuracy and conflicts
5. **Release** validated rules to the knowledge base

### Key Discovery Findings

| Source              | Endpoints         | Has RSS? | Method        | Update Frequency |
| ------------------- | ----------------- | -------- | ------------- | ---------------- |
| Narodne novine      | Sitemap + 3 types | No       | Sitemap XML   | Daily            |
| Porezna uprava      | 12+ sections      | No       | HTML scraping | Daily/Weekly     |
| HZZO                | 17+ endpoints     | No       | HTML scraping | Daily            |
| HZMO                | 28+ sections      | No       | HTML scraping | Daily            |
| FINA                | 12+ sections      | No       | HTML scraping | Daily/Weekly     |
| Ministry of Finance | 15+ categories    | No       | HTML scraping | Daily            |

**Critical Finding:** No RSS feeds or APIs available on any source. All monitoring requires HTML/XML scraping with 2-second rate limiting.

---

## 2. Discovery Endpoints Architecture

### 2.1 Database Schema Extension

```prisma
model DiscoveryEndpoint {
  id              String   @id @default(cuid())
  domain          String   // e.g., "hzzo.hr"
  path            String   // e.g., "/novosti"
  name            String   // Human-readable name
  endpointType    DiscoveryEndpointType
  priority        DiscoveryPriority
  scrapeFrequency ScrapeFrequency
  listingStrategy ListingStrategy
  urlPattern      String?  // Regex for extracting item URLs
  paginationPattern String? // e.g., "?page={N}"
  lastScrapedAt   DateTime?
  lastContentHash String?  // SHA-256 of page content
  itemCount       Int      @default(0)
  errorCount      Int      @default(0)
  lastError       String?
  isActive        Boolean  @default(true)
  metadata        Json?    // Additional endpoint-specific config
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  discoveries     DiscoveredItem[]
}

enum DiscoveryEndpointType {
  SITEMAP_INDEX   // Narodne novine main sitemap
  SITEMAP_ISSUE   // Individual issue sitemaps
  NEWS_LISTING    // Paginated news pages
  LEGAL_ACTS      // Regulations pages
  CONSULTATIONS   // Public consultation sections
  TECHNICAL_DOCS  // Technical specifications
  FORMS           // Official forms
  CODE_LISTS      // Šifrarnici / classification codes
  ANNOUNCEMENTS   // Official announcements
  STATISTICS      // Statistical publications
}

enum DiscoveryPriority {
  CRITICAL  // Check every run
  HIGH      // Check daily
  MEDIUM    // Check every 2-3 days
  LOW       // Check weekly
}

enum ScrapeFrequency {
  EVERY_RUN    // Check on every sentinel run
  DAILY        // Once per day
  TWICE_WEEKLY // Monday and Thursday
  WEEKLY       // Once per week
  MONTHLY      // Once per month
}

enum ListingStrategy {
  SITEMAP_XML     // Parse XML sitemap
  HTML_LIST       // Extract links from HTML list
  HTML_TABLE      // Extract from HTML table
  PAGINATION      // Follow pagination links
  DATE_FILTERED   // Use date range filters
}

model DiscoveredItem {
  id              String   @id @default(cuid())
  endpointId      String
  endpoint        DiscoveryEndpoint @relation(fields: [endpointId], references: [id])
  url             String
  title           String?
  publishedAt     DateTime?
  contentHash     String?
  status          DiscoveredItemStatus @default(PENDING)
  processedAt     DateTime?
  evidenceId      String?  // Link to Evidence if fetched
  createdAt       DateTime @default(now())

  @@unique([endpointId, url])
  @@index([status])
  @@index([publishedAt])
}

enum DiscoveredItemStatus {
  PENDING         // Not yet fetched
  FETCHED         // Content retrieved, awaiting processing
  PROCESSED       // Sent to extraction pipeline
  SKIPPED         // Determined not relevant
  FAILED          // Fetch or processing failed
}
```

### 2.2 Endpoint Registry

Based on discovery scans, register these endpoints:

#### Tier 1: Critical (Every Run)

| Domain                | Path                                                       | Type          | Strategy    |
| --------------------- | ---------------------------------------------------------- | ------------- | ----------- |
| narodne-novine.nn.hr  | /sitemap.xml                                               | SITEMAP_INDEX | SITEMAP_XML |
| hzzo.hr               | /novosti                                                   | NEWS_LISTING  | PAGINATION  |
| hzzo.hr               | /pravni-akti                                               | LEGAL_ACTS    | HTML_LIST   |
| hzzo.hr               | /pravo-na-pristup-informacijama/savjetovanje-s-javnoscu... | CONSULTATIONS | HTML_LIST   |
| mirovinsko.hr         | /hr/vijesti/114                                            | NEWS_LISTING  | PAGINATION  |
| mirovinsko.hr         | /hr/priopcenja-204/204                                     | NEWS_LISTING  | PAGINATION  |
| mirovinsko.hr         | /hr/propisi/54                                             | LEGAL_ACTS    | HTML_LIST   |
| porezna-uprava.gov.hr | /hr/vijesti/8                                              | NEWS_LISTING  | PAGINATION  |
| porezna-uprava.gov.hr | /hr/misljenja-su/3951                                      | NEWS_LISTING  | PAGINATION  |
| fina.hr               | /obavijesti/fina-e-racun                                   | ANNOUNCEMENTS | PAGINATION  |
| fina.hr               | /novosti                                                   | NEWS_LISTING  | PAGINATION  |
| mfin.gov.hr           | /vijesti/8                                                 | NEWS_LISTING  | PAGINATION  |

#### Tier 2: High Priority (Daily)

| Domain                | Path                                                  | Type           | Strategy   |
| --------------------- | ----------------------------------------------------- | -------------- | ---------- |
| hzzo.hr               | /e-zdravstveno/novosti                                | NEWS_LISTING   | HTML_LIST  |
| hzzo.hr               | /poslovni-subjekti/hzzo-za-partnere/sifrarnici-hzzo-0 | CODE_LISTS     | HTML_LIST  |
| hzzo.hr               | /zdravstvena-zastita/objavljene-liste-lijekova        | TECHNICAL_DOCS | HTML_LIST  |
| mirovinsko.hr         | /hr/doplatak-za-djecu/12                              | LEGAL_ACTS     | HTML_LIST  |
| mirovinsko.hr         | /hr/statistika/860                                    | STATISTICS     | HTML_LIST  |
| porezna-uprava.gov.hr | /hr/propisi-3950/3950                                 | LEGAL_ACTS     | HTML_LIST  |
| porezna.gov.hr        | /fiskalizacija/gotovinski-racuni                      | TECHNICAL_DOCS | HTML_LIST  |
| fina.hr               | /obavijesti/e-racun-u-javnoj-nabavi                   | ANNOUNCEMENTS  | PAGINATION |
| fina.hr               | /obavijesti/digitalni-certifikati                     | ANNOUNCEMENTS  | PAGINATION |
| mfin.gov.hr           | /istaknute-teme/zakoni-i-propisi/523                  | LEGAL_ACTS     | HTML_LIST  |

#### Tier 3: Medium Priority (2-3x per week)

| Domain                | Path                                                             | Type           | Strategy  |
| --------------------- | ---------------------------------------------------------------- | -------------- | --------- |
| hzzo.hr               | /natjecaji                                                       | ANNOUNCEMENTS  | HTML_LIST |
| hzzo.hr               | /o-nama/upravno-vijece/odluke-uv                                 | LEGAL_ACTS     | HTML_LIST |
| mirovinsko.hr         | /hr/tiskanice-1098/1098                                          | FORMS          | HTML_LIST |
| mirovinsko.hr         | /hr/prijave-i-odjave-na-osiguranje/234                           | LEGAL_ACTS     | HTML_LIST |
| porezna-uprava.gov.hr | /hr/pitanja-i-odgovori-vezani-uz-zakon-o-fiskalizaciji-8031/8031 | ANNOUNCEMENTS  | HTML_LIST |
| porezna-uprava.gov.hr | /hr/propisani-obrasci/3955                                       | FORMS          | HTML_LIST |
| fina.hr               | /digitalizacija-poslovanja/e-racun                               | TECHNICAL_DOCS | HTML_LIST |
| mfin.gov.hr           | /istaknute-teme/javne-konzultacije/524                           | CONSULTATIONS  | HTML_LIST |

---

## 3. Daily Cycle Architecture

### 3.1 Schedule (06:00 AM Start)

```
06:00 - 06:30  Phase 1: Sitemap & Index Discovery
06:30 - 10:00  Phase 2: Content Fetching (with rate limits)
10:00 - 12:00  Phase 3: Extraction (AI agents)
12:00 - 13:00  Phase 4: Composition
13:00 - 14:00  Phase 5: Review
14:00 - 14:30  Phase 6: Release
14:30 - 15:00  Phase 7: Monitoring & Reporting
```

### 3.2 Sentinel Agent Enhancement

The Sentinel agent becomes the orchestrator of the discovery phase:

```typescript
interface SentinelConfig {
  // Rate limiting
  requestDelayMs: 2000 // 2 seconds between requests
  maxRequestsPerDomain: 100 // Per run
  maxConcurrentDomains: 2 // Parallel domain processing

  // Error handling
  maxRetries: 3
  retryDelayMs: 30000 // 30 seconds
  circuitBreakerThreshold: 5 // Consecutive failures before skip

  // Content detection
  minContentChange: 0.05 // 5% content change threshold
  hashAlgorithm: "sha256"

  // Scheduling
  startTime: "06:00"
  timezone: "Europe/Zagreb"
  maxRunDurationMinutes: 120
}
```

### 3.3 Discovery Flow

```
1. Load all active DiscoveryEndpoints
2. Filter by ScrapeFrequency (is it time to check?)
3. Sort by Priority (CRITICAL first)
4. For each endpoint:
   a. Fetch content with rate limiting
   b. Compare hash to detect changes
   c. Extract new item URLs
   d. Create DiscoveredItem records for new URLs
   e. Update endpoint metadata
5. Queue discovered items for content fetching
6. Fetch item content (with rate limiting)
7. Create Evidence records for new content
8. Mark items as FETCHED or FAILED
```

---

## 4. Idempotency & Safety

### 4.1 Idempotency Guarantees

1. **Discovery is additive only**
   - Never delete DiscoveredItems
   - Status transitions: PENDING → FETCHED → PROCESSED
   - Failed items can be retried

2. **Content hashing prevents duplicates**
   - SHA-256 hash of normalized content
   - Same content = skip processing
   - Content changes trigger re-processing

3. **Unique constraints prevent duplicates**
   - DiscoveredItem: unique on [endpointId, url]
   - Evidence: unique on [sourceId, contentHash]
   - SourcePointer: unique on [evidenceId, pointerHash]

### 4.2 Derailment Prevention

```typescript
interface SafetyConfig {
  // Processing limits
  maxItemsPerRun: 500 // Don't process more than 500 items
  maxEvidencePerSource: 100 // Don't create too many Evidence records
  maxPointersPerEvidence: 50 // Limit extraction output

  // Time limits
  maxAgentRunMinutes: 30 // Single agent timeout
  maxPipelineRunMinutes: 480 // 8 hours total

  // Error thresholds
  maxConsecutiveErrors: 10 // Stop domain after 10 errors
  maxErrorRate: 0.3 // 30% error rate triggers pause

  // Circuit breakers
  enableCircuitBreakers: true
  circuitBreakerResetMinutes: 60
}
```

### 4.3 Recovery Mechanisms

1. **Automatic retry with backoff**
   - Retry 1: 30 seconds
   - Retry 2: 60 seconds
   - Retry 3: 120 seconds
   - Then mark as FAILED

2. **Circuit breaker per domain**
   - 5 consecutive failures = skip domain
   - Auto-reset after 60 minutes
   - Manual reset via admin UI

3. **Checkpoint and resume**
   - Save progress after each Evidence creation
   - On crash, resume from last checkpoint
   - Never re-process already processed items

---

## 5. Monitoring & Observability

### 5.1 Metrics Collection

```typescript
interface PipelineMetrics {
  // Discovery metrics
  endpointsChecked: number
  newItemsDiscovered: number
  itemsFetched: number
  fetchErrors: number

  // Processing metrics
  evidenceCreated: number
  pointersExtracted: number
  rulesComposed: number
  rulesReleased: number

  // Performance metrics
  avgFetchTimeMs: number
  avgExtractionTimeMs: number
  totalRunTimeMinutes: number

  // Error metrics
  agentFailures: number
  validationErrors: number
  rateLimitHits: number

  // Quality metrics
  extractionConfidence: number // Average confidence
  conflictsDetected: number
  humanReviewRequired: number
}
```

### 5.2 Admin Dashboard Requirements

```typescript
interface AdminDashboard {
  // Real-time status
  currentPhase: PipelinePhase
  runProgress: number // 0-100%
  activeAgents: number
  queuedItems: number

  // Endpoint health
  endpointStatus: Map<string, EndpointHealth>
  // {
  //   "hzzo.hr/novosti": { status: "healthy", lastCheck: Date, itemsToday: 5 }
  // }

  // Recent activity
  recentDiscoveries: DiscoveredItem[]
  recentExtractions: SourcePointer[]
  recentRules: Rule[]
  recentErrors: PipelineError[]

  // Actions
  triggerManualRun(): void
  pausePipeline(): void
  resumePipeline(): void
  resetCircuitBreaker(domain: string): void
  reprocessItem(itemId: string): void
}
```

### 5.3 Alerting Rules

```typescript
const alertRules = [
  {
    name: "high-error-rate",
    condition: "errorRate > 0.3",
    severity: "critical",
    action: "pause-pipeline",
  },
  {
    name: "domain-circuit-breaker",
    condition: "circuitBreakerTripped",
    severity: "warning",
    action: "notify-admin",
  },
  {
    name: "extraction-quality-drop",
    condition: "avgConfidence < 0.6",
    severity: "warning",
    action: "notify-admin",
  },
  {
    name: "no-discoveries",
    condition: "newItemsDiscovered === 0 for 3 days",
    severity: "warning",
    action: "check-endpoints",
  },
  {
    name: "run-timeout",
    condition: "runDuration > maxPipelineRunMinutes",
    severity: "critical",
    action: "abort-run",
  },
]
```

---

## 6. Content Processing Strategies

### 6.1 Narodne novine (Sitemap-based)

```typescript
const nnStrategy = {
  domain: "narodne-novine.nn.hr",
  discovery: {
    mainSitemap: "/sitemap.xml",
    issueSitemapPattern: /sitemap_(\d)_(\d{4})_(\d+)\.xml/,
    // sitemap_1_2025_1.xml = Type 1 (Službeni), Year 2025, Issue 1
  },
  extraction: {
    // ELI URLs preferred for structured access
    articlePattern: /\/eli\/(sluzbeni|medunarodni)\/(\d{4})\/(\d+)\/(\d+)/,
    // /eli/sluzbeni/2025/1/1 = Official, Year 2025, Issue 1, Article 1
  },
  relevanceFilter: {
    // Only process official section (type 1) by default
    allowedTypes: [1, 2], // 1=Službeni, 2=Međunarodni
    skipOglasni: true, // Skip announcements (type 3)
  },
}
```

### 6.2 Paginated News Sites

```typescript
const newsStrategy = {
  domains: ["hzzo.hr", "mirovinsko.hr", "porezna-uprava.gov.hr", "mfin.gov.hr", "fina.hr"],
  discovery: {
    paginationParam: "page",
    maxPages: 5, // Don't go beyond page 5
    itemSelector: "article, .news-item, .vijest",
    dateSelector: ".date, time, .datum",
    titleSelector: "h2, h3, .title",
    linkSelector: "a[href]",
  },
  changeDetection: {
    // Hash first page to detect new content
    hashFirstPage: true,
    // Only fetch new items (compare URLs)
    incrementalOnly: true,
  },
}
```

### 6.3 Legal Acts & Regulations

```typescript
const regulationStrategy = {
  domains: ["hzzo.hr", "mirovinsko.hr", "porezna-uprava.gov.hr"],
  extraction: {
    // Look for Narodne novine references
    nnReferencePattern: /(?:NN|Narodne novine)[,\s]*(?:br\.)?\s*(\d+\/\d+)/g,
    // e.g., "NN 127/25" or "Narodne novine, br. 137/24"

    // Extract document type
    documentTypes: [
      "Zakon", // Law
      "Pravilnik", // Regulation
      "Uredba", // Ordinance
      "Odluka", // Decision
      "Naredba", // Order
      "Uputa", // Instruction
    ],
  },
  crossReference: {
    // Link to Narodne novine for full text
    generateNNUrl: (ref: string) =>
      `https://narodne-novine.nn.hr/clanci/sluzbeni/${ref.replace("/", "_")}.html`,
  },
}
```

---

## 7. Rate Limiting Implementation

### 7.1 Per-Domain Rate Limiter

```typescript
class DomainRateLimiter {
  private queues: Map<string, RequestQueue>
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    this.queues = new Map()
  }

  async request(domain: string, url: string): Promise<Response> {
    const queue = this.getOrCreateQueue(domain)

    // Wait for rate limit
    await queue.waitForSlot()

    // Execute request
    const start = Date.now()
    const response = await fetch(url, {
      headers: {
        "User-Agent": "FiskAI/1.0 (regulatory-monitoring; +https://fiskai.hr)",
        Accept: "text/html,application/xhtml+xml,application/xml",
        "Accept-Language": "hr,en;q=0.9",
      },
    })

    // Track timing
    const duration = Date.now() - start
    queue.recordRequest(duration)

    // Ensure minimum delay before next request
    await this.delay(this.config.requestDelayMs)

    return response
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

interface RateLimitConfig {
  requestDelayMs: 2000 // 2 seconds between requests
  maxRequestsPerMinute: 30 // ~1 request per 2 seconds
  maxRequestsPerHour: 1000 // Hard limit
  maxConcurrentRequests: 2 // Per domain
}
```

### 7.2 Gentle Crawl Pattern

```typescript
const gentleCrawlConfig = {
  // Time distribution across 24 hours
  schedule: {
    // Start at 06:00, complete by 06:00 next day
    startHour: 6,
    endHour: 6, // Next day

    // Distribute work across time windows
    windows: [
      { start: "06:00", end: "10:00", priority: "CRITICAL" },
      { start: "10:00", end: "14:00", priority: "HIGH" },
      { start: "14:00", end: "18:00", priority: "MEDIUM" },
      { start: "18:00", end: "22:00", priority: "LOW" },
      { start: "22:00", end: "06:00", priority: "RETRY" },
    ],
  },

  // Domain rotation
  rotation: {
    // Don't hit same domain consecutively
    minDomainGapRequests: 5,

    // Round-robin across domains
    strategy: "round-robin",
  },

  // Backoff on errors
  backoff: {
    initial: 2000, // 2 seconds
    multiplier: 2, // Double each time
    max: 120000, // 2 minutes max
  },
}
```

---

## 8. Integration with Existing Pipeline

### 8.1 Modified Agent Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     REGULATORY TRUTH PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌───────────┐   │
│  │ SENTINEL │ → │ Discovery │ → │ EXTRACTOR│ → │ Extraction│   │
│  │  Agent   │   │  Fetching │   │  Agent   │   │ Validation│   │
│  └──────────┘   └───────────┘   └──────────┘   └───────────┘   │
│       ↓                              ↓                          │
│  ┌──────────┐                   ┌──────────┐                    │
│  │ Endpoint │                   │ Source   │                    │
│  │ Registry │                   │ Pointers │                    │
│  └──────────┘                   └──────────┘                    │
│                                      ↓                          │
│  ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌───────────┐   │
│  │ COMPOSER │ → │ Rule Draft│ → │ REVIEWER │ → │ Conflict  │   │
│  │  Agent   │   │           │   │  Agent   │   │ Detection │   │
│  └──────────┘   └───────────┘   └──────────┘   └───────────┘   │
│                                      ↓                          │
│  ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌───────────┐   │
│  │ ARBITER  │ → │ Conflict  │ → │ RELEASER │ → │ Knowledge │   │
│  │  Agent   │   │ Resolution│   │  Agent   │   │   Base    │   │
│  └──────────┘   └───────────┘   └──────────┘   └───────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Agent Responsibilities

| Agent     | Input             | Output           | Key Functions           |
| --------- | ----------------- | ---------------- | ----------------------- |
| Sentinel  | Endpoint Registry | Evidence records | Discover, fetch, dedupe |
| Extractor | Evidence          | SourcePointers   | Parse, extract values   |
| Composer  | SourcePointers    | Draft Rules      | Group, consolidate      |
| Reviewer  | Draft Rules       | Validated Rules  | Verify, check conflicts |
| Arbiter   | Conflicts         | Resolutions      | Human escalation        |
| Releaser  | Validated Rules   | Released Rules   | Version, publish        |

---

## 9. Missing from Initial Design

Based on comparison with `/docs/regulatory_truth/`:

### 9.1 Added in This Design

1. **DiscoveryEndpoint model** - Not in original schema
2. **DiscoveredItem model** - Not in original schema
3. **Endpoint registry with priorities** - Not specified
4. **Rate limiting implementation** - Mentioned but not detailed
5. **24-hour gentle crawl cycle** - New requirement
6. **Sitemap-specific handling for NN** - New discovery
7. **Circuit breaker patterns** - Not in original
8. **Admin dashboard requirements** - Not specified
9. **Alerting rules** - Not in original

### 9.2 Confirmed from Original Design

1. Evidence → SourcePointer → Rule flow ✓
2. Risk Tier classification (T0/T1/T2/T3) ✓
3. Conflict detection and resolution ✓
4. Human review for T0 items ✓
5. Release versioning ✓
6. Source chain of custody ✓

### 9.3 Deferred/Out of Scope

1. Multi-language support (Croatian only for now)
2. PDF parsing (rely on HTML versions)
3. Real-time webhooks (batch processing only)
4. Public API (internal use first)

---

## 10. Implementation Phases

### Phase 1: Foundation (Current)

- [x] Database schema for Evidence, SourcePointer, Rule
- [x] Basic agent infrastructure
- [x] Ollama integration
- [ ] DiscoveryEndpoint and DiscoveredItem models
- [ ] Endpoint seeding script

### Phase 2: Discovery & Fetching

- [ ] Sentinel agent enhancement
- [ ] Rate limiter implementation
- [ ] Sitemap parser for Narodne novine
- [ ] HTML list parser for news sites
- [ ] Content hashing and deduplication

### Phase 3: Processing Pipeline

- [ ] Extractor agent improvements
- [ ] Composer agent implementation
- [ ] Reviewer agent implementation
- [ ] Conflict detection

### Phase 4: Operations

- [ ] Scheduled job infrastructure (cron)
- [ ] Circuit breakers
- [ ] Metrics collection
- [ ] Admin dashboard UI

### Phase 5: Monitoring & Alerting

- [ ] Prometheus/Grafana integration
- [ ] Alert rules configuration
- [ ] Error tracking
- [ ] Daily summary emails

---

## 11. Success Criteria

### Operational

- [ ] Pipeline runs daily without manual intervention
- [ ] 99% uptime for scheduled runs
- [ ] < 5% error rate across all endpoints
- [ ] All 6 sources monitored successfully

### Quality

- [ ] Extraction confidence > 80% average
- [ ] < 10% false positive rate
- [ ] Zero missed critical regulatory changes
- [ ] < 24h latency from publication to knowledge base

### Performance

- [ ] Complete daily cycle within 8 hours
- [ ] No IP bans from any source
- [ ] < 2 second average response time
- [ ] Rate limiting enforced at 2s minimum

---

## Appendix A: Endpoint Seed Data

See separate file: `docs/plans/2025-12-21-endpoint-seed-data.sql`

## Appendix B: Discovery Reports

- Narodne novine: Sitemap-based, 3 content types
- Porezna uprava: `/home/admin/FiskAI/porezna_discovery_report.md`
- HZZO: 17+ endpoints, comprehensive
- HZMO: 28+ sections, well-organized
- FINA: 12+ sections, e-invoice focus
- Ministry of Finance: `/home/admin/FiskAI/mfin_gov_hr_discovery_report.md`
