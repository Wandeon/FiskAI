# FiskAI Assistant Phase 6: Evidence & Client Data Panels

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the evidence (sources) panel and client data panel components.

**Architecture:** Composable React components for displaying citations and client context data.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest, @testing-library/react

**Prerequisites:** Phase 5 complete (answer components)

---

## Task 31: Create EvidencePanel Component

**Files:**

- Create: `src/components/assistant-v2/EvidencePanel.tsx`
- Test: `src/components/assistant-v2/__tests__/EvidencePanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/EvidencePanel.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvidencePanel } from '../EvidencePanel'
import type { CitationBlock, SourceCard } from '@/lib/assistant'

const primarySource: SourceCard = {
  id: 'src_1',
  title: 'Zakon o porezu na dodanu vrijednost',
  authority: 'LAW',
  reference: 'čl. 38, st. 1',
  quote: 'Standardna stopa poreza na dodanu vrijednost iznosi 25 posto.',
  url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2024_01_1_1.html',
  effectiveFrom: '2024-01-01',
  confidence: 0.98,
  status: 'ACTIVE',
}

const supportingSource: SourceCard = {
  id: 'src_2',
  title: 'Pravilnik o PDV-u',
  authority: 'REGULATION',
  reference: 'čl. 47',
  url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2024_01_2_2.html',
  effectiveFrom: '2024-01-01',
  confidence: 0.92,
  status: 'ACTIVE',
}

const mockCitations: CitationBlock = {
  primary: primarySource,
  supporting: [supportingSource],
}

describe('EvidencePanel', () => {
  it('renders header "Sources"', () => {
    render(<EvidencePanel citations={mockCitations} status="COMPLETE" />)

    expect(screen.getByRole('heading', { name: /sources/i })).toBeInTheDocument()
  })

  it('renders primary source card expanded', () => {
    render(<EvidencePanel citations={mockCitations} status="COMPLETE" />)

    expect(screen.getByText(/Zakon o porezu/)).toBeInTheDocument()
    expect(screen.getByText(/čl\. 38/)).toBeInTheDocument()
  })

  it('renders quote excerpt from primary source', () => {
    render(<EvidencePanel citations={mockCitations} status="COMPLETE" />)

    expect(screen.getByText(/Standardna stopa/)).toBeInTheDocument()
  })

  it('renders supporting sources collapsed', () => {
    render(<EvidencePanel citations={mockCitations} status="COMPLETE" />)

    expect(screen.getByText(/supporting sources \(1\)/i)).toBeInTheDocument()
  })

  it('expands supporting sources when clicked', async () => {
    const user = userEvent.setup()

    render(<EvidencePanel citations={mockCitations} status="COMPLETE" />)

    await user.click(screen.getByText(/supporting sources/i))

    expect(screen.getByText(/Pravilnik o PDV/)).toBeInTheDocument()
  })

  it('renders placeholder when no citations', () => {
    render(<EvidencePanel citations={undefined} status="IDLE" />)

    expect(screen.getByText(/sources will appear here/i)).toBeInTheDocument()
  })

  it('renders skeleton when LOADING', () => {
    render(<EvidencePanel citations={undefined} status="LOADING" />)

    expect(screen.getByTestId('evidence-skeleton')).toBeInTheDocument()
  })

  it('renders "View source" link with correct href', () => {
    render(<EvidencePanel citations={mockCitations} status="COMPLETE" />)

    const link = screen.getByRole('link', { name: /view source/i })
    expect(link).toHaveAttribute('href', primarySource.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('has id="assistant-sources" for skip link target', () => {
    render(<EvidencePanel citations={mockCitations} status="COMPLETE" />)

    expect(document.getElementById('assistant-sources')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/EvidencePanel.test.tsx`
Expected: FAIL with "Cannot find module '../EvidencePanel'"

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/EvidencePanel.tsx
'use client'

import { useState } from 'react'
import type { CitationBlock, ControllerStatus } from '@/lib/assistant'
import { SourceCard } from './SourceCard'
import { SupportingSources } from './SupportingSources'
import { cn } from '@/lib/utils'

interface EvidencePanelProps {
  citations: CitationBlock | undefined
  status: ControllerStatus
  className?: string
}

export function EvidencePanel({ citations, status, className }: EvidencePanelProps) {
  const [supportingExpanded, setSupportingExpanded] = useState(false)

  const isLoading = status === 'LOADING'
  const isEmpty = !citations && status !== 'LOADING'

  return (
    <section
      id="assistant-sources"
      aria-label="Sources"
      className={cn('border rounded-lg', className)}
    >
      <header className="p-4 border-b">
        <h3 className="font-medium">Sources</h3>
      </header>

      <div className="p-4">
        {/* Loading skeleton */}
        {isLoading && (
          <div data-testid="evidence-skeleton" className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-16 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <p className="text-sm text-muted-foreground">
            Sources will appear here
          </p>
        )}

        {/* Citations content */}
        {citations && (
          <div className="space-y-4">
            {/* Primary source - expanded */}
            <SourceCard source={citations.primary} variant="expanded" />

            {/* Supporting sources - collapsed */}
            {citations.supporting.length > 0 && (
              <SupportingSources
                sources={citations.supporting}
                isExpanded={supportingExpanded}
                onToggle={() => setSupportingExpanded(!supportingExpanded)}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/EvidencePanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/EvidencePanel.tsx src/components/assistant-v2/__tests__/EvidencePanel.test.tsx
git commit -m "feat(assistant): add EvidencePanel component"
```

---

## Task 32: Create SourceCard Component

**Files:**

- Create: `src/components/assistant-v2/SourceCard.tsx`
- Test: `src/components/assistant-v2/__tests__/SourceCard.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/SourceCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SourceCard } from '../SourceCard'
import type { SourceCard as SourceCardType } from '@/lib/assistant'

const mockSource: SourceCardType = {
  id: 'src_1',
  title: 'Zakon o porezu na dodanu vrijednost',
  authority: 'LAW',
  reference: 'čl. 38, st. 1',
  quote: 'Standardna stopa poreza na dodanu vrijednost iznosi 25 posto.',
  pageNumber: 12,
  url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2024_01_1_1.html',
  effectiveFrom: '2024-01-01',
  confidence: 0.98,
  status: 'ACTIVE',
}

describe('SourceCard', () => {
  describe('expanded variant', () => {
    it('renders title', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/Zakon o porezu/)).toBeInTheDocument()
    })

    it('renders authority badge', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/law/i)).toBeInTheDocument()
    })

    it('renders reference', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/čl\. 38/)).toBeInTheDocument()
    })

    it('renders quote excerpt', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/Standardna stopa/)).toBeInTheDocument()
    })

    it('renders effective date', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/2024/)).toBeInTheDocument()
    })

    it('renders confidence score', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      expect(screen.getByText(/98%/)).toBeInTheDocument()
    })

    it('renders "View source" link with page number', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      const link = screen.getByRole('link', { name: /view source/i })
      expect(link).toBeInTheDocument()
      expect(screen.getByText(/page 12/i)).toBeInTheDocument()
    })

    it('opens link in new tab', () => {
      render(<SourceCard source={mockSource} variant="expanded" />)

      const link = screen.getByRole('link', { name: /view source/i })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('shows SUPERSEDED badge when status is SUPERSEDED', () => {
      const supersededSource = { ...mockSource, status: 'SUPERSEDED' as const }
      render(<SourceCard source={supersededSource} variant="expanded" />)

      expect(screen.getByText(/superseded/i)).toBeInTheDocument()
    })
  })

  describe('compact variant', () => {
    it('renders title only', () => {
      render(<SourceCard source={mockSource} variant="compact" />)

      expect(screen.getByText(/Zakon o porezu/)).toBeInTheDocument()
      expect(screen.queryByText(/Standardna stopa/)).not.toBeInTheDocument()
    })

    it('renders authority badge', () => {
      render(<SourceCard source={mockSource} variant="compact" />)

      expect(screen.getByText(/law/i)).toBeInTheDocument()
    })

    it('does not render quote in compact mode', () => {
      render(<SourceCard source={mockSource} variant="compact" />)

      expect(screen.queryByText(/Standardna stopa/)).not.toBeInTheDocument()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/SourceCard.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/SourceCard.tsx
import { ExternalLink } from 'lucide-react'
import type { SourceCard as SourceCardType } from '@/lib/assistant'
import { AuthorityBadge } from './AuthorityBadge'
import { cn } from '@/lib/utils'

interface SourceCardProps {
  source: SourceCardType
  variant: 'expanded' | 'compact'
  className?: string
}

export function SourceCard({ source, variant, className }: SourceCardProps) {
  const {
    title,
    authority,
    reference,
    quote,
    pageNumber,
    url,
    effectiveFrom,
    confidence,
    status,
  } = source

  const isExpanded = variant === 'expanded'
  const isSuperseded = status === 'SUPERSEDED'

  return (
    <article
      className={cn(
        'rounded-lg border',
        isSuperseded && 'opacity-60',
        isExpanded ? 'p-4' : 'p-3',
        className
      )}
    >
      {/* Header: Authority badge + Title */}
      <div className="flex items-start gap-2">
        <AuthorityBadge authority={authority} />
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium', isExpanded ? 'text-base' : 'text-sm')}>
            {title}
          </h4>
          {reference && (
            <p className="text-sm text-muted-foreground">{reference}</p>
          )}
        </div>
        {isSuperseded && (
          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
            Superseded
          </span>
        )}
      </div>

      {/* Quote excerpt (expanded only) */}
      {isExpanded && quote && (
        <blockquote className="mt-3 pl-3 border-l-2 border-muted text-sm text-muted-foreground italic">
          "{quote}"
        </blockquote>
      )}

      {/* Footer: Date, Confidence, Link */}
      {isExpanded && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Effective: {new Date(effectiveFrom).toLocaleDateString()}</span>
            <span>Confidence: {Math.round(confidence * 100)}%</span>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            View source
            <ExternalLink className="w-3 h-3" />
            {pageNumber && <span className="text-muted-foreground">(page {pageNumber})</span>}
          </a>
        </div>
      )}

      {/* Compact: just show link */}
      {!isExpanded && (
        <div className="mt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            View source
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </article>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/SourceCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/SourceCard.tsx src/components/assistant-v2/__tests__/SourceCard.test.tsx
git commit -m "feat(assistant): add SourceCard component"
```

---

## Task 33: Create AuthorityBadge Component

**Files:**

- Create: `src/components/assistant-v2/AuthorityBadge.tsx`
- Test: `src/components/assistant-v2/__tests__/AuthorityBadge.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/AuthorityBadge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthorityBadge } from '../AuthorityBadge'
import type { AuthorityLevel } from '@/lib/assistant'

describe('AuthorityBadge', () => {
  it('renders LAW badge with correct styling', () => {
    render(<AuthorityBadge authority="LAW" />)

    const badge = screen.getByText(/law/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-800')
  })

  it('renders REGULATION badge with correct styling', () => {
    render(<AuthorityBadge authority="REGULATION" />)

    const badge = screen.getByText(/regulation/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('renders GUIDANCE badge with correct styling', () => {
    render(<AuthorityBadge authority="GUIDANCE" />)

    const badge = screen.getByText(/guidance/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('renders PRACTICE badge with correct styling', () => {
    render(<AuthorityBadge authority="PRACTICE" />)

    const badge = screen.getByText(/practice/i)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
  })

  it('has accessible role', () => {
    render(<AuthorityBadge authority="LAW" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-label describing the authority level', () => {
    render(<AuthorityBadge authority="LAW" />)

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Law')
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/AuthorityBadge.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/AuthorityBadge.tsx
import type { AuthorityLevel } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface AuthorityBadgeProps {
  authority: AuthorityLevel
  className?: string
}

const STYLES: Record<AuthorityLevel, string> = {
  LAW: 'bg-purple-100 text-purple-800',
  REGULATION: 'bg-blue-100 text-blue-800',
  GUIDANCE: 'bg-green-100 text-green-800',
  PRACTICE: 'bg-gray-100 text-gray-800',
}

const LABELS: Record<AuthorityLevel, string> = {
  LAW: 'Law',
  REGULATION: 'Regulation',
  GUIDANCE: 'Guidance',
  PRACTICE: 'Practice',
}

export function AuthorityBadge({ authority, className }: AuthorityBadgeProps) {
  return (
    <span
      role="status"
      aria-label={`Authority level: ${LABELS[authority]}`}
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded shrink-0',
        STYLES[authority],
        className
      )}
    >
      {LABELS[authority]}
    </span>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/AuthorityBadge.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/AuthorityBadge.tsx src/components/assistant-v2/__tests__/AuthorityBadge.test.tsx
git commit -m "feat(assistant): add AuthorityBadge component"
```

---

## Task 34: Create SupportingSources Component

**Files:**

- Create: `src/components/assistant-v2/SupportingSources.tsx`
- Test: `src/components/assistant-v2/__tests__/SupportingSources.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/SupportingSources.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportingSources } from '../SupportingSources'
import type { SourceCard } from '@/lib/assistant'

const mockSources: SourceCard[] = [
  {
    id: 'src_2',
    title: 'Pravilnik o PDV-u',
    authority: 'REGULATION',
    reference: 'čl. 47',
    url: 'https://example.com/pravilnik',
    effectiveFrom: '2024-01-01',
    confidence: 0.92,
  },
  {
    id: 'src_3',
    title: 'Mišljenje Porezne uprave',
    authority: 'GUIDANCE',
    url: 'https://example.com/misljenje',
    effectiveFrom: '2024-06-01',
    confidence: 0.85,
  },
]

describe('SupportingSources', () => {
  it('renders collapsed toggle with count', () => {
    render(
      <SupportingSources
        sources={mockSources}
        isExpanded={false}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByText(/supporting sources \(2\)/i)).toBeInTheDocument()
  })

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()

    render(
      <SupportingSources
        sources={mockSources}
        isExpanded={false}
        onToggle={onToggle}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(onToggle).toHaveBeenCalled()
  })

  it('renders source list when expanded', () => {
    render(
      <SupportingSources
        sources={mockSources}
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByText(/Pravilnik o PDV/)).toBeInTheDocument()
    expect(screen.getByText(/Mišljenje Porezne/)).toBeInTheDocument()
  })

  it('hides source list when collapsed', () => {
    render(
      <SupportingSources
        sources={mockSources}
        isExpanded={false}
        onToggle={vi.fn()}
      />
    )

    expect(screen.queryByText(/Pravilnik o PDV/)).not.toBeInTheDocument()
  })

  it('has aria-expanded attribute', () => {
    render(
      <SupportingSources
        sources={mockSources}
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders sources in compact variant', () => {
    render(
      <SupportingSources
        sources={mockSources}
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    // Should not show quotes in compact mode
    expect(screen.queryByText(/"/)).not.toBeInTheDocument()
  })

  it('shows chevron icon that rotates when expanded', () => {
    const { rerender } = render(
      <SupportingSources
        sources={mockSources}
        isExpanded={false}
        onToggle={vi.fn()}
      />
    )

    const icon = screen.getByTestId('chevron-icon')
    expect(icon).not.toHaveClass('rotate-180')

    rerender(
      <SupportingSources
        sources={mockSources}
        isExpanded={true}
        onToggle={vi.fn()}
      />
    )

    expect(icon).toHaveClass('rotate-180')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/SupportingSources.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/SupportingSources.tsx
'use client'

import { ChevronDown } from 'lucide-react'
import type { SourceCard as SourceCardType } from '@/lib/assistant'
import { SourceCard } from './SourceCard'
import { cn } from '@/lib/utils'

interface SupportingSourcesProps {
  sources: SourceCardType[]
  isExpanded: boolean
  onToggle: () => void
  className?: string
}

export function SupportingSources({
  sources,
  isExpanded,
  onToggle,
  className,
}: SupportingSourcesProps) {
  if (sources.length === 0) return null

  return (
    <div className={cn('border-t pt-4', className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={cn(
          'w-full flex items-center justify-between',
          'text-sm text-muted-foreground hover:text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 rounded'
        )}
      >
        <span>Supporting sources ({sources.length})</span>
        <ChevronDown
          data-testid="chevron-icon"
          className={cn(
            'w-4 h-4 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} variant="compact" />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/SupportingSources.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/SupportingSources.tsx src/components/assistant-v2/__tests__/SupportingSources.test.tsx
git commit -m "feat(assistant): add SupportingSources component"
```

---

## Task 35: Create ClientDataPanel Component

**Files:**

- Create: `src/components/assistant-v2/ClientDataPanel.tsx`
- Test: `src/components/assistant-v2/__tests__/ClientDataPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/ClientDataPanel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientDataPanel } from '../ClientDataPanel'
import type { ClientContextBlock, ControllerStatus } from '@/lib/assistant'

const mockClientContext: ClientContextBlock = {
  used: [
    { label: 'Revenue YTD', value: '€31,760', source: 'Invoices', asOfDate: '2024-12-23' },
    { label: 'VAT Threshold', value: '€40,000', source: 'Regulatory rule', asOfDate: '2024-01-01' },
  ],
  completeness: {
    status: 'COMPLETE',
    score: 0.92,
    notes: '2 invoices from November pending import',
  },
  assumptions: ['Using invoice issue date for revenue recognition'],
  missing: [],
  computedResult: {
    label: 'Remaining until threshold',
    value: '€8,240',
    explanation: '€40,000 - €31,760 = €8,240',
  },
}

const partialContext: ClientContextBlock = {
  used: [{ label: 'Revenue YTD', value: '€31,760', source: 'Invoices' }],
  completeness: {
    status: 'PARTIAL',
    score: 0.5,
    notes: 'Missing bank connection',
  },
  assumptions: [],
  missing: [
    { label: 'Bank transactions', impact: 'Cannot verify revenue accuracy' },
  ],
}

describe('ClientDataPanel', () => {
  it('renders header "Your data"', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByRole('heading', { name: /your data/i })).toBeInTheDocument()
  })

  it('renders data points used', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/Revenue YTD/)).toBeInTheDocument()
    expect(screen.getByText(/€31,760/)).toBeInTheDocument()
    expect(screen.getByText(/Invoices/)).toBeInTheDocument()
  })

  it('renders computed result when present', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/Remaining until threshold/)).toBeInTheDocument()
    expect(screen.getByText(/€8,240/)).toBeInTheDocument()
  })

  it('renders completeness score', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/92%/)).toBeInTheDocument()
  })

  it('renders completeness notes', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/2 invoices from November/)).toBeInTheDocument()
  })

  it('renders assumptions', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(screen.getByText(/invoice issue date/)).toBeInTheDocument()
  })

  it('renders missing data with connect CTA', () => {
    render(
      <ClientDataPanel
        clientContext={partialContext}
        status="COMPLETE"
        onConnectData={vi.fn()}
      />
    )

    expect(screen.getByText(/Bank transactions/)).toBeInTheDocument()
    expect(screen.getByText(/Cannot verify revenue/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('calls onConnectData when connect button clicked', async () => {
    const onConnectData = vi.fn()
    const user = userEvent.setup()

    render(
      <ClientDataPanel
        clientContext={partialContext}
        status="COMPLETE"
        onConnectData={onConnectData}
      />
    )

    await user.click(screen.getByRole('button', { name: /connect/i }))

    expect(onConnectData).toHaveBeenCalled()
  })

  it('renders placeholder when no client context', () => {
    render(<ClientDataPanel clientContext={undefined} status="IDLE" />)

    expect(screen.getByText(/your data will appear here/i)).toBeInTheDocument()
  })

  it('renders skeleton when LOADING', () => {
    render(<ClientDataPanel clientContext={undefined} status="LOADING" />)

    expect(screen.getByTestId('client-data-skeleton')).toBeInTheDocument()
  })

  it('shows "Still syncing..." for PARTIAL_COMPLETE status', () => {
    render(<ClientDataPanel clientContext={partialContext} status="PARTIAL_COMPLETE" />)

    expect(screen.getByText(/still syncing/i)).toBeInTheDocument()
  })

  it('has id for skip link target', () => {
    render(<ClientDataPanel clientContext={mockClientContext} status="COMPLETE" />)

    expect(document.getElementById('assistant-client-data')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/ClientDataPanel.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/ClientDataPanel.tsx
'use client'

import { Loader2, AlertCircle } from 'lucide-react'
import type { ClientContextBlock, ControllerStatus } from '@/lib/assistant'
import { DataPointList } from './DataPointList'
import { cn } from '@/lib/utils'

interface ClientDataPanelProps {
  clientContext: ClientContextBlock | undefined
  status: ControllerStatus
  onConnectData?: () => void
  className?: string
}

export function ClientDataPanel({
  clientContext,
  status,
  onConnectData,
  className,
}: ClientDataPanelProps) {
  const isLoading = status === 'LOADING'
  const isPartialComplete = status === 'PARTIAL_COMPLETE'
  const isEmpty = !clientContext && status !== 'LOADING'

  return (
    <section
      id="assistant-client-data"
      aria-label="Your data"
      className={cn('border rounded-lg', className)}
    >
      <header className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium">Your data</h3>
        {clientContext?.completeness && (
          <span className="text-xs text-muted-foreground">
            {Math.round(clientContext.completeness.score * 100)}% complete
          </span>
        )}
      </header>

      <div className="p-4">
        {/* Loading skeleton */}
        {isLoading && (
          <div data-testid="client-data-skeleton" className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <p className="text-sm text-muted-foreground">
            Your data will appear here
          </p>
        )}

        {/* Syncing indicator */}
        {isPartialComplete && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Still syncing your data...</span>
          </div>
        )}

        {/* Client context content */}
        {clientContext && (
          <div className="space-y-4">
            {/* Computed result (highlighted) */}
            {clientContext.computedResult && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground">
                  {clientContext.computedResult.label}
                </p>
                <p className="text-xl font-semibold text-primary">
                  {clientContext.computedResult.value}
                </p>
                {clientContext.computedResult.explanation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientContext.computedResult.explanation}
                  </p>
                )}
              </div>
            )}

            {/* Data points used */}
            {clientContext.used.length > 0 && (
              <DataPointList dataPoints={clientContext.used} />
            )}

            {/* Completeness notes */}
            {clientContext.completeness.notes && (
              <p className="text-xs text-muted-foreground">
                {clientContext.completeness.notes}
              </p>
            )}

            {/* Assumptions */}
            {clientContext.assumptions && clientContext.assumptions.length > 0 && (
              <div className="text-xs">
                <p className="font-medium text-muted-foreground mb-1">Assumptions:</p>
                <ul className="space-y-0.5">
                  {clientContext.assumptions.map((assumption, i) => (
                    <li key={i} className="text-muted-foreground flex gap-1">
                      <span>•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing data */}
            {clientContext.missing && clientContext.missing.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Missing data</p>
                    <ul className="mt-1 space-y-1">
                      {clientContext.missing.map((item, i) => (
                        <li key={i} className="text-xs text-yellow-700">
                          <strong>{item.label}</strong>
                          {item.impact && <span> — {item.impact}</span>}
                        </li>
                      ))}
                    </ul>
                    {onConnectData && (
                      <button
                        type="button"
                        onClick={onConnectData}
                        className="mt-2 text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Connect your data
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/ClientDataPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/ClientDataPanel.tsx src/components/assistant-v2/__tests__/ClientDataPanel.test.tsx
git commit -m "feat(assistant): add ClientDataPanel component"
```

---

## Task 36: Create DataPointList Component

**Files:**

- Create: `src/components/assistant-v2/DataPointList.tsx`
- Test: `src/components/assistant-v2/__tests__/DataPointList.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/DataPointList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataPointList } from '../DataPointList'
import type { DataPoint } from '@/lib/assistant'

const mockDataPoints: DataPoint[] = [
  {
    label: 'Revenue YTD',
    value: '€31,760',
    source: 'Invoices',
    asOfDate: '2024-12-23',
  },
  {
    label: 'VAT Threshold',
    value: '€40,000',
    source: 'Regulatory rule',
    asOfDate: '2024-01-01',
  },
  {
    label: 'Invoice Count',
    value: '47',
    source: 'Invoices',
  },
]

describe('DataPointList', () => {
  it('renders all data points', () => {
    render(<DataPointList dataPoints={mockDataPoints} />)

    expect(screen.getByText('Revenue YTD')).toBeInTheDocument()
    expect(screen.getByText('VAT Threshold')).toBeInTheDocument()
    expect(screen.getByText('Invoice Count')).toBeInTheDocument()
  })

  it('renders labels and values', () => {
    render(<DataPointList dataPoints={mockDataPoints} />)

    expect(screen.getByText('€31,760')).toBeInTheDocument()
    expect(screen.getByText('€40,000')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
  })

  it('renders source for each data point', () => {
    render(<DataPointList dataPoints={mockDataPoints} />)

    const invoiceSources = screen.getAllByText(/invoices/i)
    expect(invoiceSources.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/regulatory rule/i)).toBeInTheDocument()
  })

  it('renders as-of date when provided', () => {
    render(<DataPointList dataPoints={mockDataPoints} />)

    // Should show formatted dates
    expect(screen.getByText(/12\/23\/2024|23\.12\.2024|Dec 23/)).toBeInTheDocument()
  })

  it('renders nothing when dataPoints is empty', () => {
    const { container } = render(<DataPointList dataPoints={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('uses definition list semantics', () => {
    render(<DataPointList dataPoints={mockDataPoints} />)

    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('renders with header "Data used"', () => {
    render(<DataPointList dataPoints={mockDataPoints} />)

    expect(screen.getByText(/data used/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/DataPointList.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/DataPointList.tsx
import type { DataPoint } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface DataPointListProps {
  dataPoints: DataPoint[]
  className?: string
}

export function DataPointList({ dataPoints, className }: DataPointListProps) {
  if (dataPoints.length === 0) return null

  return (
    <div className={className}>
      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
        Data used
      </h4>
      <ul role="list" className="space-y-2">
        {dataPoints.map((point, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-2 text-sm"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium">{point.label}</p>
              <p className="text-xs text-muted-foreground">
                {point.source}
                {point.asOfDate && (
                  <span> • {new Date(point.asOfDate).toLocaleDateString()}</span>
                )}
              </p>
            </div>
            <p className="font-medium text-right shrink-0">{point.value}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/DataPointList.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/DataPointList.tsx src/components/assistant-v2/__tests__/DataPointList.test.tsx
git commit -m "feat(assistant): add DataPointList component"
```

---

## Task 36b: Update Module Index

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

// Phase 6: Evidence & Client Data Panels
export { EvidencePanel } from "./EvidencePanel"
export { SourceCard } from "./SourceCard"
export { AuthorityBadge } from "./AuthorityBadge"
export { SupportingSources } from "./SupportingSources"
export { ClientDataPanel } from "./ClientDataPanel"
export { DataPointList } from "./DataPointList"
```

**Step 2: Commit**

```bash
git add src/components/assistant-v2/index.ts
git commit -m "feat(assistant): update Phase 6 component exports"
```

---

## Phase 6 Complete

After completing all tasks:

```bash
npx vitest run src/components/assistant-v2/
```

Expected: All 22 test files pass (8 from Phase 4 + 8 from Phase 5 + 6 from Phase 6).

---

## Summary: Phases 4-6 Component Tree

```
AssistantContainer
├── HistoryBar
├── AssistantInput
├── SuggestionChips
├── Announcer (sr-only)
│
├── AnswerSection
│   ├── EmptyState (IDLE)
│   ├── AnswerSkeleton (LOADING)
│   ├── AnswerCard (COMPLETE)
│   │   ├── ConfidenceBadge
│   │   ├── ActionButtons
│   │   └── WhyDrawer (collapsible)
│   ├── RefusalCard (REFUSAL)
│   ├── ConflictBanner (when conflict exists)
│   ├── ErrorCard (ERROR)
│   └── RelatedQuestions
│
├── EvidencePanel
│   ├── SourceCard (primary, expanded)
│   │   └── AuthorityBadge
│   └── SupportingSources (collapsible)
│       └── SourceCard (compact)
│
└── ClientDataPanel (APP only)
    ├── DataPointList
    └── Missing data CTA
```

**Next:** Phase 7 (Accessibility) - Tasks 37-41
