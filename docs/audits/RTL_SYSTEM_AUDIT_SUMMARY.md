# Regulatory Truth Layer (RTL) - External Audit Summary

> **Document Purpose:** Comprehensive overview for external auditors
> **Generated:** 2026-01-16
> **System Version:** 4b17efe243581f398b9f51a00491832f5818ffff

---

## 1. EXECUTIVE SUMMARY

### What RTL Does

The Regulatory Truth Layer is an **autonomous regulatory intelligence system** that:

1. **Discovers** regulatory content from Croatian government sources (tax authority, health insurance, parliament, etc.)
2. **Extracts** structured facts from unstructured legal documents using LLM
3. **Composes** individual facts into coherent regulatory rules
4. **Reviews** rules for quality and consistency
5. **Resolves** conflicts between contradictory regulations
6. **Publishes** verified rules to a production knowledge base

### Why It Matters

Croatian regulatory compliance requires synthesizing information from multiple, often contradictory sources. RTL automates this process with:

- **Full traceability**: Every rule links back to source evidence
- **No hallucinations**: LLM outputs are validated against source text
- **Conflict resolution**: When regulations contradict, the system detects and resolves
- **Time-awareness**: Rules have effective dates and version history

### Current Scale

| Entity             | Count   | Description                  |
| ------------------ | ------- | ---------------------------- |
| Evidence           | 729     | Source documents (HTML, PDF) |
| CandidateFact      | 17,738  | Extracted regulatory facts   |
| SourcePointer      | 2,177   | Evidence-to-rule links       |
| RegulatoryRule     | 615     | Composed rules               |
| RegulatoryConflict | 84      | Detected conflicts           |
| AgentRun           | 605,680 | LLM execution audit trail    |
| RuleRelease        | 6       | Production releases          |

---

## 2. ARCHITECTURE OVERVIEW

### Three-Store Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGULATORY TRUTH LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   IMMUTABLE     │  │   TIME-AWARE    │  │    VECTOR       │  │
│  │   EVIDENCE      │  │   RULE GRAPH    │  │    STORE        │  │
│  │   STORE         │  │                 │  │                 │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  │
│  │ • Raw snapshots │  │ • Synthesized   │  │ • Semantic      │  │
│  │ • Never edited  │  │   truth         │  │   search only   │  │
│  │ • Content-hash  │  │ • Versioned     │  │ • Never         │  │
│  │   verified      │  │ • Conflict      │  │   authoritative │  │
│  │                 │  │   resolution    │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Two-Layer Execution Model

**Layer A: Daily Discovery (Scheduled)**

- Sentinel scans regulatory endpoints
- Creates Evidence records with immutable content
- Classifies documents (HTML, PDF_TEXT, PDF_SCANNED)

**Layer B: 24/7 Processing (Continuous)**

- OCR → Extraction → Composition → Review → Arbitration → Release
- Runs autonomously via continuous-drainer worker

---

## 3. DATA FLOW PIPELINE

```
┌──────────────┐
│   SENTINEL   │  Scans: narodne-novine.hr, porezna-uprava.hr,
│              │         fina.hr, hzzo.hr, hzmo.hr, etc.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   EVIDENCE   │  Immutable source content
│              │  contentClass: HTML | PDF_TEXT | PDF_SCANNED
└──────┬───────┘
       │
       ├─── PDF_SCANNED ───▶ OCR Worker (Tesseract + Vision fallback)
       │
       ▼
┌──────────────┐
│  EXTRACTOR   │  LLM extracts facts from text
│              │  Creates CandidateFact records
│              │  Validates quotes against source
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   COMPOSER   │  Aggregates facts into rules
│              │  Creates RegulatoryRule (DRAFT)
│              │  Detects conflicts
└──────┬───────┘
       │
       ├─── Conflict? ───▶ ARBITER (resolution)
       │
       ▼
┌──────────────┐
│   REVIEWER   │  Quality checks
│              │  Auto-approve or flag for human review
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   RELEASER   │  Publishes to production
│              │  Creates versioned Release
└──────────────┘
```

---

## 4. KEY COMPONENTS & LOCATIONS

### Source Code Structure

```
/src/lib/regulatory-truth/
├── agents/              # Core processing logic
│   ├── sentinel.ts      # Discovery agent (55KB)
│   ├── extractor.ts     # LLM fact extraction (16KB)
│   ├── composer.ts      # Rule composition (40KB)
│   ├── reviewer.ts      # Quality review (15KB)
│   ├── arbiter.ts       # Conflict resolution (52KB)
│   ├── releaser.ts      # Publication (33KB)
│   └── runner.ts        # LLM execution wrapper (31KB)
│
├── workers/             # BullMQ job processors
│   ├── continuous-drainer.worker.ts  # 24/7 queue processing
│   ├── extractor.worker.ts
│   ├── composer.worker.ts
│   ├── reviewer.worker.ts
│   ├── arbiter.worker.ts
│   ├── releaser.worker.ts
│   ├── ocr.worker.ts
│   ├── evidence-embedding.worker.ts
│   └── queues.ts        # Queue definitions
│
├── utils/               # 50+ utility modules
│   ├── quote-in-evidence.ts    # Quote validation
│   ├── conflict-detector.ts    # Conflict detection
│   ├── confidence-decay.ts     # Time-based confidence
│   ├── publish-gate.ts         # Release criteria
│   └── ...
│
├── prompts/             # LLM system prompts
├── schemas/             # Zod validation schemas
├── data/                # Source definitions (sources.json)
└── __tests__/           # Test suites
```

### Database Schema (Key Tables)

**regulatory schema** (immutable evidence):

- `Evidence` - Raw source documents
- `EvidenceArtifact` - OCR results, extracted text
- `RegulatorySource` - Source endpoint definitions

**public schema** (processed data):

- `CandidateFact` - Extracted facts (pre-review)
- `SourcePointer` - Evidence-to-rule links
- `RegulatoryRule` - Composed rules
- `RegulatoryConflict` - Detected conflicts
- `AgentRun` - LLM execution audit log
- `RuleRelease` - Publication records
- `RuleVersion` - Version history

### Configuration Files

| File                                         | Purpose            |
| -------------------------------------------- | ------------------ |
| `docker-compose.workers.yml`                 | Worker deployment  |
| `docker-compose.workers.override.yml`        | Environment config |
| `src/lib/regulatory-truth/data/sources.json` | Source definitions |
| `prisma/schema.prisma`                       | Database schema    |

---

## 5. TRUST & SAFETY GUARANTEES

### Anti-Hallucination Measures

1. **Quote Validation** (`utils/quote-in-evidence.ts`)
   - Every extracted fact must cite source text
   - Quotes are verified against Evidence.rawContent
   - Fuzzy matching with configurable threshold

2. **Confidence Scoring**
   - Each fact has overallConfidence (0-1)
   - Low confidence triggers human review
   - Confidence decays over time for stale rules

3. **Source Traceability**
   - Every RegulatoryRule links to SourcePointers
   - SourcePointers link to Evidence
   - Evidence contains immutable rawContent + contentHash

### Conflict Resolution

1. **Detection** (`utils/conflict-detector.ts`)
   - Semantic similarity check between rules
   - Temporal overlap detection
   - Authority hierarchy comparison

2. **Resolution** (`agents/arbiter.ts`)
   - LLM-assisted analysis
   - Authority precedence (law > interpretation > procedure)
   - Temporal precedence (newer > older)
   - Escalation to human review when uncertain

### Quality Gates

| Gate            | Location                   | Purpose                 |
| --------------- | -------------------------- | ----------------------- |
| Coverage Gate   | `quality/coverage-gate.ts` | Minimum domain coverage |
| Publish Gate    | `utils/publish-gate.ts`    | Release criteria        |
| Health Gate     | `utils/health-gates.ts`    | System health checks    |
| Review Required | `utils/review-required.ts` | Human review triggers   |

---

## 6. LLM CONFIGURATION

### Current Setup

| Purpose                       | Provider              | Model                  | Endpoint                   |
| ----------------------------- | --------------------- | ---------------------- | -------------------------- |
| Extraction/Composition/Review | Ollama Cloud          | gemini-3-flash-preview | https://ollama.com         |
| Embeddings                    | Local Ollama (GPU-01) | nomic-embed-text       | http://100.100.47.43:11434 |

### Execution Tracking

Every LLM call is logged in `AgentRun` table:

- `agentType`: EXTRACTOR, COMPOSER, REVIEWER, ARBITER
- `input`: Full prompt sent
- `output`: Raw LLM response
- `tokensUsed`: Token consumption
- `durationMs`: Execution time
- `cacheHit`: Whether result was cached
- `outcome`: SUCCESS_APPLIED, EMPTY_OUTPUT, ERROR, etc.

### Caching

- Results cached by content hash
- Cache hit rate typically 60-80%
- Cache stored in `AgentResultCache` table

---

## 7. OPERATIONAL INFRASTRUCTURE

### Workers (15 total)

| Worker             | Purpose               | Uses LLM     |
| ------------------ | --------------------- | ------------ |
| orchestrator       | Pipeline coordination | No           |
| sentinel           | Source discovery      | No           |
| extractor          | Fact extraction       | Yes          |
| ocr                | PDF text extraction   | Yes (vision) |
| composer           | Rule composition      | Yes          |
| reviewer           | Quality review        | Yes          |
| arbiter            | Conflict resolution   | Yes          |
| releaser           | Publication           | No           |
| continuous-drainer | 24/7 queue processing | No           |
| evidence-embedding | Vector embeddings     | Yes          |
| embedding          | Rule embeddings       | Yes          |
| content-sync       | GitHub sync           | No           |
| article            | News generation       | Yes          |

### Queue System

- **Technology**: BullMQ on Redis
- **Queues**: extract, compose, review, arbiter, release, ocr, evidence-embedding
- **Dead Letter Queue**: Failed jobs moved to DLQ for analysis
- **Prefix**: `fiskai:`

### Monitoring

- Redis heartbeats for stall detection
- Circuit breakers for fault tolerance
- Prometheus metrics exposed
- Stage-level progress tracking

---

## 8. AUDIT TRAIL

### What's Logged

1. **AgentRun** - Every LLM execution
   - Full input/output
   - Token usage
   - Duration
   - Success/failure

2. **RuleVersion** - Rule change history
   - Before/after snapshots
   - Change reason
   - Author (system or human)

3. **ConflictResolutionAudit** - Conflict decisions
   - Resolution rationale
   - Winner/loser rules
   - Authority basis

4. **RuleRelease** - Publication events
   - Rules included
   - Release notes
   - Timestamp

### Retention

- AgentRun: Indefinite (605K+ records)
- Evidence: Indefinite (immutable)
- RuleVersion: Indefinite

---

## 9. CURRENT SYSTEM STATE

### Rule Status Distribution

| Status         | Count | Description           |
| -------------- | ----- | --------------------- |
| DRAFT          | 467   | Awaiting review       |
| PENDING_REVIEW | 65    | In review queue       |
| REJECTED       | 67    | Failed quality checks |
| APPROVED       | 4     | Ready for release     |
| PUBLISHED      | 12    | Live in production    |

### Domain Coverage

| Domain                     | SourcePointers | Evidence |
| -------------------------- | -------------- | -------- |
| rokovi (deadlines)         | 1,139          | 166      |
| obrasci (forms)            | 605            | 68       |
| fiskalizacija              | 198            | 20       |
| doprinosi (contributions)  | 99             | 11       |
| pdv (VAT)                  | 52             | 12       |
| porez_dohodak (income tax) | 40             | 19       |

### Open Issues

- 84 conflicts pending resolution
- 21 evidence records with embedding failures
- Scheduler worker disabled (file missing from build)

---

## 10. KEY FILES FOR AUDIT

### Must-Review Files

| Priority | File                                   | Purpose               |
| -------- | -------------------------------------- | --------------------- |
| 1        | `agents/runner.ts`                     | LLM execution wrapper |
| 1        | `agents/extractor.ts`                  | Fact extraction logic |
| 1        | `utils/quote-in-evidence.ts`           | Anti-hallucination    |
| 2        | `agents/arbiter.ts`                    | Conflict resolution   |
| 2        | `agents/composer.ts`                   | Rule composition      |
| 2        | `workers/continuous-drainer.worker.ts` | Autonomous processing |
| 3        | `prompts/index.ts`                     | LLM system prompts    |
| 3        | `utils/conflict-detector.ts`           | Conflict detection    |
| 3        | `utils/publish-gate.ts`                | Release criteria      |

### Test Coverage

```
/src/lib/regulatory-truth/__tests__/
/src/lib/regulatory-truth/agents/__tests__/
/src/lib/regulatory-truth/workers/__tests__/
/src/lib/regulatory-truth/e2e/
```

### Documentation

```
/docs/01_ARCHITECTURE/REGULATORY_TRUTH_LAYER.md  # Main architecture doc
/docs/product-bible/                              # Product specification
/CLAUDE.md                                        # System context
```

---

## 11. VERIFICATION COMMANDS

```bash
# Check worker health
docker ps --filter "name=fiskai-worker" --format "{{.Names}}: {{.Status}}"

# Check queue status
REDIS_URL="redis://..." npx tsx scripts/queue-status.ts

# Check database counts
PGPASSWORD=... psql -h ... -d fiskai -c "
  SELECT 'Evidence', COUNT(*) FROM regulatory.\"Evidence\"
  UNION ALL SELECT 'RegulatoryRule', COUNT(*) FROM public.\"RegulatoryRule\";
"

# Check recent LLM activity
PGPASSWORD=... psql -h ... -d fiskai -c "
  SELECT \"agentType\", outcome, COUNT(*)
  FROM public.\"AgentRun\"
  WHERE \"startedAt\" > NOW() - INTERVAL '1 hour'
  GROUP BY 1, 2;
"

# View worker logs
docker logs fiskai-worker-extractor --tail 50
docker logs fiskai-worker-continuous-drainer --tail 50
```

---

## 12. CONTACT & ESCALATION

For audit queries:

1. Check `/docs/01_ARCHITECTURE/REGULATORY_TRUTH_LAYER.md` first
2. Review `/CLAUDE.md` for system context
3. Examine `AgentRun` table for execution history
4. Check `RegulatoryConflict` for pending issues

---

_Document generated for external audit purposes. System actively processing as of 2026-01-16._
