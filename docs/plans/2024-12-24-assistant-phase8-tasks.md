# FiskAI Assistant Phase 8: Marketing CTA System

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the marketing conversion system with contextual CTAs, personalization panel, and dismissal logic.

**Architecture:** React components with eligibility hook controlling visibility based on query count and personalization intent.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest

**Prerequisites:** Phase 7 complete (accessibility)

---

## Task 42: Create useCTAEligibility Hook

**Files:**

- Create: `src/lib/assistant/hooks/useCTAEligibility.ts`
- Test: `src/lib/assistant/hooks/__tests__/useCTAEligibility.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/hooks/__tests__/useCTAEligibility.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCTAEligibility } from "../useCTAEligibility"
import type { AssistantResponse, Surface } from "../../types"
import { SCHEMA_VERSION } from "../../types"

const mockRegulatoryAnswer: AssistantResponse = {
  schemaVersion: SCHEMA_VERSION,
  requestId: "req_1",
  traceId: "trace_1",
  kind: "ANSWER",
  topic: "REGULATORY",
  surface: "MARKETING",
  createdAt: new Date().toISOString(),
  headline: "VAT is 25%",
  directAnswer: "Standard rate.",
  citations: {
    primary: {
      id: "src_1",
      title: "Law",
      authority: "LAW",
      url: "https://example.com",
      effectiveFrom: "2024-01-01",
      confidence: 0.95,
    },
    supporting: [],
  },
}

const mockPersonalizationAnswer: AssistantResponse = {
  ...mockRegulatoryAnswer,
  headline: "Your VAT threshold status",
  // Personalization intent detected in query
}

describe("useCTAEligibility", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns not eligible on first answer (non-personalization)", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "What is VAT rate?")
    })

    expect(result.current.isEligible).toBe(false)
    expect(result.current.eligibilityReason).toBe("first_query")
  })

  it("returns eligible after 2+ successful REGULATORY answers", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "What is VAT rate?")
      result.current.recordAnswer(mockRegulatoryAnswer, "When is deadline?")
    })

    expect(result.current.isEligible).toBe(true)
    expect(result.current.ctaType).toBe("contextual")
  })

  it("returns eligible on first personalization query", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockPersonalizationAnswer, "my VAT threshold")
    })

    expect(result.current.isEligible).toBe(true)
    expect(result.current.ctaType).toBe("personalization")
  })

  it("detects personalization intent in query", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    const intents = [
      "my revenue",
      "my business",
      "calculate for me",
      "my threshold",
      "for my company",
    ]

    intents.forEach((query) => {
      expect(result.current.hasPersonalizationIntent(query)).toBe(true)
    })
  })

  it("returns not eligible for APP surface (always has client data)", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "APP" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "test")
      result.current.recordAnswer(mockRegulatoryAnswer, "test2")
    })

    expect(result.current.isEligible).toBe(false)
  })

  it("returns not eligible for REFUSAL answers", () => {
    const refusalAnswer: AssistantResponse = {
      ...mockRegulatoryAnswer,
      kind: "REFUSAL",
      refusalReason: "OUT_OF_SCOPE",
    }

    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(refusalAnswer, "test")
      result.current.recordAnswer(refusalAnswer, "test2")
    })

    expect(result.current.isEligible).toBe(false)
  })

  it("tracks successful query count", () => {
    const { result } = renderHook(() => useCTAEligibility({ surface: "MARKETING" }))

    act(() => {
      result.current.recordAnswer(mockRegulatoryAnswer, "q1")
      result.current.recordAnswer(mockRegulatoryAnswer, "q2")
      result.current.recordAnswer(mockRegulatoryAnswer, "q3")
    })

    expect(result.current.successfulQueryCount).toBe(3)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useCTAEligibility.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/assistant/hooks/useCTAEligibility.ts
import { useState, useCallback, useMemo } from "react"
import type { AssistantResponse, Surface, Topic } from "../types"

interface UseCTAEligibilityProps {
  surface: Surface
}

type CTAType = "contextual" | "personalization" | null
type EligibilityReason =
  | "first_query"
  | "non_regulatory"
  | "refusal"
  | "app_surface"
  | "dismissed"
  | "eligible"

const PERSONALIZATION_KEYWORDS = [
  "my ",
  "mine",
  "my business",
  "my company",
  "my revenue",
  "my threshold",
  "for me",
  "calculate for",
  "my invoices",
  "my data",
]

export function useCTAEligibility({ surface }: UseCTAEligibilityProps) {
  const [successfulQueryCount, setSuccessfulQueryCount] = useState(0)
  const [lastPersonalizationIntent, setLastPersonalizationIntent] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const hasPersonalizationIntent = useCallback((query: string): boolean => {
    const lowerQuery = query.toLowerCase()
    return PERSONALIZATION_KEYWORDS.some((keyword) => lowerQuery.includes(keyword))
  }, [])

  const recordAnswer = useCallback(
    (answer: AssistantResponse, query: string) => {
      // Only count successful REGULATORY answers with citations
      if (answer.kind === "ANSWER" && answer.topic === "REGULATORY" && answer.citations) {
        setSuccessfulQueryCount((prev) => prev + 1)
      }

      setLastPersonalizationIntent(hasPersonalizationIntent(query))
    },
    [hasPersonalizationIntent]
  )

  const dismiss = useCallback(() => {
    setIsDismissed(true)
    // Store dismissal in localStorage with 7-day expiry
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000
    localStorage.setItem("assistant_cta_dismissed", JSON.stringify({ expiry }))
  }, [])

  const eligibility = useMemo(() => {
    // APP surface never shows marketing CTAs
    if (surface === "APP") {
      return { isEligible: false, reason: "app_surface" as EligibilityReason, ctaType: null }
    }

    // Dismissed
    if (isDismissed) {
      return { isEligible: false, reason: "dismissed" as EligibilityReason, ctaType: null }
    }

    // First query with personalization intent
    if (successfulQueryCount >= 1 && lastPersonalizationIntent) {
      return {
        isEligible: true,
        reason: "eligible" as EligibilityReason,
        ctaType: "personalization" as CTAType,
      }
    }

    // 2+ successful queries
    if (successfulQueryCount >= 2) {
      return {
        isEligible: true,
        reason: "eligible" as EligibilityReason,
        ctaType: "contextual" as CTAType,
      }
    }

    // First query without personalization
    return {
      isEligible: false,
      reason: "first_query" as EligibilityReason,
      ctaType: null,
    }
  }, [surface, isDismissed, successfulQueryCount, lastPersonalizationIntent])

  return {
    isEligible: eligibility.isEligible,
    eligibilityReason: eligibility.reason,
    ctaType: eligibility.ctaType,
    successfulQueryCount,
    hasPersonalizationIntent,
    recordAnswer,
    dismiss,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useCTAEligibility.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useCTAEligibility.ts src/lib/assistant/hooks/__tests__/useCTAEligibility.test.ts
git commit -m "feat(assistant): add useCTAEligibility hook"
```

---

## Task 43: Create CTABlock Component

**Files:**

- Create: `src/components/assistant-v2/CTABlock.tsx`
- Test: `src/components/assistant-v2/__tests__/CTABlock.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/CTABlock.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CTABlock } from '../CTABlock'

describe('CTABlock', () => {
  describe('contextual variant', () => {
    it('renders contextual upsell headline', () => {
      render(
        <CTABlock
          variant="contextual"
          topic="REGULATORY"
          onAction={vi.fn()}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText(/calculate this for your business/i)).toBeInTheDocument()
    })

    it('renders primary action button', () => {
      render(
        <CTABlock
          variant="contextual"
          topic="REGULATORY"
          onAction={vi.fn()}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /start free/i })).toBeInTheDocument()
    })

    it('renders trust link', () => {
      render(
        <CTABlock
          variant="contextual"
          topic="REGULATORY"
          onAction={vi.fn()}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByRole('link', { name: /how sources are verified/i })).toBeInTheDocument()
    })

    it('calls onAction when CTA button clicked', async () => {
      const onAction = vi.fn()
      const user = userEvent.setup()

      render(
        <CTABlock
          variant="contextual"
          topic="REGULATORY"
          onAction={onAction}
          onDismiss={vi.fn()}
        />
      )

      await user.click(screen.getByRole('button', { name: /start free/i }))

      expect(onAction).toHaveBeenCalled()
    })

    it('calls onDismiss when dismiss button clicked', async () => {
      const onDismiss = vi.fn()
      const user = userEvent.setup()

      render(
        <CTABlock
          variant="contextual"
          topic="REGULATORY"
          onAction={vi.fn()}
          onDismiss={onDismiss}
        />
      )

      await user.click(screen.getByRole('button', { name: /dismiss/i }))

      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('personalization variant', () => {
    it('renders personalization headline', () => {
      render(
        <CTABlock
          variant="personalization"
          topic="REGULATORY"
          onAction={vi.fn()}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByText(/personalize this answer/i)).toBeInTheDocument()
    })

    it('renders connect data CTA', () => {
      render(
        <CTABlock
          variant="personalization"
          topic="REGULATORY"
          onAction={vi.fn()}
          onDismiss={vi.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /connect.*data/i })).toBeInTheDocument()
    })
  })

  it('does not render emojis', () => {
    const { container } = render(
      <CTABlock
        variant="contextual"
        topic="REGULATORY"
        onAction={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    // Check no emoji unicode ranges
    const text = container.textContent || ''
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u
    expect(emojiRegex.test(text)).toBe(false)
  })

  it('has subtle card styling (not loud)', () => {
    const { container } = render(
      <CTABlock
        variant="contextual"
        topic="REGULATORY"
        onAction={vi.fn()}
        onDismiss={vi.fn()}
      />
    )

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-muted')
    expect(card.className).not.toContain('bg-primary')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/CTABlock.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/CTABlock.tsx
'use client'

import { X, Calculator, Link2 } from 'lucide-react'
import type { Topic } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface CTABlockProps {
  variant: 'contextual' | 'personalization'
  topic: Topic
  onAction: () => void
  onDismiss: () => void
  className?: string
}

const CONTEXTUAL_COPY = {
  headline: 'Calculate this for your business',
  description: 'Connect your invoices to see your exact threshold status and remaining amount.',
  action: 'Start free',
  trustLink: 'See how sources are verified',
  trustHref: '/izvori',
}

const PERSONALIZATION_COPY = {
  headline: 'Personalize this answer',
  description: 'Connect your business data to get calculations specific to your situation.',
  action: 'Connect your data',
  trustLink: 'How calculations work',
  trustHref: '/methodology',
}

export function CTABlock({
  variant,
  topic,
  onAction,
  onDismiss,
  className,
}: CTABlockProps) {
  const copy = variant === 'contextual' ? CONTEXTUAL_COPY : PERSONALIZATION_COPY
  const Icon = variant === 'contextual' ? Calculator : Link2

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg bg-muted/50 border',
        className
      )}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="flex items-start gap-3 pr-6">
        <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium">{copy.headline}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>

          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={onAction}
              className={cn(
                'text-sm px-4 py-2 rounded-md transition-colors',
                'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {copy.action}
            </button>

            <a
              href={copy.trustHref}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {copy.trustLink}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/CTABlock.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/CTABlock.tsx src/components/assistant-v2/__tests__/CTABlock.test.tsx
git commit -m "feat(assistant): add CTABlock component"
```

---

## Task 44: Create PersonalizationPanel Component

**Files:**

- Create: `src/components/assistant-v2/PersonalizationPanel.tsx`
- Test: `src/components/assistant-v2/__tests__/PersonalizationPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/PersonalizationPanel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonalizationPanel } from '../PersonalizationPanel'

describe('PersonalizationPanel', () => {
  it('renders header', () => {
    render(<PersonalizationPanel onConnect={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /personalize/i })).toBeInTheDocument()
  })

  it('renders description of what connecting provides', () => {
    render(<PersonalizationPanel onConnect={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByText(/connect your data/i)).toBeInTheDocument()
  })

  it('renders list of data sources that can be connected', () => {
    render(<PersonalizationPanel onConnect={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByText(/invoices/i)).toBeInTheDocument()
    expect(screen.getByText(/bank/i)).toBeInTheDocument()
  })

  it('renders connect button', () => {
    render(<PersonalizationPanel onConnect={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('calls onConnect when connect button clicked', async () => {
    const onConnect = vi.fn()
    const user = userEvent.setup()

    render(<PersonalizationPanel onConnect={onConnect} onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(onConnect).toHaveBeenCalled()
  })

  it('renders dismiss link', () => {
    render(<PersonalizationPanel onConnect={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss clicked', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    render(<PersonalizationPanel onConnect={vi.fn()} onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: /not now/i }))

    expect(onDismiss).toHaveBeenCalled()
  })

  it('has matching visual weight with EvidencePanel', () => {
    const { container } = render(
      <PersonalizationPanel onConnect={vi.fn()} onDismiss={vi.fn()} />
    )

    const panel = container.firstChild as HTMLElement
    expect(panel.className).toContain('border')
    expect(panel.className).toContain('rounded-lg')
  })

  it('does not use emojis', () => {
    const { container } = render(
      <PersonalizationPanel onConnect={vi.fn()} onDismiss={vi.fn()} />
    )

    const text = container.textContent || ''
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]/u
    expect(emojiRegex.test(text)).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/PersonalizationPanel.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/PersonalizationPanel.tsx
'use client'

import { FileText, Building2, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PersonalizationPanelProps {
  onConnect: () => void
  onDismiss: () => void
  className?: string
}

const DATA_SOURCES = [
  { icon: FileText, label: 'Invoices', description: 'Track revenue and VAT' },
  { icon: Building2, label: 'Bank accounts', description: 'Verify transactions' },
  { icon: CreditCard, label: 'Expenses', description: 'Calculate deductions' },
]

export function PersonalizationPanel({
  onConnect,
  onDismiss,
  className,
}: PersonalizationPanelProps) {
  return (
    <section
      aria-label="Personalization"
      className={cn('border rounded-lg', className)}
    >
      <header className="p-4 border-b">
        <h3 className="font-medium">Personalize this answer</h3>
      </header>

      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your data to get calculations specific to your business.
        </p>

        {/* Data sources */}
        <ul className="space-y-3">
          {DATA_SOURCES.map(({ icon: Icon, label, description }) => (
            <li key={label} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={onConnect}
            className={cn(
              'w-full text-sm px-4 py-2 rounded-md transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            Connect your data
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full text-sm px-4 py-2 text-muted-foreground hover:text-foreground"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/PersonalizationPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/PersonalizationPanel.tsx src/components/assistant-v2/__tests__/PersonalizationPanel.test.tsx
git commit -m "feat(assistant): add PersonalizationPanel component"
```

---

## Task 45: Add CTA Dismissal Logic

**Files:**

- Create: `src/lib/assistant/hooks/useCTADismissal.ts`
- Test: `src/lib/assistant/hooks/__tests__/useCTADismissal.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/assistant/hooks/__tests__/useCTADismissal.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCTADismissal } from "../useCTADismissal"

describe("useCTADismissal", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns isDismissed=false initially", () => {
    const { result } = renderHook(() => useCTADismissal({ surface: "MARKETING" }))

    expect(result.current.isDismissed).toBe(false)
  })

  it("sets isDismissed=true after dismiss()", () => {
    const { result } = renderHook(() => useCTADismissal({ surface: "MARKETING" }))

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.isDismissed).toBe(true)
  })

  it("persists dismissal to localStorage for MARKETING surface", () => {
    const { result } = renderHook(() => useCTADismissal({ surface: "MARKETING" }))

    act(() => {
      result.current.dismiss()
    })

    const stored = localStorage.getItem("assistant_cta_dismissed_marketing")
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed.expiry).toBeDefined()
  })

  it("respects 7-day cooldown for MARKETING surface", () => {
    const now = Date.now()
    vi.setSystemTime(now)

    const { result, rerender } = renderHook(() => useCTADismissal({ surface: "MARKETING" }))

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.isDismissed).toBe(true)

    // Advance 6 days - should still be dismissed
    vi.setSystemTime(now + 6 * 24 * 60 * 60 * 1000)
    rerender()
    expect(result.current.isDismissed).toBe(true)

    // Advance past 7 days - should no longer be dismissed
    vi.setSystemTime(now + 8 * 24 * 60 * 60 * 1000)
    rerender()
    expect(result.current.isDismissed).toBe(false)
  })

  it("tracks queriesAtDismissal", () => {
    const { result } = renderHook(() => useCTADismissal({ surface: "MARKETING" }))

    act(() => {
      result.current.dismiss(5)
    })

    const stored = JSON.parse(localStorage.getItem("assistant_cta_dismissed_marketing")!)
    expect(stored.queriesAtDismissal).toBe(5)
  })

  it("resets dismissal after 2 more successful queries post-cooldown", () => {
    const { result } = renderHook(() => useCTADismissal({ surface: "MARKETING" }))

    act(() => {
      result.current.dismiss(3)
    })

    // Record 2 more successful queries
    act(() => {
      result.current.recordSuccessfulQuery()
      result.current.recordSuccessfulQuery()
    })

    // After 2 more queries, can show CTA again (after cooldown expires)
    expect(result.current.queriesSinceDismissal).toBe(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useCTADismissal.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/lib/assistant/hooks/useCTADismissal.ts
import { useState, useCallback, useEffect } from "react"
import type { Surface } from "../types"

interface UseCTADismissalProps {
  surface: Surface
}

interface DismissalData {
  expiry: number
  queriesAtDismissal: number
}

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getStorageKey(surface: Surface): string {
  return `assistant_cta_dismissed_${surface.toLowerCase()}`
}

export function useCTADismissal({ surface }: UseCTADismissalProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [queriesSinceDismissal, setQueriesSinceDismissal] = useState(0)

  // Check localStorage on mount
  useEffect(() => {
    const key = getStorageKey(surface)
    const stored = localStorage.getItem(key)

    if (stored) {
      try {
        const data: DismissalData = JSON.parse(stored)
        if (Date.now() < data.expiry) {
          setIsDismissed(true)
        } else {
          // Expired, remove it
          localStorage.removeItem(key)
        }
      } catch {
        localStorage.removeItem(key)
      }
    }
  }, [surface])

  const dismiss = useCallback(
    (queriesAtDismissal = 0) => {
      setIsDismissed(true)
      setQueriesSinceDismissal(0)

      const data: DismissalData = {
        expiry: Date.now() + COOLDOWN_MS,
        queriesAtDismissal,
      }

      localStorage.setItem(getStorageKey(surface), JSON.stringify(data))
    },
    [surface]
  )

  const recordSuccessfulQuery = useCallback(() => {
    if (isDismissed) {
      setQueriesSinceDismissal((prev) => prev + 1)
    }
  }, [isDismissed])

  const reset = useCallback(() => {
    setIsDismissed(false)
    setQueriesSinceDismissal(0)
    localStorage.removeItem(getStorageKey(surface))
  }, [surface])

  return {
    isDismissed,
    queriesSinceDismissal,
    dismiss,
    recordSuccessfulQuery,
    reset,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/assistant/hooks/__tests__/useCTADismissal.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/assistant/hooks/useCTADismissal.ts src/lib/assistant/hooks/__tests__/useCTADismissal.test.ts
git commit -m "feat(assistant): add useCTADismissal hook"
```

---

## Task 46: Update Module Exports

**Files:**

- Modify: `src/lib/assistant/index.ts`
- Modify: `src/components/assistant-v2/index.ts`

**Step 1: Update lib exports**

```typescript
// src/lib/assistant/index.ts

// Types
export * from "./types"

// Analytics
export * from "./analytics"

// Validation
export * from "./validation"

// Citations
export * from "./citations"

// Hooks
export { useAssistantController } from "./hooks/useAssistantController"
export { useFocusManagement } from "./hooks/useFocusManagement"
export { useRovingTabindex } from "./hooks/useRovingTabindex"
export { useReducedMotion } from "./hooks/useReducedMotion"
export { useCTAEligibility } from "./hooks/useCTAEligibility"
export { useCTADismissal } from "./hooks/useCTADismissal"
```

**Step 2: Update component exports**

```typescript
// src/components/assistant-v2/index.ts

// Phase 4: Core UI
export { AssistantContainer } from "./AssistantContainer"
export { AssistantInput } from "./AssistantInput"
export { SuggestionChips } from "./SuggestionChips"
export { HistoryBar } from "./HistoryBar"
export { AnswerSection } from "./AnswerSection"
export { EmptyState } from "./EmptyState"
export { AnswerSkeleton } from "./AnswerSkeleton"
export { Announcer } from "./Announcer"

// Phase 5: Answer Components
export { AnswerCard } from "./AnswerCard"
export { ConfidenceBadge } from "./ConfidenceBadge"
export { ActionButtons } from "./ActionButtons"
export { WhyDrawer } from "./WhyDrawer"
export { RelatedQuestions } from "./RelatedQuestions"
export { RefusalCard } from "./RefusalCard"
export { ConflictBanner } from "./ConflictBanner"
export { ErrorCard } from "./ErrorCard"

// Phase 6: Evidence & Client Data Panels
export { EvidencePanel } from "./EvidencePanel"
export { SourceCard } from "./SourceCard"
export { AuthorityBadge } from "./AuthorityBadge"
export { SupportingSources } from "./SupportingSources"
export { ClientDataPanel } from "./ClientDataPanel"
export { DataPointList } from "./DataPointList"

// Phase 8: Marketing CTA
export { CTABlock } from "./CTABlock"
export { PersonalizationPanel } from "./PersonalizationPanel"
```

**Step 3: Commit**

```bash
git add src/lib/assistant/index.ts src/components/assistant-v2/index.ts
git commit -m "feat(assistant): export Phase 8 CTA components and hooks"
```

---

## Phase 8 Complete

After completing all tasks:

```bash
npx vitest run src/lib/assistant/hooks/__tests__/useCTA
npx vitest run src/components/assistant-v2/__tests__/CTA
npx vitest run src/components/assistant-v2/__tests__/Personalization
```

Expected: All CTA-related tests pass.

**Next:** Phase 9 (Analytics & Quality Gates) - Tasks 47-52
