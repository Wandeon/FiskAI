# FiskAI Assistant Phase 5: Answer Components

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the answer display components including cards, badges, drawers, and error states.

**Architecture:** Composable React components that render AssistantResponse data.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest, @testing-library/react

**Prerequisites:** Phase 4 complete (core UI structure)

---

## Task 23: Create AnswerCard Component

**Files:**

- Create: `src/components/assistant-v2/AnswerCard.tsx`
- Test: `src/components/assistant-v2/__tests__/AnswerCard.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/AnswerCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswerCard } from '../AnswerCard'
import type { AssistantResponse } from '@/lib/assistant'
import { SCHEMA_VERSION } from '@/lib/assistant'

const mockAnswer: AssistantResponse = {
  schemaVersion: SCHEMA_VERSION,
  requestId: 'req_1',
  traceId: 'trace_1',
  kind: 'ANSWER',
  topic: 'REGULATORY',
  surface: 'MARKETING',
  createdAt: '2024-12-24T10:00:00Z',
  headline: 'VAT rate is 25%',
  directAnswer: 'Standard VAT rate in Croatia is 25% for most goods and services.',
  keyDetails: [
    'Standard rate applies to most goods',
    'Reduced rates exist for specific categories',
  ],
  nextStep: 'Register for VAT when you exceed the threshold',
  confidence: { level: 'HIGH', score: 0.95 },
  why: { bullets: ['Source 1 states...', 'Regulation confirms...'] },
  asOfDate: '2024-12-24',
}

describe('AnswerCard', () => {
  it('renders headline', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('VAT rate is 25%')
  })

  it('headline has tabindex=-1 for focus management', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('tabindex', '-1')
  })

  it('renders direct answer', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByText(/Standard VAT rate in Croatia/)).toBeInTheDocument()
  })

  it('renders key details as list', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByText(/Standard rate applies/)).toBeInTheDocument()
    expect(screen.getByText(/Reduced rates exist/)).toBeInTheDocument()
  })

  it('renders next step when provided', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByText(/Register for VAT/)).toBeInTheDocument()
  })

  it('renders confidence badge', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument()
  })

  it('renders as-of date', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByText(/as of/i)).toBeInTheDocument()
  })

  it('renders Why? button when why data exists', () => {
    render(<AnswerCard answer={mockAnswer} />)
    expect(screen.getByRole('button', { name: /why/i })).toBeInTheDocument()
  })

  it('does not render Why? button when no why data', () => {
    const answerWithoutWhy = { ...mockAnswer, why: undefined }
    render(<AnswerCard answer={answerWithoutWhy} />)
    expect(screen.queryByRole('button', { name: /why/i })).not.toBeInTheDocument()
  })

  it('does not render key details when empty', () => {
    const answerWithoutDetails = { ...mockAnswer, keyDetails: undefined }
    render(<AnswerCard answer={answerWithoutDetails} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/AnswerCard.test.tsx`
Expected: FAIL with "Cannot find module '../AnswerCard'"

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/AnswerCard.tsx
'use client'

import { forwardRef } from 'react'
import type { AssistantResponse } from '@/lib/assistant'
import { ConfidenceBadge } from './ConfidenceBadge'
import { cn } from '@/lib/utils'

interface AnswerCardProps {
  answer: AssistantResponse
  onWhyClick?: () => void
  onHowToApplyClick?: () => void
  className?: string
}

export const AnswerCard = forwardRef<HTMLHeadingElement, AnswerCardProps>(
  function AnswerCard({ answer, onWhyClick, onHowToApplyClick, className }, ref) {
    const { headline, directAnswer, keyDetails, nextStep, confidence, why, howToApply, asOfDate } =
      answer

    return (
      <article className={cn('p-6 border rounded-lg', className)}>
        {/* Header with headline and confidence */}
        <div className="flex items-start justify-between gap-4">
          <h2 ref={ref} tabIndex={-1} className="text-lg font-semibold flex-1">
            {headline}
          </h2>
          {confidence && <ConfidenceBadge level={confidence.level} score={confidence.score} />}
        </div>

        {/* Direct answer */}
        <p className="mt-3 text-muted-foreground">{directAnswer}</p>

        {/* Key details */}
        {keyDetails && keyDetails.length > 0 && (
          <ul className="mt-4 space-y-1.5" role="list">
            {keyDetails.map((detail, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Next step */}
        {nextStep && (
          <p className="mt-4 text-sm">
            <span className="font-medium text-primary">Next step:</span> {nextStep}
          </p>
        )}

        {/* As-of date */}
        {asOfDate && (
          <p className="mt-3 text-xs text-muted-foreground">
            As of {new Date(asOfDate).toLocaleDateString()}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {why && (
            <button
              type="button"
              onClick={onWhyClick}
              className="text-sm px-3 py-1.5 border rounded-md hover:bg-muted transition-colors"
            >
              Why?
            </button>
          )}
          {howToApply && (
            <button
              type="button"
              onClick={onHowToApplyClick}
              className="text-sm px-3 py-1.5 border rounded-md hover:bg-muted transition-colors"
            >
              How to apply
            </button>
          )}
        </div>
      </article>
    )
  }
)
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/AnswerCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/AnswerCard.tsx src/components/assistant-v2/__tests__/AnswerCard.test.tsx
git commit -m "feat(assistant): add AnswerCard component"
```

---

## Task 24: Create ConfidenceBadge Component

**Files:**

- Create: `src/components/assistant-v2/ConfidenceBadge.tsx`
- Test: `src/components/assistant-v2/__tests__/ConfidenceBadge.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/ConfidenceBadge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfidenceBadge } from '../ConfidenceBadge'

describe('ConfidenceBadge', () => {
  it('renders HIGH confidence with green styling', () => {
    render(<ConfidenceBadge level="HIGH" />)

    const badge = screen.getByText(/high confidence/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('renders MEDIUM confidence with yellow styling', () => {
    render(<ConfidenceBadge level="MEDIUM" />)

    const badge = screen.getByText(/medium confidence/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('renders LOW confidence with red styling', () => {
    render(<ConfidenceBadge level="LOW" />)

    const badge = screen.getByText(/low confidence/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('shows score percentage when provided', () => {
    render(<ConfidenceBadge level="HIGH" score={0.95} />)

    expect(screen.getByText(/95%/)).toBeInTheDocument()
  })

  it('does not show score when not provided', () => {
    render(<ConfidenceBadge level="HIGH" />)

    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<ConfidenceBadge level="HIGH" score={0.92} />)

    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('High confidence'))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/ConfidenceBadge.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/ConfidenceBadge.tsx
import type { ConfidenceLevel } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  score?: number
  className?: string
}

const STYLES: Record<ConfidenceLevel, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-red-100 text-red-800',
}

const LABELS: Record<ConfidenceLevel, string> = {
  HIGH: 'High confidence',
  MEDIUM: 'Medium confidence',
  LOW: 'Low confidence',
}

export function ConfidenceBadge({ level, score, className }: ConfidenceBadgeProps) {
  const percentage = score !== undefined ? Math.round(score * 100) : null

  const ariaLabel = percentage !== null ? `${LABELS[level]}: ${percentage}%` : LABELS[level]

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
        STYLES[level],
        className
      )}
    >
      {LABELS[level]}
      {percentage !== null && <span className="opacity-75">({percentage}%)</span>}
    </span>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/ConfidenceBadge.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/ConfidenceBadge.tsx src/components/assistant-v2/__tests__/ConfidenceBadge.test.tsx
git commit -m "feat(assistant): add ConfidenceBadge component"
```

---

## Task 25: Create ActionButtons Component

**Files:**

- Create: `src/components/assistant-v2/ActionButtons.tsx`
- Test: `src/components/assistant-v2/__tests__/ActionButtons.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/ActionButtons.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionButtons } from '../ActionButtons'

describe('ActionButtons', () => {
  it('renders Why? button when hasWhy is true', () => {
    render(<ActionButtons hasWhy onWhyClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: /why/i })).toBeInTheDocument()
  })

  it('renders How to apply button when hasHowToApply is true', () => {
    render(<ActionButtons hasHowToApply onHowToApplyClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: /how to apply/i })).toBeInTheDocument()
  })

  it('calls onWhyClick when Why? is clicked', async () => {
    const onWhyClick = vi.fn()
    const user = userEvent.setup()

    render(<ActionButtons hasWhy onWhyClick={onWhyClick} />)

    await user.click(screen.getByRole('button', { name: /why/i }))

    expect(onWhyClick).toHaveBeenCalledTimes(1)
  })

  it('calls onHowToApplyClick when How to apply is clicked', async () => {
    const onHowToApplyClick = vi.fn()
    const user = userEvent.setup()

    render(<ActionButtons hasHowToApply onHowToApplyClick={onHowToApplyClick} />)

    await user.click(screen.getByRole('button', { name: /how to apply/i }))

    expect(onHowToApplyClick).toHaveBeenCalledTimes(1)
  })

  it('renders Save button when onSave is provided', () => {
    render(<ActionButtons onSave={vi.fn()} />)

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('renders Share button when onShare is provided', () => {
    render(<ActionButtons onShare={vi.fn()} />)

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('renders nothing when no actions provided', () => {
    const { container } = render(<ActionButtons />)

    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('shows expanded state for Why? when whyExpanded is true', () => {
    render(<ActionButtons hasWhy whyExpanded onWhyClick={vi.fn()} />)

    const button = screen.getByRole('button', { name: /why/i })
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/ActionButtons.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/ActionButtons.tsx
'use client'

import { Bookmark, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionButtonsProps {
  hasWhy?: boolean
  hasHowToApply?: boolean
  whyExpanded?: boolean
  howToApplyExpanded?: boolean
  onWhyClick?: () => void
  onHowToApplyClick?: () => void
  onSave?: () => void
  onShare?: () => void
  className?: string
}

export function ActionButtons({
  hasWhy,
  hasHowToApply,
  whyExpanded,
  howToApplyExpanded,
  onWhyClick,
  onHowToApplyClick,
  onSave,
  onShare,
  className,
}: ActionButtonsProps) {
  const hasAnyButton = hasWhy || hasHowToApply || onSave || onShare

  if (!hasAnyButton) {
    return <div className={className} />
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {hasWhy && (
        <button
          type="button"
          onClick={onWhyClick}
          aria-expanded={whyExpanded}
          className={cn(
            'text-sm px-3 py-1.5 border rounded-md transition-colors',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
            whyExpanded && 'bg-muted'
          )}
        >
          Why?
        </button>
      )}

      {hasHowToApply && (
        <button
          type="button"
          onClick={onHowToApplyClick}
          aria-expanded={howToApplyExpanded}
          className={cn(
            'text-sm px-3 py-1.5 border rounded-md transition-colors',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
            howToApplyExpanded && 'bg-muted'
          )}
        >
          How to apply
        </button>
      )}

      {onSave && (
        <button
          type="button"
          onClick={onSave}
          aria-label="Save"
          className={cn(
            'p-1.5 border rounded-md transition-colors',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50'
          )}
        >
          <Bookmark className="w-4 h-4" />
        </button>
      )}

      {onShare && (
        <button
          type="button"
          onClick={onShare}
          aria-label="Share"
          className={cn(
            'p-1.5 border rounded-md transition-colors',
            'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50'
          )}
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/ActionButtons.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/ActionButtons.tsx src/components/assistant-v2/__tests__/ActionButtons.test.tsx
git commit -m "feat(assistant): add ActionButtons component"
```

---

## Task 26: Create WhyDrawer Component

**Files:**

- Create: `src/components/assistant-v2/WhyDrawer.tsx`
- Test: `src/components/assistant-v2/__tests__/WhyDrawer.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/WhyDrawer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WhyDrawer } from '../WhyDrawer'

describe('WhyDrawer', () => {
  const bullets = [
    'Article 38 of the VAT Law establishes the standard rate.',
    'This applies to taxable supplies in Croatia.',
    'No exemptions apply to this category.',
  ]

  it('renders nothing when not expanded', () => {
    const { container } = render(
      <WhyDrawer bullets={bullets} isExpanded={false} onClose={vi.fn()} />
    )

    expect(container.querySelector('[role="region"]')).not.toBeInTheDocument()
  })

  it('renders bullets when expanded', () => {
    render(<WhyDrawer bullets={bullets} isExpanded onClose={vi.fn()} />)

    expect(screen.getByText(/Article 38/)).toBeInTheDocument()
    expect(screen.getByText(/taxable supplies/)).toBeInTheDocument()
    expect(screen.getByText(/No exemptions/)).toBeInTheDocument()
  })

  it('has role="region" with accessible label', () => {
    render(<WhyDrawer bullets={bullets} isExpanded onClose={vi.fn()} />)

    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('aria-label', expect.stringContaining('Why'))
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<WhyDrawer bullets={bullets} isExpanded onClose={onClose} />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('renders header with close button', () => {
    render(<WhyDrawer bullets={bullets} isExpanded onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<WhyDrawer bullets={bullets} isExpanded onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('renders bullets as list items', () => {
    render(<WhyDrawer bullets={bullets} isExpanded onClose={vi.fn()} />)

    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(3)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/WhyDrawer.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/WhyDrawer.tsx
'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhyDrawerProps {
  bullets: string[]
  isExpanded: boolean
  onClose: () => void
  className?: string
}

export function WhyDrawer({ bullets, isExpanded, onClose, className }: WhyDrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        onClose()
      }
    },
    [isExpanded, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isExpanded) return null

  return (
    <div
      role="region"
      aria-label="Why this answer"
      className={cn(
        'mt-4 p-4 bg-muted/30 rounded-lg border',
        'motion-safe:animate-in motion-safe:slide-in-from-top-2',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Why this answer</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-0.5 shrink-0">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/WhyDrawer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/WhyDrawer.tsx src/components/assistant-v2/__tests__/WhyDrawer.test.tsx
git commit -m "feat(assistant): add WhyDrawer component"
```

---

## Task 27: Create RelatedQuestions Component

**Files:**

- Create: `src/components/assistant-v2/RelatedQuestions.tsx`
- Test: `src/components/assistant-v2/__tests__/RelatedQuestions.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/RelatedQuestions.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelatedQuestions } from '../RelatedQuestions'

describe('RelatedQuestions', () => {
  const questions = [
    'When do I become VAT-registered?',
    'What are reduced VAT rates?',
    'How do I file VAT returns?',
  ]

  it('renders all questions as chips', () => {
    render(<RelatedQuestions questions={questions} onSelect={vi.fn()} />)

    expect(screen.getByText(/When do I become/)).toBeInTheDocument()
    expect(screen.getByText(/What are reduced/)).toBeInTheDocument()
    expect(screen.getByText(/How do I file/)).toBeInTheDocument()
  })

  it('renders header', () => {
    render(<RelatedQuestions questions={questions} onSelect={vi.fn()} />)

    expect(screen.getByText(/related questions/i)).toBeInTheDocument()
  })

  it('calls onSelect with question text when clicked (fill-only)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<RelatedQuestions questions={questions} onSelect={onSelect} />)

    await user.click(screen.getByText(/When do I become/))

    expect(onSelect).toHaveBeenCalledWith('When do I become VAT-registered?')
  })

  it('renders nothing when questions is empty', () => {
    const { container } = render(<RelatedQuestions questions={[]} onSelect={vi.fn()} />)

    expect(container.firstChild).toBeNull()
  })

  it('truncates long questions', () => {
    const longQuestions = [
      'This is a very long question that exceeds eighty characters and should be truncated with an ellipsis',
    ]

    render(<RelatedQuestions questions={longQuestions} onSelect={vi.fn()} />)

    const chip = screen.getByRole('button')
    expect(chip.textContent?.length).toBeLessThanOrEqual(83) // 80 + "..."
  })

  it('limits to max 4 questions', () => {
    const manyQuestions = [
      'Question 1',
      'Question 2',
      'Question 3',
      'Question 4',
      'Question 5',
      'Question 6',
    ]

    render(<RelatedQuestions questions={manyQuestions} onSelect={vi.fn()} />)

    const chips = screen.getAllByRole('button')
    expect(chips).toHaveLength(4)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/RelatedQuestions.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/RelatedQuestions.tsx
'use client'

import { LIMITS } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface RelatedQuestionsProps {
  questions: string[]
  onSelect: (question: string) => void
  className?: string
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function RelatedQuestions({ questions, onSelect, className }: RelatedQuestionsProps) {
  if (questions.length === 0) return null

  // Limit to max configured count
  const displayQuestions = questions.slice(0, LIMITS.relatedQuestionsMax)

  return (
    <div className={cn('mt-6', className)}>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Related questions</h4>

      <div className="flex flex-wrap gap-2">
        {displayQuestions.map((question, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(question)}
            className={cn(
              'text-sm px-3 py-1.5 rounded-full border',
              'hover:bg-muted transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
          >
            {truncate(question, LIMITS.relatedQuestionLength)}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/RelatedQuestions.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/RelatedQuestions.tsx src/components/assistant-v2/__tests__/RelatedQuestions.test.tsx
git commit -m "feat(assistant): add RelatedQuestions component"
```

---

## Task 28: Create RefusalCard Component

**Files:**

- Create: `src/components/assistant-v2/RefusalCard.tsx`
- Test: `src/components/assistant-v2/__tests__/RefusalCard.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/RefusalCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RefusalCard } from '../RefusalCard'
import type { RefusalReason, RefusalBlock } from '@/lib/assistant'

describe('RefusalCard', () => {
  it('renders NO_CITABLE_RULES refusal', () => {
    render(
      <RefusalCard
        reason="NO_CITABLE_RULES"
        refusal={{ message: 'We do not have verified rules for this topic.' }}
      />
    )

    expect(screen.getByText(/no verified rules/i)).toBeInTheDocument()
    expect(screen.getByText(/do not have verified rules/)).toBeInTheDocument()
  })

  it('renders OUT_OF_SCOPE refusal with redirect options', () => {
    const refusal: RefusalBlock = {
      message: 'This is outside our regulatory coverage.',
      redirectOptions: [
        { label: 'Contact support', href: '/support', type: 'SUPPORT' },
        { label: 'View documentation', href: '/docs', type: 'DOCS' },
      ],
    }

    render(<RefusalCard reason="OUT_OF_SCOPE" refusal={refusal} />)

    expect(screen.getByText(/outside our/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact support/i })).toHaveAttribute('href', '/support')
    expect(screen.getByRole('link', { name: /view documentation/i })).toHaveAttribute('href', '/docs')
  })

  it('renders MISSING_CLIENT_DATA refusal with connect CTA', () => {
    const refusal: RefusalBlock = {
      message: 'We need more data to answer this question.',
      missingData: [
        { label: 'Revenue data', impact: 'Required for threshold calculation' },
      ],
    }

    render(
      <RefusalCard
        reason="MISSING_CLIENT_DATA"
        refusal={refusal}
        onConnectData={vi.fn()}
      />
    )

    expect(screen.getByText(/need more data/)).toBeInTheDocument()
    expect(screen.getByText(/revenue data/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('renders UNRESOLVED_CONFLICT refusal', () => {
    render(
      <RefusalCard
        reason="UNRESOLVED_CONFLICT"
        refusal={{ message: 'There are conflicting rules on this topic.' }}
      />
    )

    expect(screen.getByText(/conflicting rules/)).toBeInTheDocument()
  })

  it('calls onConnectData when connect button clicked', async () => {
    const onConnectData = vi.fn()
    const user = userEvent.setup()

    render(
      <RefusalCard
        reason="MISSING_CLIENT_DATA"
        refusal={{ message: 'Need data' }}
        onConnectData={onConnectData}
      />
    )

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(onConnectData).toHaveBeenCalled()
  })

  it('renders related topics when provided', () => {
    const refusal: RefusalBlock = {
      message: 'Cannot answer this.',
      relatedTopics: ['VAT registration', 'Tax deadlines'],
    }

    render(<RefusalCard reason="OUT_OF_SCOPE" refusal={refusal} onTopicClick={vi.fn()} />)

    expect(screen.getByText(/VAT registration/)).toBeInTheDocument()
    expect(screen.getByText(/Tax deadlines/)).toBeInTheDocument()
  })

  it('has appropriate icon for each refusal type', () => {
    const { rerender } = render(
      <RefusalCard reason="NO_CITABLE_RULES" refusal={{ message: 'Test' }} />
    )
    expect(screen.getByTestId('refusal-icon')).toBeInTheDocument()

    rerender(<RefusalCard reason="OUT_OF_SCOPE" refusal={{ message: 'Test' }} />)
    expect(screen.getByTestId('refusal-icon')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/RefusalCard.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/RefusalCard.tsx
'use client'

import { AlertCircle, HelpCircle, Database, AlertTriangle } from 'lucide-react'
import type { RefusalReason, RefusalBlock } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface RefusalCardProps {
  reason: RefusalReason
  refusal: RefusalBlock
  onConnectData?: () => void
  onTopicClick?: (topic: string) => void
  className?: string
}

const TITLES: Record<RefusalReason, string> = {
  NO_CITABLE_RULES: 'No verified rules available',
  OUT_OF_SCOPE: 'Outside our coverage',
  MISSING_CLIENT_DATA: 'More data needed',
  UNRESOLVED_CONFLICT: 'Conflicting information',
}

const ICONS: Record<RefusalReason, React.ReactNode> = {
  NO_CITABLE_RULES: <HelpCircle className="w-5 h-5" />,
  OUT_OF_SCOPE: <AlertCircle className="w-5 h-5" />,
  MISSING_CLIENT_DATA: <Database className="w-5 h-5" />,
  UNRESOLVED_CONFLICT: <AlertTriangle className="w-5 h-5" />,
}

export function RefusalCard({
  reason,
  refusal,
  onConnectData,
  onTopicClick,
  className,
}: RefusalCardProps) {
  return (
    <article className={cn('p-6 border rounded-lg bg-muted/20', className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span data-testid="refusal-icon" className="text-muted-foreground mt-0.5">
          {ICONS[reason]}
        </span>
        <div className="flex-1">
          <h2 className="font-medium">{TITLES[reason]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{refusal.message}</p>
        </div>
      </div>

      {/* Missing data list (MISSING_CLIENT_DATA) */}
      {refusal.missingData && refusal.missingData.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">Missing data</h3>
          <ul className="space-y-1">
            {refusal.missingData.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>{item.label}</strong>
                  {item.impact && <span className="text-muted-foreground"> — {item.impact}</span>}
                </span>
              </li>
            ))}
          </ul>
          {onConnectData && (
            <button
              type="button"
              onClick={onConnectData}
              className="mt-2 text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Connect your data
            </button>
          )}
        </div>
      )}

      {/* Redirect options (OUT_OF_SCOPE) */}
      {refusal.redirectOptions && refusal.redirectOptions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {refusal.redirectOptions.map((option, i) => (
            <a
              key={i}
              href={option.href}
              className="text-sm px-3 py-1.5 border rounded-md hover:bg-muted transition-colors"
            >
              {option.label}
            </a>
          ))}
        </div>
      )}

      {/* Related topics */}
      {refusal.relatedTopics && refusal.relatedTopics.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Try these instead
          </h3>
          <div className="flex flex-wrap gap-2">
            {refusal.relatedTopics.map((topic, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onTopicClick?.(topic)}
                className="text-sm px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/RefusalCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/RefusalCard.tsx src/components/assistant-v2/__tests__/RefusalCard.test.tsx
git commit -m "feat(assistant): add RefusalCard component"
```

---

## Task 29: Create ConflictBanner Component

**Files:**

- Create: `src/components/assistant-v2/ConflictBanner.tsx`
- Test: `src/components/assistant-v2/__tests__/ConflictBanner.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/ConflictBanner.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConflictBanner } from '../ConflictBanner'
import type { ConflictBlock } from '@/lib/assistant'

describe('ConflictBanner', () => {
  const resolvedConflict: ConflictBlock = {
    status: 'RESOLVED',
    description: 'Previously conflicting guidance has been resolved.',
    resolvedAt: '2024-12-20',
    sources: [],
    winningSourceId: 'src_1',
  }

  const unresolvedConflict: ConflictBlock = {
    status: 'UNRESOLVED',
    description: 'Multiple sources provide different guidance.',
    sources: [],
  }

  const contextDependentConflict: ConflictBlock = {
    status: 'CONTEXT_DEPENDENT',
    description: 'The answer depends on your specific situation.',
    sources: [],
  }

  it('renders resolved conflict with subtle styling', () => {
    render(<ConflictBanner conflict={resolvedConflict} />)

    expect(screen.getByText(/previously conflicting/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('bg-muted/50')
  })

  it('renders unresolved conflict with warning styling', () => {
    render(<ConflictBanner conflict={unresolvedConflict} />)

    expect(screen.getByText(/multiple sources/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders context-dependent conflict with info styling', () => {
    render(<ConflictBanner conflict={contextDependentConflict} />)

    expect(screen.getByText(/depends on your specific/i)).toBeInTheDocument()
  })

  it('shows resolved date when provided', () => {
    render(<ConflictBanner conflict={resolvedConflict} />)

    expect(screen.getByText(/resolved/i)).toBeInTheDocument()
  })

  it('renders nothing when conflict is null', () => {
    const { container } = render(<ConflictBanner conflict={null} />)

    expect(container.firstChild).toBeNull()
  })

  it('uses role="status" for resolved conflicts', () => {
    render(<ConflictBanner conflict={resolvedConflict} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('uses role="alert" for unresolved conflicts', () => {
    render(<ConflictBanner conflict={unresolvedConflict} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/ConflictBanner.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/ConflictBanner.tsx
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { ConflictBlock } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface ConflictBannerProps {
  conflict: ConflictBlock | null | undefined
  className?: string
}

export function ConflictBanner({ conflict, className }: ConflictBannerProps) {
  if (!conflict) return null

  const isResolved = conflict.status === 'RESOLVED'
  const isUnresolved = conflict.status === 'UNRESOLVED'
  const isContextDependent = conflict.status === 'CONTEXT_DEPENDENT'

  const Icon = isResolved ? CheckCircle : isUnresolved ? AlertTriangle : Info

  const styles = cn(
    'p-3 rounded-lg flex items-start gap-3 text-sm',
    isResolved && 'bg-muted/50 text-muted-foreground',
    isUnresolved && 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    isContextDependent && 'bg-blue-50 text-blue-800 border border-blue-200',
    className
  )

  return (
    <div
      role={isUnresolved ? 'alert' : 'status'}
      className={styles}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p>{conflict.description}</p>
        {isResolved && conflict.resolvedAt && (
          <p className="text-xs mt-1 opacity-75">
            Resolved on {new Date(conflict.resolvedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/ConflictBanner.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/ConflictBanner.tsx src/components/assistant-v2/__tests__/ConflictBanner.test.tsx
git commit -m "feat(assistant): add ConflictBanner component"
```

---

## Task 30: Create ErrorCard Component

**Files:**

- Create: `src/components/assistant-v2/ErrorCard.tsx`
- Test: `src/components/assistant-v2/__tests__/ErrorCard.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/ErrorCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorCard } from '../ErrorCard'
import type { AssistantError } from '@/lib/assistant'

describe('ErrorCard', () => {
  const networkError: AssistantError = {
    type: 'NETWORK_FAILURE',
    message: 'Unable to connect to the server.',
  }

  const serverError: AssistantError = {
    type: 'SERVER_ERROR',
    message: 'Something went wrong on our end.',
    httpStatus: 500,
  }

  const rateLimitError: AssistantError = {
    type: 'RATE_LIMITED',
    message: 'Too many requests. Please wait.',
    httpStatus: 429,
  }

  it('renders error message', () => {
    render(<ErrorCard error={networkError} onRetry={vi.fn()} />)

    expect(screen.getByText(/unable to connect/i)).toBeInTheDocument()
  })

  it('renders retry button for retryable errors', () => {
    render(<ErrorCard error={networkError} onRetry={vi.fn()} />)

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls onRetry when retry button clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()

    render(<ErrorCard error={networkError} onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(onRetry).toHaveBeenCalled()
  })

  it('does not render retry button for client errors', () => {
    const clientError: AssistantError = {
      type: 'CLIENT_ERROR',
      message: 'Invalid request.',
      httpStatus: 400,
    }

    render(<ErrorCard error={clientError} onRetry={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('shows rate limit message with countdown when rate limited', () => {
    render(<ErrorCard error={rateLimitError} onRetry={vi.fn()} />)

    expect(screen.getByText(/too many requests/i)).toBeInTheDocument()
  })

  it('has role="alert" for accessibility', () => {
    render(<ErrorCard error={networkError} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows error icon', () => {
    render(<ErrorCard error={networkError} onRetry={vi.fn()} />)

    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })

  it('disables retry button when retrying', () => {
    render(<ErrorCard error={networkError} onRetry={vi.fn()} isRetrying />)

    expect(screen.getByRole('button', { name: /trying/i })).toBeDisabled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/ErrorCard.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/ErrorCard.tsx
'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import type { AssistantError, ErrorType } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface ErrorCardProps {
  error: AssistantError
  onRetry: () => void
  isRetrying?: boolean
  className?: string
}

const RETRYABLE_ERRORS: ErrorType[] = [
  'NETWORK_TIMEOUT',
  'NETWORK_FAILURE',
  'SERVER_ERROR',
]

export function ErrorCard({ error, onRetry, isRetrying = false, className }: ErrorCardProps) {
  const isRetryable = RETRYABLE_ERRORS.includes(error.type) && error.type !== 'RATE_LIMITED'
  const isRateLimited = error.type === 'RATE_LIMITED'

  return (
    <article
      role="alert"
      className={cn(
        'p-6 border border-destructive/50 rounded-lg bg-destructive/5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          data-testid="error-icon"
          className="w-5 h-5 text-destructive mt-0.5 shrink-0"
        />
        <div className="flex-1">
          <h2 className="font-medium text-destructive">
            {isRateLimited ? 'Rate limit exceeded' : 'Something went wrong'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>

          {isRetryable && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className={cn(
                'mt-3 inline-flex items-center gap-2 text-sm px-3 py-1.5',
                'border rounded-md transition-colors',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Trying...' : 'Try again'}
            </button>
          )}

          {isRateLimited && (
            <p className="mt-2 text-xs text-muted-foreground">
              Please wait a moment before trying again.
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/ErrorCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/ErrorCard.tsx src/components/assistant-v2/__tests__/ErrorCard.test.tsx
git commit -m "feat(assistant): add ErrorCard component"
```

---

## Task 30b: Update Module Index

**Files:**

- Modify: `src/components/assistant-v2/index.ts`

**Step 1: Update exports**

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
```

**Step 2: Commit**

```bash
git add src/components/assistant-v2/index.ts
git commit -m "feat(assistant): update Phase 5 component exports"
```

---

## Phase 5 Complete

After completing all tasks:

```bash
npx vitest run src/components/assistant-v2/
```

Expected: All 16 test files pass (8 from Phase 4 + 8 from Phase 5).

**Next:** Phase 6 (Evidence & Client Data Panels) - Tasks 31-36
