# Adaptive Sentinel Phase 1: Schema Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add topology, velocity, and risk fields to DiscoveredItem model with new enums.

**Architecture:** Prisma schema changes with migration. New enums for NodeType, NodeRole, FreshnessRisk. All fields have defaults to preserve existing data.

**Tech Stack:** Prisma 7, PostgreSQL

---

## Task 1: Add New Enums to Schema

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add the three new enums after existing enums (around line 1570)**

Find the `DiscoveredItemStatus` enum and add after it:

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

**Step 2: Verify schema is valid**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add NodeType, NodeRole, FreshnessRisk enums"
```

---

## Task 2: Add Topology Fields to DiscoveredItem

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add topology fields to DiscoveredItem model (around line 1784)**

Find the `DiscoveredItem` model and add after `retryCount`:

```prisma
  // --- Topology ---
  nodeType      NodeType   @default(LEAF)
  nodeRole      NodeRole?
  parentUrl     String?
  depth         Int        @default(0)
```

**Step 2: Verify schema is valid**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add topology fields to DiscoveredItem"
```

---

## Task 3: Add Velocity Fields to DiscoveredItem

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add velocity fields after topology fields**

```prisma
  // --- Velocity (EWMA: 0.0=static, 1.0=volatile) ---
  changeFrequency  Float      @default(0.5)
  lastChangedAt    DateTime?
  scanCount        Int        @default(0)
```

**Step 2: Verify schema is valid**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add velocity fields to DiscoveredItem"
```

---

## Task 4: Add Risk and Scheduling Fields to DiscoveredItem

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add risk and scheduling fields after velocity fields**

```prisma
  // --- Risk ---
  freshnessRisk    FreshnessRisk  @default(MEDIUM)

  // --- Scheduling ---
  nextScanDue      DateTime   @default(now())
```

**Step 2: Verify schema is valid**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add risk and scheduling fields to DiscoveredItem"
```

---

## Task 5: Add Performance Indexes

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add indexes to DiscoveredItem model (before the closing brace)**

Find existing indexes and add:

```prisma
  @@index([nextScanDue, freshnessRisk])  // The "Manifest" query
  @@index([endpointId, nodeType])        // Grouping queries
```

**Step 2: Verify schema is valid**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add performance indexes for adaptive scheduling"
```

---

## Task 6: Generate and Apply Migration

**Files:**

- Create: `prisma/migrations/YYYYMMDDHHMMSS_adaptive_sentinel/migration.sql` (auto-generated)

**Step 1: Generate migration**

Run: `npx prisma migrate dev --name adaptive_sentinel`
Expected: Migration created and applied successfully

**Step 2: Verify Prisma client is regenerated**

Run: `npx prisma generate`
Expected: "Generated Prisma Client"

**Step 3: Commit migration**

```bash
git add prisma/migrations/
git commit -m "feat(db): apply adaptive sentinel migration"
```

---

## Verification

After all tasks, run:

```bash
npx prisma validate && echo "Schema valid"
npx tsc --noEmit && echo "TypeScript valid"
```

Both should pass.
