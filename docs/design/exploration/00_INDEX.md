# Phase 0: System Exploration

**Status**: Documentation Complete
**Date**: 2026-01-07
**Author**: System Exploration Architect

---

## Purpose

This document set establishes the **factual baseline** of the FiskAI Regulatory Truth Layer (RTL) pipeline. All documents are evidence-backed from codebase exploration and contain no implementation suggestions.

These documents answer: "What does the system actually do today?"

---

## Document Index

| Doc                                     | Title                             | Scope                                                                                       | Lines |
| --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- | ----- |
| [A](./A_SYSTEM_MAP.md)                  | **System Map**                    | Single-piece trace from web → Sentinel → Evidence → Extraction → Graph → Vector → Assistant | 600+  |
| [B](./B_DATA_MODEL_INVENTORY.md)        | **Data Model Inventory**          | All tables, schemas, entities with fields, invariants, ownership, lifecycle                 | 800+  |
| [C](./C_EXTRACTION_MODES.md)            | **Extraction Modes Definition**   | Mode 1 (classified/planned) vs Mode 2 (candidate/novel) with grounding requirements         | 430+  |
| [D](./D_CONCEPT_PILLAR_RELATIONSHIP.md) | **Concept ↔ Pillar Relationship** | Mapping facts to concepts and the 8 content pillars                                         | 480+  |
| [E](./E_VECTOR_STORE_ROLE.md)           | **Vector Store Role**             | What gets embedded, when, how queried, what is returned                                     | 540+  |
| [F](./F_KNOWLEDGE_GRAPH_ROLE.md)        | **Knowledge Graph Role**          | Nodes, edges, relationships, temporal validity, conflict resolution                         | 500+  |
| [G](./G_ASSISTANT_QUERY_FLOW.md)        | **Assistant Query Flow**          | Step-by-step from user question to grounded answer                                          | 550+  |
| [H](./H_GOVERNANCE_PROMOTION_LOOP.md)   | **Governance & Promotion Loop**   | How Mode 2 becomes Mode 1, approval workflows                                               | 550+  |
| [I](./I_INFRASTRUCTURE_EXECUTION.md)    | **Infrastructure & Execution**    | Workers, queues, schedules, deployment model                                                | 500+  |

---

## Key Architectural Concepts

### Two-Layer Execution Model

- **Layer A (Discovery)**: Daily scheduled sentinel scans at 06:00 Zagreb time
- **Layer B (Processing)**: 24/7 continuous queue draining via BullMQ + Redis

### Three-Store Architecture

1. **Immutable Evidence Store** (`regulatory` schema) - Source documents never modified
2. **Time-Aware Rule Graph** (`public` schema) - Versioned regulatory rules with temporal validity
3. **Vector Store** (pgvector 768-dim) - Semantic search via nomic-embed-text embeddings

### Six-Stage Agent Pipeline

```
Sentinel → OCR → Extractor → Composer → Reviewer → Arbiter → Releaser
```

### Trust Guarantees

- **Evidence-backed claims**: Every rule has verifiable source pointers
- **No hallucination**: LLM outputs validated against source quotes
- **Fail-closed operation**: System refuses when uncertain
- **Immutable evidence**: rawContent never modified after capture

---

## Risk Tier Classification

| Tier | Description                                     | Auto-Approval                           |
| ---- | ----------------------------------------------- | --------------------------------------- |
| T0   | Critical: Tax rates, legal deadlines, penalties | **NEVER**                               |
| T1   | High: Thresholds, contribution bases            | **NEVER**                               |
| T2   | Medium: Procedural requirements, form fields    | Allowed (24h grace, >= 0.90 confidence) |
| T3   | Low: UI labels, help text                       | Allowed (24h grace, >= 0.90 confidence) |

---

## Authority Hierarchy

```
LAW > GUIDANCE > PROCEDURE > PRACTICE
```

When rules conflict, higher authority prevails. Used by Arbiter for conflict resolution.

---

## 8 Content Pillars

1. **Pausalni Obrt** - Flat-rate taxation
2. **PDV** - Value Added Tax
3. **Doprinosi** - Social contributions
4. **Porez na Dohodak** - Income tax
5. **Fiskalizacija** - Fiscal registers
6. **Rokovi** - Deadlines
7. **Obrasci** - Forms
8. **E-Računi** - E-invoicing

---

## Key Database Schemas

### Regulatory Schema (Evidence Layer)

- `RegulatorySource` - Monitored endpoints
- `Evidence` - Captured source documents
- `EvidenceArtifact` - OCR outputs, text layers
- `ExtractionRejected` - Dead letter queue
- `ConflictResolutionAudit` - Resolution history

### Public Schema (Rule Layer)

- `Concept` - Taxonomy hierarchy
- `RegulatoryRule` - Published rules
- `SourcePointer` - Evidence attribution
- `GraphEdge` - Rule relationships
- `RegulatoryConflict` - Conflict tracking
- `RuleRelease` - Versioned snapshots
- `AgentRun` - Execution audit trail

---

## UNKNOWN Items Summary

Each document identifies areas requiring further investigation:

- **A**: RTL observability dashboard, queue metrics visualization
- **B**: Historical versioning for rules, tenant isolation patterns
- **C**: Automatic Mode 2 → Mode 1 promotion workflow
- **D**: Explicit Pillar table, tag-based search indexing
- **E**: HNSW indexes, embedding versioning, cross-table search
- **F**: Cycle detection, transitive closure, graph visualization
- **G**: Multi-language support, query caching, feedback loop
- **H**: Human review UI, batch approval, notification system
- **I**: Auto-scaling, multi-region, alerting integration

---

## Document Conventions

### Factual Statements Only

- No "we should" language
- No implementation suggestions
- Mark unclear items as **UNKNOWN**
- Cite code paths where possible

### Evidence Sources

- Prisma schema files (`prisma/schema.prisma`, `prisma/regulatory.prisma`)
- Agent implementations (`src/lib/regulatory-truth/agents/`)
- Worker implementations (`src/lib/regulatory-truth/workers/`)
- Query engine (`src/lib/assistant/query-engine/`)
- Documentation (`docs/01_ARCHITECTURE/`)

---

## Next Steps

This exploration phase establishes the baseline. Future phases may include:

- Phase 1: Gap analysis and requirements
- Phase 2: Design proposals
- Phase 3: Implementation planning

All future work should reference these documents to ensure alignment with actual system behavior.

---

## File Manifest

```
docs/design/exploration/
├── 00_INDEX.md                      # This file
├── A_SYSTEM_MAP.md                  # End-to-end pipeline trace
├── B_DATA_MODEL_INVENTORY.md        # Complete schema documentation
├── C_EXTRACTION_MODES.md            # Mode 1 vs Mode 2 extraction
├── D_CONCEPT_PILLAR_RELATIONSHIP.md # Taxonomy and pillars
├── E_VECTOR_STORE_ROLE.md           # pgvector embeddings
├── F_KNOWLEDGE_GRAPH_ROLE.md        # Graph structure
├── G_ASSISTANT_QUERY_FLOW.md        # Query pipeline
├── H_GOVERNANCE_PROMOTION_LOOP.md   # Approval workflows
└── I_INFRASTRUCTURE_EXECUTION.md    # Workers and queues
```
