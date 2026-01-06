# Document B: Data Model Inventory

**Phase 0 Exploration Document**
**Date**: 2026-01-07
**Scope**: All tables, schemas, entities with fields, invariants, ownership, lifecycle

---

## Database Architecture

FiskAI uses two PostgreSQL schemas accessed via separate Prisma clients:

| Schema       | Client  | Purpose                                                       |
| ------------ | ------- | ------------------------------------------------------------- |
| `public`     | `db`    | Core application: users, companies, invoices, rules, concepts |
| `regulatory` | `dbReg` | Regulatory Truth Layer: evidence, sources, monitoring         |

**Connection**: Single PostgreSQL 16 database with pgvector extension

---

## Schema 1: Regulatory (regulatory.prisma)

### RegulatorySource

**Purpose**: Defines endpoints monitored for regulatory content

| Field              | Type          | Default   | Invariant                                                                    |
| ------------------ | ------------- | --------- | ---------------------------------------------------------------------------- |
| id                 | String (cuid) | generated | Primary key                                                                  |
| slug               | String        | required  | **UNIQUE** - kebab-case identifier                                           |
| name               | String        | required  | Human-readable name                                                          |
| url                | String        | required  | Base URL                                                                     |
| hierarchy          | Int           | 5         | 1=Ustav, 2=Zakon, 3=Podzakonski, 4=Pravilnik, 5=Uputa, 6=Mišljenje, 7=Praksa |
| fetchIntervalHours | Int           | 24        | Scrape frequency                                                             |
| lastFetchedAt      | DateTime?     | null      | Last successful fetch                                                        |
| lastContentHash    | String?       | null      | Hash for change detection                                                    |
| isActive           | Boolean       | true      | Whether actively monitored                                                   |

**Ownership**: System-managed
**Lifecycle**: Created manually, rarely modified

---

### Evidence

**Purpose**: Immutable record of fetched regulatory content

| Field                 | Type          | Default   | Invariant                                    |
| --------------------- | ------------- | --------- | -------------------------------------------- |
| id                    | String (cuid) | generated | Primary key                                  |
| sourceId              | String        | required  | FK → RegulatorySource                        |
| fetchedAt             | DateTime      | now()     | **IMMUTABLE** - capture timestamp            |
| url                   | String        | required  | Source URL (part of unique constraint)       |
| contentHash           | String        | required  | **IMMUTABLE** - SHA256 of rawContent         |
| rawContent            | String (Text) | required  | **IMMUTABLE** - Full HTML/PDF/JSON content   |
| contentType           | String        | "html"    | MIME type category                           |
| deletedAt             | DateTime?     | null      | Soft delete timestamp                        |
| hasChanged            | Boolean       | false     | Content changed from previous fetch          |
| changeSummary         | String?       | null      | Human-readable change description            |
| contentClass          | String        | "HTML"    | HTML, PDF_TEXT, PDF_SCANNED, DOC, JSON, etc. |
| stalenessStatus       | String        | "FRESH"   | FRESH, AGING, STALE, UNAVAILABLE, EXPIRED    |
| lastVerifiedAt        | DateTime?     | null      | Last successful HEAD verification            |
| sourceEtag            | String?       | null      | ETag header for change detection             |
| sourceLastMod         | DateTime?     | null      | Last-Modified header                         |
| verifyCount           | Int           | 0         | Successful verifications                     |
| consecutiveFailures   | Int           | 0         | Failed HEAD requests (grace period)          |
| expiresAt             | DateTime?     | null      | Explicit expiration date                     |
| ocrMetadata           | Json?         | null      | OCR processing metadata                      |
| primaryTextArtifactId | String?       | null      | Canonical text artifact ID                   |
| embedding             | vector(768)?  | null      | Semantic duplicate detection                 |
| embeddingStatus       | String        | "PENDING" | PENDING, PROCESSING, COMPLETED, FAILED       |
| embeddingError        | String?       | null      | Generation error message                     |
| embeddingAttempts     | Int           | 0         | Retry counter                                |
| embeddingUpdatedAt    | DateTime?     | null      | Last status update                           |

**Unique Constraint**: `(url, contentHash)` - Prevents duplicate content for same URL

**Immutability Enforcement**: Via Prisma client extension in `src/lib/db/regulatory.ts`

- `rawContent`, `contentHash`, `fetchedAt` throw `EvidenceImmutabilityError` on update
- `delete()` and `deleteMany()` throw error (soft delete only)

**Ownership**: Sentinel agent creates, staleness service updates status fields
**Lifecycle**: Created on fetch, never deleted (soft-delete only)

---

### EvidenceArtifact

**Purpose**: Processed text extracted from Evidence

| Field       | Type          | Default   | Invariant                                              |
| ----------- | ------------- | --------- | ------------------------------------------------------ |
| id          | String (cuid) | generated | Primary key                                            |
| evidenceId  | String        | required  | FK → Evidence (cascade delete)                         |
| kind        | String        | required  | PDF_TEXT, OCR_TEXT, OCR_HOCR, HTML_CLEANED, TABLE_JSON |
| content     | String (Text) | required  | Processed text/data                                    |
| contentHash | String        | required  | SHA256 of content                                      |
| pageMap     | Json?         | null      | Per-page OCR metadata                                  |
| createdAt   | DateTime      | now()     | Creation timestamp                                     |

**Ownership**: Sentinel (PDF_TEXT), OCR worker (OCR_TEXT), content cleaner (HTML_CLEANED)
**Lifecycle**: Created during processing, cascade deleted with Evidence

---

### ExtractionRejected

**Purpose**: Dead letter queue for failed LLM extractions

| Field         | Type          | Default   | Invariant                                          |
| ------------- | ------------- | --------- | -------------------------------------------------- |
| id            | String (cuid) | generated | Primary key                                        |
| evidenceId    | String        | required  | FK → Evidence                                      |
| rejectionType | String        | required  | INVALID_DOMAIN, OUT_OF_RANGE, NO_QUOTE_MATCH, etc. |
| rawOutput     | Json          | required  | Complete LLM output that failed                    |
| errorDetails  | String        | required  | Specific validation error                          |
| attemptCount  | Int           | 1         | Retry counter                                      |
| lastAttemptAt | DateTime      | now()     | Last extraction attempt                            |
| resolvedAt    | DateTime?     | null      | Manual correction timestamp                        |

**Ownership**: Extractor agent creates
**Lifecycle**: Created on validation failure, resolved by human review

---

### MonitoringAlert

**Purpose**: Alerts for source monitoring issues

| Field          | Type          | Default   | Invariant                                 |
| -------------- | ------------- | --------- | ----------------------------------------- |
| id             | String (cuid) | generated | Primary key                               |
| sourceId       | String        | required  | FK → RegulatorySource                     |
| alertType      | String        | required  | FETCH_FAILURE, CONTENT_CHANGE, SLA_BREACH |
| severity       | String        | required  | INFO, WARNING, CRITICAL                   |
| message        | String        | required  | Alert description                         |
| metadata       | Json?         | null      | Additional context                        |
| acknowledgedAt | DateTime?     | null      | Acknowledgment timestamp                  |
| acknowledgedBy | String?       | null      | User ID                                   |

**Ownership**: Sentinel health check creates
**Lifecycle**: Created on alert condition, acknowledged by user

---

### ConflictResolutionAudit

**Purpose**: Audit trail for conflict resolutions

| Field      | Type          | Default   | Invariant                                                        |
| ---------- | ------------- | --------- | ---------------------------------------------------------------- |
| id         | String (cuid) | generated | Primary key                                                      |
| conflictId | String        | required  | Soft ref to RegulatoryConflict                                   |
| ruleAId    | String?       | null      | Soft ref to first rule                                           |
| ruleBId    | String?       | null      | Soft ref to second rule                                          |
| resolution | String        | required  | RULE_A_PREVAILS, RULE_B_PREVAILS, MERGE_RULES, ESCALATE_TO_HUMAN |
| reason     | String (Text) | required  | Resolution rationale                                             |
| resolvedBy | String        | required  | ARBITER_AGENT, HUMAN, SYSTEM                                     |
| resolvedAt | DateTime      | now()     | Resolution timestamp                                             |
| metadata   | Json?         | null      | Authority comparison, temporal analysis                          |

**Ownership**: Arbiter agent creates
**Lifecycle**: Immutable audit record

---

## Schema 2: Public (schema.prisma)

### SourcePointer

**Purpose**: Evidence-backed regulatory fact extracted by LLM

| Field           | Type           | Default              | Invariant                                             |
| --------------- | -------------- | -------------------- | ----------------------------------------------------- |
| id              | String (cuid)  | generated            | Primary key                                           |
| evidenceId      | String         | required             | **Soft ref** to regulatory.Evidence                   |
| domain          | String         | required             | pausalni, pdv, doprinosi, fiskalizacija, rokovi, etc. |
| valueType       | String         | required             | currency, percentage, date, threshold, text           |
| extractedValue  | String         | required             | Parsed regulatory value                               |
| displayValue    | String         | required             | Human-readable format                                 |
| exactQuote      | String (Text)  | required             | **IMMUTABLE** - Verbatim source text                  |
| contextBefore   | String? (Text) | null                 | Previous sentence/paragraph                           |
| contextAfter    | String? (Text) | null                 | Following sentence/paragraph                          |
| selector        | String?        | null                 | CSS/XPath for HTML sources                            |
| articleNumber   | String?        | null                 | Legal article reference                               |
| paragraphNumber | String?        | null                 | Paragraph within article                              |
| lawReference    | String?        | null                 | Full citation                                         |
| confidence      | Float          | 0.8                  | Extraction confidence 0.0-1.0                         |
| extractionNotes | String?        | null                 | LLM notes                                             |
| createdAt       | DateTime       | now()                | Creation timestamp                                    |
| deletedAt       | DateTime?      | null                 | Soft delete                                           |
| embedding       | vector(768)?   | null                 | Semantic search vector                                |
| startOffset     | Int?           | null                 | UTF-16 index into rawContent                          |
| endOffset       | Int?           | null                 | UTF-16 end index                                      |
| matchType       | Enum?          | PENDING_VERIFICATION | EXACT, NORMALIZED, NOT_FOUND                          |

**Relationships**: Many-to-many with RegulatoryRule via "RuleSourcePointers"

**Invariant**: `rawContent.slice(startOffset, endOffset) === exactQuote` (for EXACT matches)

**Ownership**: Extractor agent creates, embedder updates embedding
**Lifecycle**: Created during extraction, soft-deleted on correction

---

### Concept

**Purpose**: Taxonomy hierarchy for regulatory concepts

| Field       | Type           | Default   | Invariant                          |
| ----------- | -------------- | --------- | ---------------------------------- |
| id          | String (cuid)  | generated | Primary key                        |
| slug        | String         | required  | **UNIQUE** - kebab-case identifier |
| nameHr      | String         | required  | Croatian name                      |
| nameEn      | String?        | null      | English name                       |
| aliases     | String[]       | []        | Alternative names/synonyms         |
| tags        | String[]       | []        | Categorization tags                |
| description | String? (Text) | null      | Concept definition                 |
| parentId    | String?        | null      | FK → Concept (hierarchy)           |

**Relationships**: Self-referential hierarchy, one-to-many with RegulatoryRule

**Ownership**: System-managed taxonomy
**Lifecycle**: Manually curated, rarely modified

---

### ConceptEmbedding

**Purpose**: Vector embeddings for concept semantic search

| Field         | Type          | Default   | Invariant                         |
| ------------- | ------------- | --------- | --------------------------------- |
| id            | String (cuid) | generated | Primary key                       |
| conceptId     | String        | required  | **UNIQUE** FK → Concept           |
| embedding     | vector(768)?  | null      | 768-dim vector (nomic-embed-text) |
| embeddingText | String (Text) | required  | nameHr + aliases combined         |
| createdAt     | DateTime      | now()     | Creation timestamp                |
| updatedAt     | DateTime      | auto      | Last update                       |

**Index**: IVFFlat with vector_cosine_ops, lists=10

**Ownership**: Concept embedding script
**Lifecycle**: Regenerated when concepts change

---

### RegulatoryRule

**Purpose**: Synthesized regulatory rule with evidence backing

| Field             | Type           | Default    | Invariant                                                        |
| ----------------- | -------------- | ---------- | ---------------------------------------------------------------- |
| id                | String (cuid)  | generated  | Primary key                                                      |
| conceptSlug       | String         | required   | Machine-readable concept ID                                      |
| conceptId         | String?        | null       | FK → Concept                                                     |
| titleHr           | String         | required   | Croatian title                                                   |
| titleEn           | String?        | null       | English title                                                    |
| riskTier          | Enum           | required   | T0, T1, T2, T3                                                   |
| authorityLevel    | Enum           | GUIDANCE   | LAW, GUIDANCE, PROCEDURE, PRACTICE                               |
| automationPolicy  | Enum           | CONFIRM    | ALLOW, CONFIRM, BLOCK                                            |
| ruleStability     | Enum           | STABLE     | STABLE, VOLATILE                                                 |
| appliesWhen       | String (Text)  | required   | AppliesWhen DSL expression                                       |
| value             | String         | required   | Regulatory value                                                 |
| valueType         | String         | required   | percentage, currency_hrk, currency_eur, etc.                     |
| obligationType    | Enum           | OBLIGATION | OBLIGATION, NO_OBLIGATION, CONDITIONAL, INFORMATIONAL            |
| outcome           | Json?          | null       | Structured outcome                                               |
| explanationHr     | String? (Text) | null       | Croatian explanation                                             |
| explanationEn     | String? (Text) | null       | English explanation                                              |
| effectiveFrom     | DateTime       | required   | Rule validity start                                              |
| effectiveUntil    | DateTime?      | null       | Rule validity end (null = ongoing)                               |
| supersedesId      | String?        | null       | FK → RegulatoryRule (predecessor)                                |
| status            | Enum           | DRAFT      | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, DEPRECATED, REJECTED |
| confidence        | Float          | 0.8        | DEPRECATED - use derivedConfidence                               |
| llmConfidence     | Float          | 0.8        | LLM self-assessed confidence                                     |
| derivedConfidence | Float          | 0.8        | Confidence from source pointer quality                           |
| composerNotes     | String?        | null       | Composer agent notes                                             |
| reviewerNotes     | String?        | null       | Reviewer agent notes                                             |
| approvedBy        | String?        | null       | User ID who approved (T0/T1)                                     |
| approvedAt        | DateTime?      | null       | Approval timestamp                                               |
| meaningSignature  | String?        | null       | SHA256 for deduplication                                         |

**Unique Constraint**: `(conceptSlug, effectiveFrom, status)`

**Relationships**:

- Many-to-many with SourcePointer via "RuleSourcePointers"
- One-to-many with GraphEdge (outgoing, incoming)
- Many-to-many with RuleRelease via "ReleaseRules"
- Self-referential via supersedesId

**Ownership**: Composer creates, Reviewer/Arbiter/Releaser update status
**Lifecycle**: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED (or REJECTED/DEPRECATED)

---

### GraphEdge

**Purpose**: Knowledge graph relationships between rules

| Field      | Type          | Default   | Invariant                                                                |
| ---------- | ------------- | --------- | ------------------------------------------------------------------------ |
| id         | String (cuid) | generated | Primary key                                                              |
| fromRuleId | String        | required  | FK → RegulatoryRule                                                      |
| toRuleId   | String        | required  | FK → RegulatoryRule                                                      |
| relation   | Enum          | required  | AMENDS, INTERPRETS, REQUIRES, EXEMPTS, DEPENDS_ON, SUPERSEDES, OVERRIDES |
| validFrom  | DateTime      | required  | Edge validity start                                                      |
| validTo    | DateTime?     | null      | Edge validity end                                                        |
| notes      | String?       | null      | Additional context                                                       |

**Unique Constraint**: `(fromRuleId, toRuleId, relation)`

**Ownership**: Composer/Arbiter agents create
**Lifecycle**: Created with rule relationships

---

### RegulatoryConflict

**Purpose**: Records conflicts between rules requiring resolution

| Field               | Type          | Default   | Invariant                                                                   |
| ------------------- | ------------- | --------- | --------------------------------------------------------------------------- |
| id                  | String (cuid) | generated | Primary key                                                                 |
| conflictType        | Enum          | required  | SOURCE_CONFLICT, TEMPORAL_CONFLICT, SCOPE_CONFLICT, INTERPRETATION_CONFLICT |
| status              | Enum          | required  | OPEN, RESOLVED, ESCALATED                                                   |
| itemAId             | String?       | null      | FK → RegulatoryRule (nullable for SOURCE_CONFLICT)                          |
| itemBId             | String?       | null      | FK → RegulatoryRule (nullable for SOURCE_CONFLICT)                          |
| description         | String (Text) | required  | Human-readable description                                                  |
| metadata            | Json?         | null      | sourcePointerIds, strategy, analysis                                        |
| resolution          | Json?         | null      | winningItemId, strategy, rationale                                          |
| confidence          | Float?        | null      | Arbiter confidence in resolution                                            |
| requiresHumanReview | Boolean       | false     | Whether escalated to human                                                  |
| humanReviewReason   | String?       | null      | Why human review needed                                                     |
| resolvedBy          | String?       | null      | User ID or SYSTEM/ARBITER                                                   |
| resolvedAt          | DateTime?     | null      | Resolution timestamp                                                        |

**Ownership**: Composer/Reviewer create, Arbiter resolves
**Lifecycle**: OPEN → RESOLVED or ESCALATED

---

### RuleRelease

**Purpose**: Versioned snapshot of published rules

| Field         | Type           | Default   | Invariant                                                            |
| ------------- | -------------- | --------- | -------------------------------------------------------------------- |
| id            | String (cuid)  | generated | Primary key                                                          |
| version       | String         | required  | **UNIQUE** - semver (e.g., "1.0.0")                                  |
| releaseType   | String         | required  | major, minor, patch                                                  |
| releasedAt    | DateTime       | now()     | Release timestamp                                                    |
| effectiveFrom | DateTime       | required  | When rules become effective                                          |
| contentHash   | String         | required  | SHA256 of rule content                                               |
| changelogHr   | String? (Text) | null      | Croatian release notes                                               |
| changelogEn   | String? (Text) | null      | English release notes                                                |
| approvedBy    | String[]       | []        | List of approver user IDs                                            |
| auditTrail    | Json?          | null      | sourceEvidenceCount, sourcePointerCount, reviewCount, humanApprovals |

**Relationships**: Many-to-many with RegulatoryRule via "ReleaseRules"

**Ownership**: Releaser agent creates
**Lifecycle**: Immutable after creation

---

### AgentRun

**Purpose**: Audit trail for agent executions

| Field       | Type          | Default   | Invariant                                                        |
| ----------- | ------------- | --------- | ---------------------------------------------------------------- |
| id          | String (cuid) | generated | Primary key                                                      |
| agentType   | Enum          | required  | SENTINEL, EXTRACTOR, COMPOSER, REVIEWER, RELEASER, ARBITER, etc. |
| status      | String        | "running" | running, completed, failed                                       |
| input       | Json          | required  | Agent input                                                      |
| output      | Json?         | null      | Agent output (null if failed)                                    |
| rawOutput   | Json?         | null      | Raw LLM output on failure                                        |
| error       | String?       | null      | Error message                                                    |
| tokensUsed  | Int?          | null      | LLM tokens consumed                                              |
| durationMs  | Int?          | null      | Execution time                                                   |
| confidence  | Float?        | null      | Output confidence                                                |
| startedAt   | DateTime      | now()     | Start timestamp                                                  |
| completedAt | DateTime?     | null      | Completion timestamp                                             |
| evidenceId  | String?       | null      | Soft ref to Evidence                                             |
| ruleId      | String?       | null      | FK → RegulatoryRule                                              |

**Ownership**: Agent runner creates
**Lifecycle**: Created on start, updated on completion

---

### RegulatoryAuditLog

**Purpose**: Legal defense layer - immutable audit trail

| Field       | Type          | Default   | Invariant                                                               |
| ----------- | ------------- | --------- | ----------------------------------------------------------------------- |
| id          | String (cuid) | generated | Primary key                                                             |
| action      | String        | required  | RULE_CREATED, RULE_APPROVED, CONFLICT_RESOLVED, RELEASE_PUBLISHED, etc. |
| entityType  | String        | required  | RULE, CONFLICT, RELEASE, EVIDENCE                                       |
| entityId    | String        | required  | Entity identifier                                                       |
| performedBy | String?       | "SYSTEM"  | User ID or "SYSTEM"                                                     |
| performedAt | DateTime      | now()     | Action timestamp                                                        |
| metadata    | Json?         | null      | Additional context                                                      |

**Ownership**: System creates via `logAuditEvent()`
**Lifecycle**: **IMMUTABLE** - never modified or deleted

---

### DiscoveryEndpoint

**Purpose**: Defines endpoints for Sentinel discovery

| Field             | Type          | Default   | Invariant                                                       |
| ----------------- | ------------- | --------- | --------------------------------------------------------------- |
| id                | String (cuid) | generated | Primary key                                                     |
| domain            | String        | required  | Target site domain                                              |
| path              | String        | required  | Entry point path                                                |
| listingStrategy   | Enum          | required  | SITEMAP_XML, RSS_FEED, HTML_LIST, PAGINATION, CRAWL, HTML_TABLE |
| priority          | Enum          | required  | CRITICAL, HIGH, MEDIUM, LOW                                     |
| scrapeFrequency   | Enum          | required  | EVERY_RUN, DAILY, TWICE_WEEKLY, WEEKLY, MONTHLY                 |
| lastScrapedAt     | DateTime?     | null      | Last successful scrape                                          |
| consecutiveErrors | Int           | 0         | Error counter for circuit breaker                               |
| isActive          | Boolean       | true      | Whether endpoint is active                                      |
| config            | Json?         | null      | Strategy-specific configuration                                 |

**Ownership**: System-managed
**Lifecycle**: Manually configured, automatically updated

---

### DiscoveredItem

**Purpose**: URLs discovered by Sentinel, pending processing

| Field           | Type          | Default   | Invariant                                             |
| --------------- | ------------- | --------- | ----------------------------------------------------- |
| id              | String (cuid) | generated | Primary key                                           |
| endpointId      | String        | required  | FK → DiscoveryEndpoint                                |
| url             | String        | required  | Discovered URL                                        |
| title           | String?       | null      | Title from listing                                    |
| publishedAt     | DateTime?     | null      | Publication date from listing                         |
| contentHash     | String?       | null      | SHA256 for change detection                           |
| status          | Enum          | PENDING   | PENDING, FETCHED, PROCESSED, SKIPPED, FAILED          |
| processedAt     | DateTime?     | null      | Last processing timestamp                             |
| evidenceId      | String?       | null      | Link to created Evidence                              |
| errorMessage    | String?       | null      | Last error                                            |
| retryCount      | Int           | 0         | Retry counter                                         |
| nodeType        | Enum          | LEAF      | HUB, LEAF, ASSET                                      |
| nodeRole        | Enum?         | null      | ARCHIVE, INDEX, NEWS_FEED, REGULATION, FORM, GUIDANCE |
| parentUrl       | String?       | null      | Breadcrumb for crawled items                          |
| depth           | Int           | 0         | Distance from entry point                             |
| changeFrequency | Float         | 0.5       | EWMA velocity (0=static, 1=volatile)                  |
| lastChangedAt   | DateTime?     | null      | When content last changed                             |
| scanCount       | Int           | 0         | Number of scans                                       |
| freshnessRisk   | Enum          | MEDIUM    | CRITICAL, HIGH, MEDIUM, LOW                           |
| nextScanDue     | DateTime      | now()     | Next adaptive scan time                               |

**Unique Constraint**: `(endpointId, url)`

**Ownership**: Sentinel creates, adaptive scanner updates
**Lifecycle**: PENDING → FETCHED → PROCESSED (or FAILED/SKIPPED)

---

## Enums Reference

### RiskTier

| Value | Description                               | Auto-Approve          |
| ----- | ----------------------------------------- | --------------------- |
| T0    | Critical: Tax rates, deadlines, penalties | NEVER                 |
| T1    | High: Thresholds, contribution bases      | NEVER                 |
| T2    | Medium: Procedural requirements           | If confidence >= 0.95 |
| T3    | Low: UI labels, help text                 | If confidence >= 0.90 |

### AuthorityLevel

| Value     | Description                      | Precedence  |
| --------- | -------------------------------- | ----------- |
| LAW       | Legally binding (Narodne novine) | 1 (highest) |
| GUIDANCE  | Interpretation (Porezna uprava)  | 2           |
| PROCEDURE | Technical execution (FINA, HZMO) | 3           |
| PRACTICE  | Enforcement reality              | 4 (lowest)  |

### RuleStatus

| Value          | Description            | Next States        |
| -------------- | ---------------------- | ------------------ |
| DRAFT          | Created by Composer    | PENDING_REVIEW     |
| PENDING_REVIEW | Awaiting review        | APPROVED, REJECTED |
| APPROVED       | Passed review          | PUBLISHED          |
| PUBLISHED      | Released to production | DEPRECATED         |
| DEPRECATED     | Superseded             | (terminal)         |
| REJECTED       | Failed review          | (terminal)         |

### GraphEdgeType

| Value      | Description                             |
| ---------- | --------------------------------------- |
| AMENDS     | Rule A amends Rule B                    |
| INTERPRETS | Rule A interprets Rule B                |
| REQUIRES   | Rule A requires Rule B (prerequisite)   |
| EXEMPTS    | Rule A exempts from Rule B              |
| DEPENDS_ON | Rule A depends on Rule B                |
| SUPERSEDES | Rule A supersedes Rule B                |
| OVERRIDES  | Lex specialis - Rule A overrides Rule B |

### SourcePointerMatchType

| Value                | Description                                  |
| -------------------- | -------------------------------------------- |
| EXACT                | Quote found exactly as stored                |
| NORMALIZED           | Found after whitespace/unicode normalization |
| NOT_FOUND            | Quote missing (broken provenance)            |
| PENDING_VERIFICATION | Not yet checked                              |

---

## Cross-Schema References

The system uses **soft references** between schemas:

| From                    | To             | Field            | Notes                       |
| ----------------------- | -------------- | ---------------- | --------------------------- |
| SourcePointer           | Evidence       | evidenceId       | String, not FK              |
| ExtractionRejected      | Evidence       | evidenceId       | FK within regulatory schema |
| AgentRun                | Evidence       | evidenceId       | String, not FK              |
| ConflictResolutionAudit | RegulatoryRule | ruleAId, ruleBId | String, not FK              |

**Rationale**: Separate Prisma clients for different schemas cannot enforce FK constraints across schemas.

---

## Vector Indexes

All use **IVFFlat** with `vector_cosine_ops`:

| Table            | Column    | Lists |
| ---------------- | --------- | ----- |
| Evidence         | embedding | 100   |
| SourcePointer    | embedding | 100   |
| ConceptEmbedding | embedding | 10    |

**Dimension**: 768 (nomic-embed-text model)

---

## Key Invariants Summary

1. **Evidence immutability**: `rawContent`, `contentHash`, `fetchedAt` never change
2. **Quote provenance**: SourcePointer.exactQuote must exist in Evidence.rawContent
3. **Unique releases**: Only one RuleRelease per version
4. **T0/T1 approval**: Rules with riskTier T0/T1 must have `approvedBy` set before PUBLISHED
5. **Conflict resolution**: Rules with OPEN conflicts cannot be PUBLISHED
6. **Audit completeness**: All state changes logged to RegulatoryAuditLog
7. **Temporal validity**: `effectiveFrom` is inclusive, `effectiveUntil` is exclusive
