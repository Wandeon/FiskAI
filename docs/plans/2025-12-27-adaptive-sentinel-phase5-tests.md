# Adaptive Sentinel Phase 5: Tests

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Create comprehensive unit tests for adaptive sentinel utilities.

**Architecture:** Vitest tests for pure functions. No database mocking needed for utilities.

**Tech Stack:** Vitest, TypeScript

---

## Task 1: Create Classifier Tests

**Files:**

- Create: `src/lib/regulatory-truth/utils/__tests__/node-classifier.test.ts`

**Step 1: Create the test file**

```typescript
// src/lib/regulatory-truth/utils/__tests__/node-classifier.test.ts

import { describe, it, expect } from "vitest"
import { classifyUrl, applyRiskInheritance } from "../node-classifier"

describe("classifyUrl", () => {
  describe("asset detection", () => {
    it("classifies PDF URLs as ASSET", () => {
      const result = classifyUrl("https://example.com/document.pdf")
      expect(result.nodeType).toBe("ASSET")
      expect(result.freshnessRisk).toBe("MEDIUM")
    })

    it("classifies DOCX URLs as ASSET", () => {
      const result = classifyUrl("https://example.com/file.docx")
      expect(result.nodeType).toBe("ASSET")
    })

    it("classifies by content-type header", () => {
      const result = classifyUrl("https://example.com/download", "application/pdf")
      expect(result.nodeType).toBe("ASSET")
    })
  })

  describe("Croatian regulatory patterns", () => {
    it("classifies /vijesti/ as NEWS_FEED with HIGH risk", () => {
      const result = classifyUrl("https://hzzo.hr/vijesti/nova-objava")
      expect(result.nodeType).toBe("HUB")
      expect(result.nodeRole).toBe("NEWS_FEED")
      expect(result.freshnessRisk).toBe("HIGH")
    })

    it("classifies /novosti/ as NEWS_FEED", () => {
      const result = classifyUrl("https://porezna.hr/novosti/")
      expect(result.nodeRole).toBe("NEWS_FEED")
    })

    it("classifies /propisi/ as REGULATION with CRITICAL risk", () => {
      const result = classifyUrl("https://nn.hr/propisi/zakon-123")
      expect(result.nodeType).toBe("LEAF")
      expect(result.nodeRole).toBe("REGULATION")
      expect(result.freshnessRisk).toBe("CRITICAL")
    })

    it("classifies /zakoni/ as REGULATION", () => {
      const result = classifyUrl("https://nn.hr/zakoni/pdv")
      expect(result.nodeRole).toBe("REGULATION")
      expect(result.freshnessRisk).toBe("CRITICAL")
    })

    it("classifies /savjetovanja/ as GUIDANCE with CRITICAL risk", () => {
      const result = classifyUrl("https://gov.hr/savjetovanja/novi-zakon")
      expect(result.nodeRole).toBe("GUIDANCE")
      expect(result.freshnessRisk).toBe("CRITICAL")
    })

    it("classifies /obrasci/ as FORM with MEDIUM risk", () => {
      const result = classifyUrl("https://porezna.hr/obrasci/pd-prijava")
      expect(result.nodeType).toBe("LEAF")
      expect(result.nodeRole).toBe("FORM")
      expect(result.freshnessRisk).toBe("MEDIUM")
    })

    it("classifies /arhiva/ as ARCHIVE with LOW risk", () => {
      const result = classifyUrl("https://example.com/arhiva/2020/")
      expect(result.nodeType).toBe("HUB")
      expect(result.nodeRole).toBe("ARCHIVE")
      expect(result.freshnessRisk).toBe("LOW")
    })

    it("classifies /upute/ as GUIDANCE", () => {
      const result = classifyUrl("https://porezna.hr/upute/pausalni")
      expect(result.nodeRole).toBe("GUIDANCE")
      expect(result.freshnessRisk).toBe("MEDIUM")
    })

    it("classifies /misljenja/ as GUIDANCE", () => {
      const result = classifyUrl("https://porezna.hr/misljenja/pdv-stope")
      expect(result.nodeRole).toBe("GUIDANCE")
    })
  })

  describe("default classification", () => {
    it("returns LEAF/MEDIUM for unknown URLs", () => {
      const result = classifyUrl("https://example.com/random-page")
      expect(result.nodeType).toBe("LEAF")
      expect(result.nodeRole).toBeNull()
      expect(result.freshnessRisk).toBe("MEDIUM")
    })
  })
})

describe("applyRiskInheritance", () => {
  it("upgrades ASSET risk when parent is CRITICAL", () => {
    const classification = {
      nodeType: "ASSET" as const,
      nodeRole: null,
      freshnessRisk: "MEDIUM" as const,
    }
    const result = applyRiskInheritance(classification, "CRITICAL")
    expect(result.freshnessRisk).toBe("CRITICAL")
  })

  it("upgrades ASSET risk when parent is HIGH", () => {
    const classification = {
      nodeType: "ASSET" as const,
      nodeRole: null,
      freshnessRisk: "MEDIUM" as const,
    }
    const result = applyRiskInheritance(classification, "HIGH")
    expect(result.freshnessRisk).toBe("HIGH")
  })

  it("does not change non-ASSET nodes", () => {
    const classification = {
      nodeType: "LEAF" as const,
      nodeRole: null,
      freshnessRisk: "MEDIUM" as const,
    }
    const result = applyRiskInheritance(classification, "CRITICAL")
    expect(result.freshnessRisk).toBe("MEDIUM")
  })

  it("does not downgrade ASSET risk", () => {
    const classification = {
      nodeType: "ASSET" as const,
      nodeRole: null,
      freshnessRisk: "MEDIUM" as const,
    }
    const result = applyRiskInheritance(classification, "LOW")
    expect(result.freshnessRisk).toBe("MEDIUM")
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/regulatory-truth/utils/__tests__/node-classifier.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/__tests__/node-classifier.test.ts
git commit -m "test: add unit tests for node-classifier"
```

---

## Task 2: Create Velocity Profiler Tests

**Files:**

- Create: `src/lib/regulatory-truth/utils/__tests__/velocity-profiler.test.ts`

**Step 1: Create the test file**

```typescript
// src/lib/regulatory-truth/utils/__tests__/velocity-profiler.test.ts

import { describe, it, expect } from "vitest"
import { updateVelocity, describeVelocity } from "../velocity-profiler"

describe("updateVelocity", () => {
  describe("warmup period", () => {
    it("stays at 0.5 during first 3 scans regardless of change", () => {
      expect(updateVelocity(0.5, 0, true).newFrequency).toBe(0.5)
      expect(updateVelocity(0.5, 1, false).newFrequency).toBe(0.5)
      expect(updateVelocity(0.5, 2, true).newFrequency).toBe(0.5)
    })

    it("sets lastChangedAt only when content changed", () => {
      const changed = updateVelocity(0.5, 0, true)
      expect(changed.lastChangedAt).toBeInstanceOf(Date)

      const unchanged = updateVelocity(0.5, 1, false)
      expect(unchanged.lastChangedAt).toBeNull()
    })
  })

  describe("post-warmup EWMA", () => {
    it("increases velocity when content changes", () => {
      const result = updateVelocity(0.5, 5, true)
      // EWMA: 0.3 * 1.0 + 0.7 * 0.5 = 0.3 + 0.35 = 0.65
      expect(result.newFrequency).toBeCloseTo(0.65, 2)
    })

    it("decreases velocity when content is stable", () => {
      const result = updateVelocity(0.5, 5, false)
      // EWMA: 0.1 * 0.0 + 0.9 * 0.5 = 0.45
      expect(result.newFrequency).toBeCloseTo(0.45, 2)
    })

    it("spikes quickly on change (alpha=0.3)", () => {
      const result = updateVelocity(0.1, 5, true)
      // EWMA: 0.3 * 1.0 + 0.7 * 0.1 = 0.37
      expect(result.newFrequency).toBeCloseTo(0.37, 2)
    })

    it("decays slowly on stability (alpha=0.1)", () => {
      const result = updateVelocity(0.8, 5, false)
      // EWMA: 0.1 * 0.0 + 0.9 * 0.8 = 0.72
      expect(result.newFrequency).toBeCloseTo(0.72, 2)
    })
  })

  describe("clamping", () => {
    it("clamps to minimum 0.01", () => {
      // After many stable scans from low value
      let freq = 0.05
      for (let i = 0; i < 20; i++) {
        freq = updateVelocity(freq, 10, false).newFrequency
      }
      expect(freq).toBeGreaterThanOrEqual(0.01)
    })

    it("clamps to maximum 0.99", () => {
      // After many changes from high value
      let freq = 0.95
      for (let i = 0; i < 20; i++) {
        freq = updateVelocity(freq, 10, true).newFrequency
      }
      expect(freq).toBeLessThanOrEqual(0.99)
    })
  })
})

describe("describeVelocity", () => {
  it("describes 0.9 as volatile", () => {
    expect(describeVelocity(0.9)).toBe("volatile")
  })

  it("describes 0.6 as active", () => {
    expect(describeVelocity(0.6)).toBe("active")
  })

  it("describes 0.3 as moderate", () => {
    expect(describeVelocity(0.3)).toBe("moderate")
  })

  it("describes 0.1 as static", () => {
    expect(describeVelocity(0.1)).toBe("static")
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/regulatory-truth/utils/__tests__/velocity-profiler.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/__tests__/velocity-profiler.test.ts
git commit -m "test: add unit tests for velocity-profiler"
```

---

## Task 3: Create Scan Scheduler Tests

**Files:**

- Create: `src/lib/regulatory-truth/utils/__tests__/scan-scheduler.test.ts`

**Step 1: Create the test file**

```typescript
// src/lib/regulatory-truth/utils/__tests__/scan-scheduler.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { calculateNextScan, calculateIntervalHours, describeInterval } from "../scan-scheduler"

describe("calculateIntervalHours", () => {
  it("returns shorter intervals for CRITICAL risk", () => {
    const critical = calculateIntervalHours(0.5, "CRITICAL")
    const medium = calculateIntervalHours(0.5, "MEDIUM")
    expect(critical).toBeLessThan(medium)
  })

  it("returns shorter intervals for higher velocity", () => {
    const highVelocity = calculateIntervalHours(0.9, "MEDIUM")
    const lowVelocity = calculateIntervalHours(0.1, "MEDIUM")
    expect(highVelocity).toBeLessThan(lowVelocity)
  })

  it("respects minimum interval (baseIntervalHours)", () => {
    // Even with max velocity and max risk, should not go below 4h
    const interval = calculateIntervalHours(0.99, "CRITICAL")
    expect(interval).toBeGreaterThanOrEqual(4)
  })

  it("respects maximum interval", () => {
    // Low velocity + low risk should cap at 720h (30 days)
    const interval = calculateIntervalHours(0.01, "LOW")
    expect(interval).toBeLessThanOrEqual(720)
  })

  describe("specific interval values", () => {
    it("CRITICAL + high velocity (0.9) = ~4h (floor)", () => {
      const interval = calculateIntervalHours(0.9, "CRITICAL")
      expect(interval).toBe(4) // Floored
    })

    it("MEDIUM + moderate velocity (0.5) = ~8h", () => {
      const interval = calculateIntervalHours(0.5, "MEDIUM")
      expect(interval).toBe(8)
    })

    it("LOW + low velocity (0.1) = ~80h", () => {
      const interval = calculateIntervalHours(0.1, "LOW")
      expect(interval).toBe(80)
    })
  })
})

describe("calculateNextScan", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns a future date", () => {
    const result = calculateNextScan(0.5, "MEDIUM")
    expect(result.getTime()).toBeGreaterThan(Date.now())
  })

  it("applies jitter (+/- 10%)", () => {
    // Run multiple times and check variance
    const results: number[] = []
    for (let i = 0; i < 10; i++) {
      const result = calculateNextScan(0.5, "MEDIUM")
      results.push(result.getTime())
    }

    const min = Math.min(...results)
    const max = Math.max(...results)
    expect(max - min).toBeGreaterThan(0) // Has variance
  })
})

describe("describeInterval", () => {
  it("describes hours for < 24h", () => {
    expect(describeInterval(4)).toBe("4h")
    expect(describeInterval(12)).toBe("12h")
  })

  it("describes days for 24-168h", () => {
    expect(describeInterval(48)).toBe("2d")
    expect(describeInterval(120)).toBe("5d")
  })

  it("describes weeks for >= 168h", () => {
    expect(describeInterval(168)).toBe("1w")
    expect(describeInterval(336)).toBe("2w")
  })
})
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/regulatory-truth/utils/__tests__/scan-scheduler.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/lib/regulatory-truth/utils/__tests__/scan-scheduler.test.ts
git commit -m "test: add unit tests for scan-scheduler"
```

---

## Verification

Run all tests together:

```bash
npx vitest run src/lib/regulatory-truth/utils/__tests__/
```

Expected: All tests pass with good coverage of:

- URL classification patterns
- EWMA velocity calculations
- Scheduling formula accuracy
- Edge cases (clamping, jitter, inheritance)
