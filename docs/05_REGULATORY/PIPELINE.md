# Regulatory Truth Pipeline

> Canonical document - reviewed 2024-12-24
>
> Sources merged: `docs/plans/2024-12-21-regulatory-truth-agent-pipeline-design.md`, `docs/plans/2024-12-24-ocr-preprocessing-lane-design.md`

## Pipeline Overview

The Regulatory Truth Layer processes regulatory content through a multi-stage pipeline:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Sentinel   │───▶│    OCR      │───▶│  Extractor  │───▶│  Composer   │
│  (Fetch)    │    │  (Images)   │    │   (LLM)     │    │  (Rules)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          ▲                                      │
                    PDF_SCANNED                                  ▼
                                                         ┌─────────────┐
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │  Reviewer   │
│  Releaser   │◀───│   Arbiter   │◀───│   Review    │◀───│   (QA)      │
│  (Publish)  │    │ (Conflicts) │    │  (Human)    │    └─────────────┘
└─────────────┘    └─────────────┘    └─────────────┘
```

## Stage Details

### Stage 1: Sentinel (Discovery)

**Purpose:** Fetch content from regulatory endpoints

**Worker:** `sentinel.worker.ts`

**Process:**

1. Check discovery endpoints for new content
2. Fetch URLs and detect content type
3. Classify as HTML, PDF_TEXT, or PDF_SCANNED
4. Create Evidence record with immutable rawContent
5. Route to appropriate queue

**Outputs:**

- `Evidence` record with `contentClass`
- `EvidenceArtifact` for PDF_TEXT (extracted text)
- Queue job for next stage

### Stage 1.5: OCR (Binary Preprocessing)

**Purpose:** Extract text from scanned PDFs

**Worker:** `ocr.worker.ts`

**Process:**

1. Render PDF pages to images (300 DPI via pdftoppm)
2. Run Tesseract OCR with Croatian + English
3. Check confidence scores
4. Fallback to vision model if confidence < 70%
5. Create OCR_TEXT artifact

**Outputs:**

- `EvidenceArtifact` with kind=OCR_TEXT
- `Evidence.ocrMetadata` with confidence, method
- `Evidence.primaryTextArtifactId` pointer

**Thresholds:**
| Threshold | Value | Action |
|-----------|-------|--------|
| Scanned detection | < 50 chars/page | Route to OCR |
| Tesseract accept | ≥ 70% confidence | Skip vision fallback |
| Garbage detection | > 20% non-letters | Trigger vision fallback |
| Manual review | < 50% avg confidence | Flag for human review |

### Stage 2: Extractor (LLM Extraction)

**Purpose:** Extract structured regulatory facts from text

**Worker:** `extractor.worker.ts`

**Process:**

1. Get extractable content via Content Provider
2. Clean and normalize text
3. Prompt LLM for structured extraction
4. Validate extracted facts against source
5. Store extracted facts with confidence scores

**Outputs:**

- `ExtractedFact` records linked to Evidence
- Extraction metadata with confidence

### Stage 3: Composer (Rule Composition)

**Purpose:** Compose regulatory rules from extracted facts

**Worker:** `composer.worker.ts`

**Process:**

1. Aggregate related facts by concept
2. Compose draft rule with LLM
3. Create source pointers to evidence
4. Set status to DRAFT

**Outputs:**

- `RegulatoryRule` in DRAFT status
- `RuleSourcePointer` links to evidence

### Stage 4: Reviewer (Quality Assurance)

**Purpose:** Automated quality checks

**Worker:** `reviewer.worker.ts`

**Process:**

1. Verify all rules have source pointers
2. Check citation validity
3. Validate required fields
4. Flag issues for human review

**Outputs:**

- Rule status updated to REVIEW or NEEDS_REVIEW
- Quality metrics recorded

### Stage 5: Arbiter (Conflict Resolution)

**Purpose:** Resolve conflicts between rules

**Worker:** `arbiter.worker.ts`

**Process:**

1. Detect conflicting rules (same concept, different content)
2. Apply resolution strategy (hierarchy, recency, source authority)
3. Escalate unresolvable conflicts to human queue

**Outputs:**

- Resolved rules marked APPROVED
- Unresolved conflicts in human review queue

### Stage 6: Releaser (Publication)

**Purpose:** Publish approved rules to production

**Worker:** `releaser.worker.ts`

**Process:**

1. Final validation checks
2. Update rule status to PUBLISHED
3. Update vector embeddings
4. Log audit event

**Outputs:**

- Rules visible in production API
- Audit trail entries

## Queue Configuration

| Queue    | Rate Limit | Concurrency | Notes                                  |
| -------- | ---------- | ----------- | -------------------------------------- |
| sentinel | 10/min     | 1           | Rate-limited to respect source servers |
| ocr      | 2/min      | 1           | CPU-intensive                          |
| extract  | 5/min      | 2           | LLM-intensive                          |
| compose  | 5/min      | 1           | LLM-intensive                          |
| review   | 10/min     | 1           | Fast checks                            |
| arbiter  | 5/min      | 1           | Conflict resolution                    |
| release  | 10/min     | 1           | Fast publication                       |

## Content Provider

The Content Provider abstracts artifact retrieval for the Extractor:

```typescript
// Get text for extraction
const { text, source, artifactKind } = await getExtractableContent(evidenceId)

// Check if ready for extraction
if (!(await isReadyForExtraction(evidenceId))) {
  // Requeue with delay - OCR still processing
  await extractQueue.add("extract", { evidenceId, runId }, { delay: 30000 })
}
```

Priority order:

1. `primaryTextArtifactId` if set
2. OCR_TEXT artifact
3. PDF_TEXT artifact
4. Raw content (HTML/JSON)

## Continuous Drainer

The `continuous-drainer.worker.ts` ensures pipeline progress:

```
Loop forever:
  Stage 1: Drain pending fetches
  Stage 1.5: Drain pending OCR
  Stage 2: Drain pending extractions
  Stage 3: Drain pending compositions
  Stage 4: Drain pending reviews
  Stage 5: Drain pending arbiter
  Stage 6: Drain pending releases

  If all empty: backoff
  Else: continue immediately
```

## Error Handling

| Error Type       | Retry Strategy                 | Escalation                 |
| ---------------- | ------------------------------ | -------------------------- |
| Network error    | 3 retries, exponential backoff | Mark endpoint as failing   |
| OCR failure      | Vision fallback → human review | Flag for manual processing |
| LLM error        | Retry with different model     | Human review               |
| Validation error | No retry                       | Human review               |
| Conflict         | Arbiter resolution             | Human review               |

## Monitoring

```bash
# Queue status
npx tsx scripts/queue-status.ts

# Evidence status
docker exec fiskai-db psql -U fiskai -d fiskai -c \
  "SELECT status, COUNT(*) FROM \"Evidence\" GROUP BY status"

# Rule status
docker exec fiskai-db psql -U fiskai -d fiskai -c \
  "SELECT status, COUNT(*) FROM \"RegulatoryRule\" GROUP BY status"
```

## Related Documentation

- [Overview](./OVERVIEW.md)
- [Agent Architecture](./AGENTS.md)
- [Two-Layer Model](../01_ARCHITECTURE/two-layer-model.md)
- [Operations Runbook](../04_OPERATIONS/OPERATIONS_RUNBOOK.md)
