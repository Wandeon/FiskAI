# Two-Layer Execution Model

> Canonical document - reviewed 2024-12-24

## Overview

FiskAI processes regulatory content through two distinct execution layers:

1. **Layer A: Daily Discovery** - Scheduled scraping of regulatory sources
2. **Layer B: 24/7 Processing** - Continuous queue-based content processing

This separation ensures:

- Discovery can run on schedule without blocking processing
- Processing continues 24/7 independent of discovery
- Each layer can scale independently
- Failures in one layer don't affect the other

## Layer A: Daily Discovery

### Purpose

Scan Croatian regulatory endpoints for new or changed content.

### Execution

- **Trigger:** Cron schedule (configurable, typically daily)
- **Operator:** Scheduler service
- **Idempotency:** Same input produces same output

### Components

- **Scheduler Service** (`scheduler.service.ts`)
  - Cron-based job scheduling
  - Timezone: Europe/Zagreb
  - Triggers Sentinel runs

- **Sentinel Agent** (`sentinel.ts`)
  - Scans discovery endpoints
  - Fetches new content
  - Creates Evidence records
  - Classifies content types (HTML, PDF_TEXT, PDF_SCANNED)

### Data Flow

```
Scheduler → Sentinel → Evidence Records
                ↓
        PDF_SCANNED → OCR Queue
        PDF_TEXT → Extract Queue
        HTML → Extract Queue
```

## Layer B: 24/7 Processing

### Purpose

Process discovered evidence into validated regulatory rules.

### Execution

- **Trigger:** Queue-based (BullMQ)
- **Operator:** Worker containers
- **Continuous:** Runs 24/7, processing as items arrive

### Pipeline Stages

| Stage | Queue    | Worker           | Purpose                  |
| ----- | -------- | ---------------- | ------------------------ |
| 1     | sentinel | sentinel.worker  | Fetch discovered items   |
| 1.5   | ocr      | ocr.worker       | OCR scanned PDFs         |
| 2     | extract  | extractor.worker | LLM extraction           |
| 3     | compose  | composer.worker  | Compose regulatory rules |
| 4     | review   | reviewer.worker  | Quality review           |
| 5     | arbiter  | arbiter.worker   | Conflict resolution      |
| 6     | release  | releaser.worker  | Publish to production    |

### Continuous Drainer

The `continuous-drainer.worker.ts` ensures all queues drain continuously:

- Loops through stages in order
- Queues pending items from database
- Backoff when queues are empty
- Runs 24/7

### Binary Preprocessing

PDF handling with OCR support:

- **PDF_TEXT:** Direct text extraction via pdf-parse
- **PDF_SCANNED:** OCR via Tesseract (Croatian + English)
- **Vision Fallback:** Ollama vision model for low-confidence OCR

## Worker Architecture

### Base Worker Pattern

All workers inherit from common base:

- Graceful shutdown handling
- Health metrics reporting
- Job result standardization
- Error handling with retries

### Scaling

- Workers can scale horizontally
- Each worker type runs in separate container
- Extractor has 2 replicas (LLM-heavy)
- OCR has 1 replica (CPU-intensive)

## Monitoring

### Queue Status

```bash
npx tsx scripts/queue-status.ts
```

### Key Metrics

- Jobs waiting/active per queue
- Processing latency per stage
- Error rates and retry counts
- OCR confidence scores

## Invariants

1. **Layer Independence:** Discovery failures don't block processing
2. **Idempotency:** Reprocessing produces identical results
3. **Evidence Trail:** Every rule links to source evidence
4. **Fail-Closed:** Ambiguous content requires human review
5. **No Hallucination:** LLM outputs verified against evidence

## Related Documentation

- [System Overview](./overview.md)
- [Regulatory Truth Pipeline](../05_REGULATORY/PIPELINE.md)
- [Operations Runbook](../04_OPERATIONS/OPERATIONS_RUNBOOK.md)
