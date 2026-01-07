# Duplication & Source-of-Truth Audit

**Date:** 2026-01-07
**Auditor:** Claude (Automated)
**Question:** "Do we currently have duplicate or parallel systems representing the same regulatory truth?"

**Answer:** YES - Parallel systems exist but only one is operational.

---

## Section 1: Entity & Truth Mapping

| Concept / Responsibility                | Legacy Entity                        | Phase-1 Entity                     | Currently Written To?     | Currently Read From?      | Intended Canonical Truth? | Evidence                                           |
| --------------------------------------- | ------------------------------------ | ---------------------------------- | ------------------------- | ------------------------- | ------------------------- | -------------------------------------------------- |
| **Regulatory fact / rule**              | `public.RegulatoryRule`              | `regulatory.RuleFact`              | Legacy: YES / Phase-1: NO | Legacy: YES / Phase-1: NO | TBD                       | `prisma/schema.prisma:3849`, DB query              |
| **Extracted data / candidate**          | `public.SourcePointer`               | `public.CandidateFact`             | Legacy: YES / Phase-1: NO | Legacy: YES / Phase-1: NO | TBD                       | `src/lib/regulatory-truth/agents/extractor.ts:278` |
| **Applicability (who/what/conditions)** | `RegulatoryRule.appliesWhen` (DSL)   | `RuleFact.conditions` (JSON)       | Legacy: YES / Phase-1: NO | Legacy: YES / Phase-1: NO | TBD                       | `prisma/schema.prisma:3859`                        |
| **Temporal validity (from/until)**      | `RegulatoryRule.effectiveFrom/Until` | `RuleFact.effectiveFrom/Until`     | Legacy: YES / Phase-1: NO | Legacy: YES / Phase-1: NO | TBD                       | Both schemas have identical fields                 |
| **Grounding / quotes**                  | `SourcePointer.exactQuote` (text)    | `RuleFact.groundingQuotes` (jsonb) | Legacy: YES / Phase-1: NO | Legacy: YES / Phase-1: NO | TBD                       | DB column inspection                               |
| **Concept identifiers / slugs**         | `RegulatoryRule.conceptSlug`         | `RuleFact.conceptSlug`             | Legacy: YES / Phase-1: NO | Legacy: YES / Phase-1: NO | Shared                    | Both reference `Concept.slug`                      |
| **Pillar mapping**                      | `SourcePointer.domain`               | `CandidateFact.suggestedPillar`    | Legacy: YES / Phase-1: NO | Legacy: YES / Phase-1: NO | TBD                       | DB column inspection                               |
| **Evidence / source content**           | `public.Evidence`                    | `regulatory.Evidence`              | Both: YES                 | Both: YES                 | TBD                       | Two tables exist: 2,022 vs 169 rows                |

---

## Section 2: Write-Path Audit

### SourcePointer Writes

| File Path                                                 | Function           | Worker/Script            | Production-Active |
| --------------------------------------------------------- | ------------------ | ------------------------ | ----------------- |
| `src/lib/regulatory-truth/agents/extractor.ts:278`        | `runExtractor()`   | `extractor.worker.ts`    | **YES**           |
| `src/lib/regulatory-truth/fetchers/hnb-fetcher.ts:168`    | `createHNBRules()` | `continuous-pipeline.ts` | **YES**           |
| `src/lib/regulatory-truth/fetchers/eurlex-fetcher.ts:168` | `fetchEurLex()`    | Manual script            | **YES**           |
| `src/lib/regulatory-truth/e2e/synthetic-heartbeat.ts:34`  | Test helper        | E2E test only            | NO                |

### RegulatoryRule Writes

| File Path                                                             | Function           | Worker/Script            | Production-Active |
| --------------------------------------------------------------------- | ------------------ | ------------------------ | ----------------- |
| `src/lib/regulatory-truth/agents/composer.ts:379`                     | `runComposer()`    | `continuous-pipeline.ts` | **YES**           |
| `src/lib/regulatory-truth/fetchers/hnb-fetcher.ts:180`                | `createHNBRules()` | `continuous-pipeline.ts` | **YES**           |
| `src/lib/regulatory-truth/graph/__tests__/cycle-detection.test.ts:23` | Test helper        | Test only                | NO                |

### CandidateFact Writes

**NONE FOUND IN PRODUCTION CODE.**

Search performed:

```bash
grep -r "candidateFact\.create\|CandidateFact.*create" src/
# Result: No matches
```

### RuleFact Writes

**NONE FOUND IN PRODUCTION CODE.**

Search performed:

```bash
grep -r "ruleFact\.create\|RuleFact.*create" src/
# Result: No matches
```

### Explicit Confirmation

| Entity        | Written ANYWHERE in Production? |
| ------------- | ------------------------------- |
| CandidateFact | **NO**                          |
| RuleFact      | **NO**                          |

---

## Section 3: Read-Path Audit (Assistant)

### Tables/Types Queried

The assistant query engine queries **only RegulatoryRule**:

```typescript
// src/lib/assistant/query-engine/rule-selector.ts:131-140
const allRulesRaw = await prisma.regulatoryRule.findMany({
  where: {
    conceptSlug: { in: conceptSlugs },
    status: "PUBLISHED",
  },
  include: {
    sourcePointers: true,
  },
  orderBy: [{ authorityLevel: "asc" }, { confidence: "desc" }, { effectiveFrom: "desc" }],
})
```

### Query Order

1. Filter by `conceptSlug` (from semantic matching)
2. Filter by `status: "PUBLISHED"`
3. Include `sourcePointers` relation for grounding
4. Sort by authority level, confidence, effective date

### Fallback Logic

**None.** The assistant has no fallback to RuleFact or CandidateFact.

### Explicit Answers

| Question                               | Answer  | Evidence                                                       |
| -------------------------------------- | ------- | -------------------------------------------------------------- |
| Does the assistant ever read RuleFact? | **NO**  | `grep -r "ruleFact" src/lib/assistant/` returns 0 matches      |
| Does it ever read CandidateFact?       | **NO**  | `grep -r "candidateFact" src/lib/assistant/` returns 0 matches |
| Does it rely solely on RegulatoryRule? | **YES** | `rule-selector.ts:131` is the only rule query                  |

---

## Section 4: Concept Registry Duplication

### Where Concept Slugs Are Defined

| Location                                                | Type            | Purpose                               |
| ------------------------------------------------------- | --------------- | ------------------------------------- |
| `public.Concept` table                                  | Database        | Canonical concept registry (480 rows) |
| `src/lib/regulatory-truth/utils/concept-resolver.ts:15` | Code            | `CANONICAL_ALIASES` for deduplication |
| `RegulatoryRule.conceptSlug`                            | Database column | References Concept.slug               |
| `RuleFact.conceptSlug`                                  | Database column | References Concept.slug               |

### Do Legacy and Phase-1 Share Identifiers?

**YES.** Both `RegulatoryRule.conceptSlug` and `RuleFact.conceptSlug`:

- Reference the same `Concept.slug` namespace
- Have foreign key to `Concept(id)`
- Use identical validation patterns

### Any Mismatches or Parallel Registries?

**NO parallel registries found.** Both systems share the `Concept` table.

However, `CANONICAL_ALIASES` in `concept-resolver.ts` provides in-code alias mapping that is not stored in the database.

### Is There Exactly ONE Canonical Concept Namespace Today?

**YES** - The `Concept` table is the single source of truth for concept identifiers.

---

## Section 5: Grounding & Quote Representation

### All Quote / Grounding Representations

| Table           | Column            | Type    | Verification Fields                     |
| --------------- | ----------------- | ------- | --------------------------------------- |
| `SourcePointer` | `exactQuote`      | `text`  | `startOffset`, `endOffset`, `matchType` |
| `SourcePointer` | `contextBefore`   | `text`  | None                                    |
| `SourcePointer` | `contextAfter`    | `text`  | None                                    |
| `CandidateFact` | `groundingQuotes` | `jsonb` | None (table empty)                      |
| `RuleFact`      | `groundingQuotes` | `jsonb` | None (table empty)                      |
| `AtomicClaim`   | `exactQuote`      | `text`  | None (table empty)                      |

### SourcePointer Quote Structure

```sql
-- From prisma/schema.prisma:3776-3804
exactQuote     String  @db.Text    -- Exact text from source
contextBefore  String? @db.Text    -- Previous sentence/paragraph
contextAfter   String? @db.Text    -- Following sentence/paragraph
startOffset    Int?                -- UTF-16 offset in rawContent
endOffset      Int?                -- UTF-16 offset end
matchType      SourcePointerMatchType?  -- PENDING_VERIFICATION, EXACT, NORMALIZED, NOT_FOUND
```

### Phase-1 GroundingQuote Structure (from CandidateFact/RuleFact)

```sql
-- jsonb column, structure from plan docs:
{
  "text": string,
  "startOffset": number,
  "endOffset": number,
  "evidenceId": string,
  "matchType": "EXACT" | "NORMALIZED"
}
```

### Which Representation Is Actually Used at Runtime?

**SourcePointer.exactQuote** - used by assistant for citations.

Evidence: `src/lib/assistant/query-engine/rule-selector.ts:34-41` defines `sourcePointers.exactQuote` in return type.

### Are Both Populated?

| Representation                | Populated? | Row Count              |
| ----------------------------- | ---------- | ---------------------- |
| SourcePointer.exactQuote      | **YES**    | 2,177 rows with quotes |
| CandidateFact.groundingQuotes | **NO**     | 0 rows                 |
| RuleFact.groundingQuotes      | **NO**     | 0 rows                 |

### Are They Compatible or Divergent?

**DIVERGENT.** Key differences:

| Aspect          | SourcePointer         | Phase-1 (groundingQuotes) |
| --------------- | --------------------- | ------------------------- |
| Storage type    | Single text column    | JSON array                |
| Multiple quotes | One per SourcePointer | Multiple per fact         |
| Evidence link   | Via `evidenceId` FK   | Embedded in JSON          |
| Verification    | `matchType` enum      | In JSON structure         |

---

## Section 6: Database Reality Check

### Row Counts

```sql
SELECT table_schema, table_name, row_count FROM (
  SELECT 'public' as table_schema, 'SourcePointer' as table_name, 2177 as row_count
  UNION ALL SELECT 'public', 'RegulatoryRule', 615
  UNION ALL SELECT 'public', 'CandidateFact', 0
  UNION ALL SELECT 'public', 'Concept', 480
  UNION ALL SELECT 'public', 'AtomicClaim', 0
  UNION ALL SELECT 'public', 'Evidence', 2022
  UNION ALL SELECT 'regulatory', 'RuleFact', 0
  UNION ALL SELECT 'regulatory', 'Evidence', 169
) t ORDER BY table_schema, table_name;
```

| Schema     | Table          | Row Count |
| ---------- | -------------- | --------- |
| public     | AtomicClaim    | 0         |
| public     | CandidateFact  | 0         |
| public     | Concept        | 480       |
| public     | Evidence       | 2,022     |
| public     | RegulatoryRule | 615       |
| public     | SourcePointer  | 2,177     |
| regulatory | Evidence       | 169       |
| regulatory | RuleFact       | 0         |

### Which Tables Are Empty?

| Table           | Status             |
| --------------- | ------------------ |
| `CandidateFact` | **EMPTY** (0 rows) |
| `RuleFact`      | **EMPTY** (0 rows) |
| `AtomicClaim`   | **EMPTY** (0 rows) |

### Which Tables Drive Production Answers Today?

| Table                 | Drives Production? | Evidence                            |
| --------------------- | ------------------ | ----------------------------------- |
| `RegulatoryRule`      | **YES**            | `rule-selector.ts:131` queries this |
| `SourcePointer`       | **YES**            | Included for grounding/citations    |
| `regulatory.Evidence` | **YES**            | Joined for source URLs              |
| `RuleFact`            | **NO**             | Never queried                       |
| `CandidateFact`       | **NO**             | Never queried                       |

---

## Section 7: Conclusion (Factual Only)

### Do Parallel Truth Systems Exist?

**YES.**

### Which Entities Overlap in Responsibility?

| Responsibility           | Legacy Entity              | Phase-1 Entity        | Overlap? |
| ------------------------ | -------------------------- | --------------------- | -------- |
| Verified regulatory fact | `RegulatoryRule`           | `RuleFact`            | **YES**  |
| Candidate/extracted data | `SourcePointer`            | `CandidateFact`       | **YES**  |
| Grounding quotes         | `SourcePointer.exactQuote` | `*.groundingQuotes`   | **YES**  |
| Evidence storage         | `public.Evidence`          | `regulatory.Evidence` | **YES**  |

### Which One Is Actually Authoritative Today?

| Responsibility   | Authoritative Entity       | Evidence                      |
| ---------------- | -------------------------- | ----------------------------- |
| Regulatory facts | `RegulatoryRule`           | Only one queried by assistant |
| Extracted data   | `SourcePointer`            | Only one populated            |
| Grounding        | `SourcePointer.exactQuote` | Only one with data            |
| Evidence         | Both schemas               | Both written to               |

### What MUST Be Decided Before Implementing the Bridge?

1. **Fact Model Decision**
   - Will `RuleFact` replace `RegulatoryRule` or coexist?
   - How will existing 615 RegulatoryRules be migrated?

2. **Extraction Target Decision**
   - Will `CandidateFact` replace `SourcePointer` as extraction output?
   - What happens to existing 2,177 SourcePointers?

3. **Quote Representation Decision**
   - Single text column (SourcePointer style) vs JSON array (Phase-1 style)?
   - How to convert existing quotes?

4. **Evidence Schema Decision**
   - Will `regulatory.Evidence` become canonical?
   - What happens to `public.Evidence` (2,022 rows)?

5. **Assistant Query Decision**
   - When does assistant start querying RuleFact?
   - Fallback behavior during transition?

6. **Prisma Schema Decision**
   - `CandidateFact` exists in database but NOT in `prisma/schema.prisma`
   - `RuleFact` is in regulatory schema but NOT in main schema
   - Schema files need alignment with database reality

---

## Appendix: Schema Location Summary

### Tables NOT in prisma/schema.prisma (but exist in DB)

| Table           | Database Location      | In Prisma?            |
| --------------- | ---------------------- | --------------------- |
| `CandidateFact` | `public.CandidateFact` | **NO**                |
| `RuleFact`      | `regulatory.RuleFact`  | See regulatory.prisma |

### Prisma Schema Files

| File                       | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `prisma/schema.prisma`     | Main schema (SourcePointer, RegulatoryRule, Concept) |
| `prisma/regulatory.prisma` | Regulatory schema (Evidence, RuleFact)               |

---

**Audit Complete:** 2026-01-07
**Next Action:** Decisions required before bridge implementation
