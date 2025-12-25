# FiskAI Assistant Phase 4: Core UI Components

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core UI component structure for the Assistant interface.

**Architecture:** React components with Tailwind CSS, using the shared controller hook from Phase 2.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest, @testing-library/react

**Prerequisites:** Phases 1-3 complete (types, controller hook, API endpoint)

---

## Task 15: Create AssistantContainer Component

**Files:**

- Create: `src/components/assistant-v2/AssistantContainer.tsx`
- Create: `src/components/assistant-v2/index.ts`
- Test: `src/components/assistant-v2/__tests__/AssistantContainer.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/AssistantContainer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssistantContainer } from '../AssistantContainer'

// Mock the controller hook
vi.mock('@/lib/assistant', () => ({
  useAssistantController: vi.fn(() => ({
    state: {
      status: 'IDLE',
      activeRequestId: null,
      activeQuery: null,
      activeAnswer: null,
      history: [],
      error: null,
      retryCount: 0,
      streamProgress: {
        headline: false,
        directAnswer: false,
        citations: false,
        clientContext: false,
      },
    },
    surface: 'MARKETING',
    submit: vi.fn(),
    dispatch: vi.fn(),
  })),
}))

describe('AssistantContainer', () => {
  it('renders with MARKETING surface (2-column layout)', () => {
    render(<AssistantContainer surface="MARKETING" />)

    expect(screen.getByRole('region', { name: /regulatory assistant/i })).toBeInTheDocument()
    // Should have 2 columns: answer + evidence
    expect(screen.getByTestId('answer-column')).toBeInTheDocument()
    expect(screen.getByTestId('evidence-column')).toBeInTheDocument()
    // Should NOT have client data column
    expect(screen.queryByTestId('client-data-column')).not.toBeInTheDocument()
  })

  it('renders with APP surface (3-column layout)', () => {
    const { useAssistantController } = await import('@/lib/assistant')
    vi.mocked(useAssistantController).mockReturnValue({
      state: {
        status: 'IDLE',
        activeRequestId: null,
        activeQuery: null,
        activeAnswer: null,
        history: [],
        error: null,
        retryCount: 0,
        streamProgress: {
          headline: false,
          directAnswer: false,
          citations: false,
          clientContext: false,
        },
      },
      surface: 'APP',
      submit: vi.fn(),
      dispatch: vi.fn(),
    })

    render(<AssistantContainer surface="APP" />)

    expect(screen.getByTestId('answer-column')).toBeInTheDocument()
    expect(screen.getByTestId('evidence-column')).toBeInTheDocument()
    expect(screen.getByTestId('client-data-column')).toBeInTheDocument()
  })

  it('renders input section', () => {
    render(<AssistantContainer surface="MARKETING" />)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/AssistantContainer.test.tsx`
Expected: FAIL with "Cannot find module '../AssistantContainer'"

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/AssistantContainer.tsx
'use client'

import { useAssistantController, type Surface } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface AssistantContainerProps {
  surface: Surface
  className?: string
}

export function AssistantContainer({ surface, className }: AssistantContainerProps) {
  const { state, submit } = useAssistantController({ surface })

  const isApp = surface === 'APP'

  return (
    <section
      role="region"
      aria-label="Regulatory assistant"
      className={cn('flex flex-col gap-4', className)}
    >
      {/* Input Section */}
      <div id="assistant-input">
        <textarea
          placeholder={
            isApp
              ? 'Ask about regulations or your business...'
              : 'Ask about Croatian tax, VAT, contributions, fiscalization...'
          }
          className="w-full p-3 border rounded-lg resize-none"
          rows={2}
        />
      </div>

      {/* Main Content Grid */}
      <div
        className={cn(
          'grid gap-6',
          isApp ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        )}
      >
        {/* Answer Column */}
        <div data-testid="answer-column" className="lg:col-span-1">
          <div className="p-4 border rounded-lg min-h-[200px]">
            <p className="text-muted-foreground">Verified answer will appear here</p>
          </div>
        </div>

        {/* Evidence Column */}
        <div data-testid="evidence-column" className="lg:col-span-1">
          <div className="p-4 border rounded-lg min-h-[200px]">
            <h3 className="font-medium mb-2">Sources</h3>
            <p className="text-muted-foreground text-sm">
              Official regulations, laws, and guidance
            </p>
          </div>
        </div>

        {/* Client Data Column (APP only) */}
        {isApp && (
          <div data-testid="client-data-column" className="lg:col-span-1">
            <div className="p-4 border rounded-lg min-h-[200px]">
              <h3 className="font-medium mb-2">Your data</h3>
              <p className="text-muted-foreground text-sm">
                Connected sources will be used for personalized answers
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
```

```typescript
// src/components/assistant-v2/index.ts
export { AssistantContainer } from "./AssistantContainer"
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/AssistantContainer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/
git commit -m "feat(assistant): add AssistantContainer component scaffold"
```

---

## Task 16: Create AssistantInput Component

**Files:**

- Create: `src/components/assistant-v2/AssistantInput.tsx`
- Test: `src/components/assistant-v2/__tests__/AssistantInput.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/AssistantInput.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssistantInput } from '../AssistantInput'

describe('AssistantInput', () => {
  it('renders textarea with placeholder', () => {
    render(<AssistantInput surface="MARKETING" onSubmit={vi.fn()} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('Croatian'))
  })

  it('renders send button', () => {
    render(<AssistantInput surface="MARKETING" onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('calls onSubmit when Enter is pressed', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<AssistantInput surface="MARKETING" onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'What is VAT rate?')
    await user.keyboard('{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('What is VAT rate?')
  })

  it('does NOT submit on Shift+Enter (allows newline)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<AssistantInput surface="MARKETING" onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Line 1')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(textarea, 'Line 2')

    expect(onSubmit).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('Line 1\nLine 2')
  })

  it('calls onSubmit when send button is clicked', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<AssistantInput surface="MARKETING" onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'My question')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    expect(onSubmit).toHaveBeenCalledWith('My question')
  })

  it('clears input after submit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<AssistantInput surface="MARKETING" onSubmit={onSubmit} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test query')
    await user.keyboard('{Enter}')

    expect(textarea).toHaveValue('')
  })

  it('disables input and button when disabled prop is true', () => {
    render(<AssistantInput surface="MARKETING" onSubmit={vi.fn()} disabled />)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('does not submit empty query', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<AssistantInput surface="MARKETING" onSubmit={onSubmit} />)

    await user.keyboard('{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('has aria-describedby for keyboard hint', () => {
    render(<AssistantInput surface="MARKETING" onSubmit={vi.fn()} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('aria-describedby')

    const hintId = textarea.getAttribute('aria-describedby')
    expect(document.getElementById(hintId!)).toHaveTextContent(/enter.*send/i)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/AssistantInput.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/AssistantInput.tsx
'use client'

import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import type { Surface } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface AssistantInputProps {
  surface: Surface
  onSubmit: (query: string) => void
  disabled?: boolean
  className?: string
}

const PLACEHOLDERS: Record<Surface, string> = {
  MARKETING: 'Ask about Croatian tax, VAT, contributions, fiscalization...',
  APP: 'Ask about regulations or your business...',
}

export function AssistantInput({
  surface,
  onSubmit,
  disabled = false,
  className,
}: AssistantInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return

    onSubmit(trimmed)
    setValue('')
  }, [value, disabled, onSubmit])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDERS[surface]}
        disabled={disabled}
        rows={2}
        aria-describedby="assistant-input-hint"
        className={cn(
          'w-full p-3 pr-12 border rounded-lg resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className={cn(
          'absolute right-2 bottom-2 p-2 rounded-md',
          'text-primary hover:bg-primary/10',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-primary/50'
        )}
      >
        <Send className="w-5 h-5" />
      </button>

      <p id="assistant-input-hint" className="sr-only">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/AssistantInput.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/AssistantInput.tsx src/components/assistant-v2/__tests__/AssistantInput.test.tsx
git commit -m "feat(assistant): add AssistantInput component with keyboard support"
```

---

## Task 17: Create SuggestionChips Component

**Files:**

- Create: `src/components/assistant-v2/SuggestionChips.tsx`
- Test: `src/components/assistant-v2/__tests__/SuggestionChips.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/SuggestionChips.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuggestionChips } from '../SuggestionChips'

describe('SuggestionChips', () => {
  const suggestions = [
    'VAT registration threshold',
    'Paušalni obrt limits',
    'Fiscalization requirements',
  ]

  it('renders all suggestions', () => {
    render(<SuggestionChips suggestions={suggestions} onSelect={vi.fn()} />)

    expect(screen.getByRole('option', { name: /VAT registration/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Paušalni/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Fiscalization/i })).toBeInTheDocument()
  })

  it('calls onSelect with suggestion text when clicked (fill-only, no submit)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<SuggestionChips suggestions={suggestions} onSelect={onSelect} />)

    await user.click(screen.getByRole('option', { name: /VAT registration/i }))

    expect(onSelect).toHaveBeenCalledWith('VAT registration threshold')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('truncates long suggestions at 32 chars with ellipsis', () => {
    const longSuggestion = 'This is a very long suggestion that exceeds the limit'
    render(<SuggestionChips suggestions={[longSuggestion]} onSelect={vi.fn()} />)

    const chip = screen.getByRole('option')
    expect(chip.textContent?.length).toBeLessThanOrEqual(35) // 32 + "..."
    expect(chip).toHaveTextContent('...')
  })

  it('uses role="listbox" for container', () => {
    render(<SuggestionChips suggestions={suggestions} onSelect={vi.fn()} />)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('supports keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup()

    render(<SuggestionChips suggestions={suggestions} onSelect={vi.fn()} />)

    const listbox = screen.getByRole('listbox')
    await user.click(listbox)

    // First chip should be active
    expect(listbox).toHaveAttribute('aria-activedescendant', 'chip-0')

    // Press right arrow
    await user.keyboard('{ArrowRight}')
    expect(listbox).toHaveAttribute('aria-activedescendant', 'chip-1')

    // Press right arrow again
    await user.keyboard('{ArrowRight}')
    expect(listbox).toHaveAttribute('aria-activedescendant', 'chip-2')

    // Wrap around
    await user.keyboard('{ArrowRight}')
    expect(listbox).toHaveAttribute('aria-activedescendant', 'chip-0')
  })

  it('selects on Enter when chip is focused', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<SuggestionChips suggestions={suggestions} onSelect={onSelect} />)

    const listbox = screen.getByRole('listbox')
    await user.click(listbox)
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith('VAT registration threshold')
  })

  it('renders nothing when suggestions is empty', () => {
    const { container } = render(<SuggestionChips suggestions={[]} onSelect={vi.fn()} />)

    expect(container.firstChild).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/SuggestionChips.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/SuggestionChips.tsx
'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  className?: string
}

const MAX_DISPLAY_LENGTH = 32

function truncate(text: string): string {
  if (text.length <= MAX_DISPLAY_LENGTH) return text
  return text.slice(0, MAX_DISPLAY_LENGTH - 3) + '...'
}

export function SuggestionChips({
  suggestions,
  onSelect,
  className,
}: SuggestionChipsProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => (prev + 1) % suggestions.length)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onSelect(suggestions[activeIndex])
          break
      }
    },
    [suggestions, activeIndex, onSelect]
  )

  if (suggestions.length === 0) return null

  return (
    <div
      role="listbox"
      tabIndex={0}
      aria-activedescendant={`chip-${activeIndex}`}
      aria-label="Suggested questions"
      onKeyDown={handleKeyDown}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          id={`chip-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          tabIndex={-1}
          onClick={() => onSelect(suggestion)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full border',
            'hover:bg-muted transition-colors',
            'focus:outline-none',
            index === activeIndex && 'ring-2 ring-primary/50'
          )}
        >
          {truncate(suggestion)}
        </button>
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/SuggestionChips.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/SuggestionChips.tsx src/components/assistant-v2/__tests__/SuggestionChips.test.tsx
git commit -m "feat(assistant): add SuggestionChips with roving tabindex"
```

---

## Task 18: Create HistoryBar Component

**Files:**

- Create: `src/components/assistant-v2/HistoryBar.tsx`
- Test: `src/components/assistant-v2/__tests__/HistoryBar.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/HistoryBar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryBar } from '../HistoryBar'
import type { HistoryItem } from '@/lib/assistant'

const mockHistory: HistoryItem[] = [
  {
    id: 'h1',
    query: 'What is VAT rate?',
    answer: {} as any,
    timestamp: '2024-12-24T10:00:00Z',
  },
  {
    id: 'h2',
    query: 'Paušalni obrt limits',
    answer: {} as any,
    timestamp: '2024-12-24T10:05:00Z',
  },
]

describe('HistoryBar', () => {
  it('renders collapsed toggle with count', () => {
    render(<HistoryBar history={mockHistory} onRestore={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByRole('button', { name: /previous questions \(2\)/i })).toBeInTheDocument()
  })

  it('expands to show history items when clicked', async () => {
    const user = userEvent.setup()

    render(<HistoryBar history={mockHistory} onRestore={vi.fn()} onClear={vi.fn()} />)

    const toggle = screen.getByRole('button', { name: /previous questions/i })
    await user.click(toggle)

    expect(screen.getByText('What is VAT rate?')).toBeInTheDocument()
    expect(screen.getByText('Paušalni obrt limits')).toBeInTheDocument()
  })

  it('calls onRestore with index when item clicked', async () => {
    const onRestore = vi.fn()
    const user = userEvent.setup()

    render(<HistoryBar history={mockHistory} onRestore={onRestore} onClear={vi.fn()} />)

    // Expand
    await user.click(screen.getByRole('button', { name: /previous questions/i }))

    // Click first item
    await user.click(screen.getByText('What is VAT rate?'))

    expect(onRestore).toHaveBeenCalledWith(0)
  })

  it('shows clear all button when expanded', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()

    render(<HistoryBar history={mockHistory} onRestore={vi.fn()} onClear={onClear} />)

    await user.click(screen.getByRole('button', { name: /previous questions/i }))

    const clearButton = screen.getByRole('button', { name: /clear all/i })
    expect(clearButton).toBeInTheDocument()

    await user.click(clearButton)
    expect(onClear).toHaveBeenCalled()
  })

  it('does not render when history is empty', () => {
    const { container } = render(
      <HistoryBar history={[]} onRestore={vi.fn()} onClear={vi.fn()} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('truncates long queries', () => {
    const longHistory: HistoryItem[] = [
      {
        id: 'h1',
        query: 'This is a very long query that should be truncated to fit in the UI',
        answer: {} as any,
        timestamp: '2024-12-24T10:00:00Z',
      },
    ]

    render(<HistoryBar history={longHistory} onRestore={vi.fn()} onClear={vi.fn()} />)

    // Toggle open
    const toggle = screen.getByRole('button', { name: /previous questions/i })
    fireEvent.click(toggle)

    const item = screen.getByText(/This is a very long query/)
    expect(item.textContent?.length).toBeLessThanOrEqual(53) // 50 + "..."
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/HistoryBar.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/HistoryBar.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { HistoryItem } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface HistoryBarProps {
  history: HistoryItem[]
  onRestore: (index: number) => void
  onClear: () => void
  className?: string
}

function truncateQuery(query: string, maxLength = 50): string {
  if (query.length <= maxLength) return query
  return query.slice(0, maxLength - 3) + '...'
}

export function HistoryBar({
  history,
  onRestore,
  onClear,
  className,
}: HistoryBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (history.length === 0) return null

  return (
    <div className={cn('border rounded-lg', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className={cn(
          'w-full flex items-center justify-between p-3',
          'text-sm text-muted-foreground hover:bg-muted/50',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50'
        )}
      >
        <span>Previous questions ({history.length})</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t">
          <ul className="divide-y">
            {history.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onRestore(index)}
                  className={cn(
                    'w-full text-left p-3 text-sm',
                    'hover:bg-muted/50',
                    'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50'
                  )}
                >
                  {truncateQuery(item.query)}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t p-2">
            <button
              type="button"
              onClick={onClear}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground',
                'hover:text-destructive',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 rounded'
              )}
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/HistoryBar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/HistoryBar.tsx src/components/assistant-v2/__tests__/HistoryBar.test.tsx
git commit -m "feat(assistant): add HistoryBar component"
```

---

## Task 19: Create AnswerSection Component

**Files:**

- Create: `src/components/assistant-v2/AnswerSection.tsx`
- Test: `src/components/assistant-v2/__tests__/AnswerSection.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/AnswerSection.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnswerSection } from '../AnswerSection'
import type { AssistantControllerState, AssistantResponse } from '@/lib/assistant'
import { SCHEMA_VERSION } from '@/lib/assistant'

const mockResponse: AssistantResponse = {
  schemaVersion: SCHEMA_VERSION,
  requestId: 'req_1',
  traceId: 'trace_1',
  kind: 'ANSWER',
  topic: 'REGULATORY',
  surface: 'MARKETING',
  createdAt: new Date().toISOString(),
  headline: 'VAT rate is 25%',
  directAnswer: 'Standard VAT rate in Croatia is 25%.',
}

const idleState: AssistantControllerState = {
  status: 'IDLE',
  activeRequestId: null,
  activeQuery: null,
  activeAnswer: null,
  history: [],
  error: null,
  retryCount: 0,
  streamProgress: { headline: false, directAnswer: false, citations: false, clientContext: false },
}

describe('AnswerSection', () => {
  it('renders empty state when IDLE with no answer', () => {
    render(<AnswerSection state={idleState} surface="MARKETING" />)

    expect(screen.getByText(/verified answer will appear here/i)).toBeInTheDocument()
  })

  it('renders loading skeleton when LOADING', () => {
    const loadingState = { ...idleState, status: 'LOADING' as const }

    render(<AnswerSection state={loadingState} surface="MARKETING" />)

    expect(screen.getByTestId('answer-skeleton')).toBeInTheDocument()
  })

  it('renders answer card when COMPLETE with answer', () => {
    const completeState: AssistantControllerState = {
      ...idleState,
      status: 'COMPLETE',
      activeAnswer: mockResponse,
    }

    render(<AnswerSection state={completeState} surface="MARKETING" />)

    expect(screen.getByText('VAT rate is 25%')).toBeInTheDocument()
    expect(screen.getByText(/Standard VAT rate/)).toBeInTheDocument()
  })

  it('renders refusal card when answer kind is REFUSAL', () => {
    const refusalResponse: AssistantResponse = {
      ...mockResponse,
      kind: 'REFUSAL',
      refusalReason: 'OUT_OF_SCOPE',
      refusal: {
        message: 'This question is outside our coverage.',
      },
    }
    const refusalState: AssistantControllerState = {
      ...idleState,
      status: 'COMPLETE',
      activeAnswer: refusalResponse,
    }

    render(<AnswerSection state={refusalState} surface="MARKETING" />)

    expect(screen.getByText(/outside our coverage/i)).toBeInTheDocument()
  })

  it('renders error card when status is ERROR', () => {
    const errorState: AssistantControllerState = {
      ...idleState,
      status: 'ERROR',
      error: { type: 'NETWORK_FAILURE', message: 'Connection failed' },
    }

    render(<AnswerSection state={errorState} surface="MARKETING" />)

    expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
  })

  it('headline has tabindex=-1 for focus management', () => {
    const completeState: AssistantControllerState = {
      ...idleState,
      status: 'COMPLETE',
      activeAnswer: mockResponse,
    }

    render(<AnswerSection state={completeState} surface="MARKETING" />)

    const headline = screen.getByRole('heading', { level: 2 })
    expect(headline).toHaveAttribute('tabindex', '-1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/AnswerSection.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/AnswerSection.tsx
'use client'

import type { AssistantControllerState, Surface } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface AnswerSectionProps {
  state: AssistantControllerState
  surface: Surface
  className?: string
}

export function AnswerSection({ state, surface, className }: AnswerSectionProps) {
  const { status, activeAnswer, error } = state

  // Empty state
  if (status === 'IDLE' && !activeAnswer) {
    return (
      <div className={cn('p-6 border rounded-lg', className)}>
        <p className="text-muted-foreground">Verified answer will appear here</p>
        <p className="text-sm text-muted-foreground mt-2">
          Every response includes verified citations from official sources
        </p>
      </div>
    )
  }

  // Loading skeleton
  if (status === 'LOADING') {
    return (
      <div data-testid="answer-skeleton" className={cn('p-6 border rounded-lg space-y-4', className)}>
        <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'ERROR' && error) {
    return (
      <div className={cn('p-6 border border-destructive/50 rounded-lg bg-destructive/5', className)}>
        <h2 className="font-medium text-destructive">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        {error.type !== 'CLIENT_ERROR' && (
          <button className="mt-3 text-sm text-primary hover:underline">
            Try again
          </button>
        )}
      </div>
    )
  }

  // No answer yet (streaming started but no content)
  if (!activeAnswer) {
    return (
      <div data-testid="answer-skeleton" className={cn('p-6 border rounded-lg', className)}>
        <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
      </div>
    )
  }

  // Refusal card
  if (activeAnswer.kind === 'REFUSAL') {
    return (
      <div className={cn('p-6 border rounded-lg bg-muted/30', className)}>
        <h2 tabIndex={-1} className="font-medium">
          {activeAnswer.refusalReason === 'OUT_OF_SCOPE'
            ? 'Outside our coverage'
            : activeAnswer.refusalReason === 'NO_CITABLE_RULES'
              ? 'No verified rules available'
              : activeAnswer.refusalReason === 'MISSING_CLIENT_DATA'
                ? 'More data needed'
                : 'Unable to answer'}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {activeAnswer.refusal?.message}
        </p>
      </div>
    )
  }

  // Answer card
  return (
    <div className={cn('p-6 border rounded-lg', className)}>
      <h2 tabIndex={-1} className="text-lg font-semibold">
        {activeAnswer.headline}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {activeAnswer.directAnswer}
      </p>

      {activeAnswer.keyDetails && activeAnswer.keyDetails.length > 0 && (
        <ul className="mt-4 space-y-1">
          {activeAnswer.keyDetails.map((detail, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-primary">•</span>
              {detail}
            </li>
          ))}
        </ul>
      )}

      {activeAnswer.nextStep && (
        <p className="mt-4 text-sm font-medium text-primary">
          Next step: {activeAnswer.nextStep}
        </p>
      )}

      <div className="flex gap-2 mt-4">
        {activeAnswer.why && (
          <button className="text-sm px-3 py-1.5 border rounded hover:bg-muted">
            Why?
          </button>
        )}
        {activeAnswer.howToApply && (
          <button className="text-sm px-3 py-1.5 border rounded hover:bg-muted">
            How to apply
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/AnswerSection.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/AnswerSection.tsx src/components/assistant-v2/__tests__/AnswerSection.test.tsx
git commit -m "feat(assistant): add AnswerSection component with all states"
```

---

## Task 20: Create EmptyState Component

**Files:**

- Create: `src/components/assistant-v2/EmptyState.tsx`
- Test: `src/components/assistant-v2/__tests__/EmptyState.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/EmptyState.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  it('renders answer placeholder for MARKETING surface', () => {
    render(<EmptyState type="answer" surface="MARKETING" />)

    expect(screen.getByText(/verified answer will appear here/i)).toBeInTheDocument()
    expect(screen.getByText(/verified citations from official sources/i)).toBeInTheDocument()
  })

  it('renders answer placeholder for APP surface', () => {
    render(<EmptyState type="answer" surface="APP" />)

    expect(screen.getByText(/verified answer will appear here/i)).toBeInTheDocument()
    expect(screen.getByText(/calculations based on your connected data/i)).toBeInTheDocument()
  })

  it('renders evidence placeholder', () => {
    render(<EmptyState type="evidence" surface="MARKETING" />)

    expect(screen.getByText(/sources/i)).toBeInTheDocument()
    expect(screen.getByText(/official regulations, laws, and guidance/i)).toBeInTheDocument()
  })

  it('renders client data placeholder for APP surface', () => {
    render(<EmptyState type="clientData" surface="APP" />)

    expect(screen.getByText(/your data/i)).toBeInTheDocument()
    expect(screen.getByText(/connected sources will be used/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/EmptyState.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/EmptyState.tsx
import type { Surface } from '@/lib/assistant'
import { cn } from '@/lib/utils'

type EmptyStateType = 'answer' | 'evidence' | 'clientData'

interface EmptyStateProps {
  type: EmptyStateType
  surface: Surface
  className?: string
}

const COPY: Record<EmptyStateType, Record<Surface, { title: string; subtitle: string }>> = {
  answer: {
    MARKETING: {
      title: 'Verified answer will appear here',
      subtitle: 'Every response includes verified citations from official sources',
    },
    APP: {
      title: 'Verified answer will appear here',
      subtitle: 'Answers can include calculations based on your connected data',
    },
  },
  evidence: {
    MARKETING: {
      title: 'Sources',
      subtitle: 'Official regulations, laws, and guidance',
    },
    APP: {
      title: 'Sources',
      subtitle: 'Official regulations and your business data',
    },
  },
  clientData: {
    MARKETING: {
      title: 'Your data',
      subtitle: 'Connect your data for personalized answers',
    },
    APP: {
      title: 'Your data',
      subtitle: 'Connected sources will be used for personalized answers',
    },
  },
}

export function EmptyState({ type, surface, className }: EmptyStateProps) {
  const copy = COPY[type][surface]

  return (
    <div className={cn('p-6 border rounded-lg border-dashed', className)}>
      <h3 className="font-medium text-muted-foreground">{copy.title}</h3>
      <p className="text-sm text-muted-foreground/70 mt-1">{copy.subtitle}</p>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/EmptyState.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/EmptyState.tsx src/components/assistant-v2/__tests__/EmptyState.test.tsx
git commit -m "feat(assistant): add EmptyState component"
```

---

## Task 21: Create AnswerSkeleton Component

**Files:**

- Create: `src/components/assistant-v2/AnswerSkeleton.tsx`
- Test: `src/components/assistant-v2/__tests__/AnswerSkeleton.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/AnswerSkeleton.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnswerSkeleton } from '../AnswerSkeleton'

describe('AnswerSkeleton', () => {
  it('renders headline skeleton', () => {
    render(<AnswerSkeleton />)

    expect(screen.getByTestId('skeleton-headline')).toBeInTheDocument()
  })

  it('renders direct answer skeleton lines', () => {
    render(<AnswerSkeleton />)

    expect(screen.getByTestId('skeleton-answer-1')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-answer-2')).toBeInTheDocument()
  })

  it('renders button placeholders', () => {
    render(<AnswerSkeleton />)

    expect(screen.getByTestId('skeleton-button-1')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-button-2')).toBeInTheDocument()
  })

  it('has aria-hidden for screen readers', () => {
    render(<AnswerSkeleton />)

    const skeleton = screen.getByTestId('answer-skeleton-container')
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
  })

  it('respects prefers-reduced-motion via CSS class', () => {
    render(<AnswerSkeleton />)

    const animatedElements = screen.getAllByTestId(/skeleton-/)
    animatedElements.forEach((el) => {
      expect(el.className).toContain('motion-safe:animate-pulse')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/AnswerSkeleton.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/AnswerSkeleton.tsx
import { cn } from '@/lib/utils'

interface AnswerSkeletonProps {
  className?: string
}

export function AnswerSkeleton({ className }: AnswerSkeletonProps) {
  return (
    <div
      data-testid="answer-skeleton-container"
      aria-hidden="true"
      className={cn('p-6 border rounded-lg space-y-4', className)}
    >
      {/* Headline skeleton */}
      <div
        data-testid="skeleton-headline"
        className="h-6 bg-muted rounded motion-safe:animate-pulse w-3/4"
      />

      {/* Direct answer skeleton */}
      <div className="space-y-2">
        <div
          data-testid="skeleton-answer-1"
          className="h-4 bg-muted rounded motion-safe:animate-pulse"
        />
        <div
          data-testid="skeleton-answer-2"
          className="h-4 bg-muted rounded motion-safe:animate-pulse w-5/6"
        />
      </div>

      {/* Button placeholders */}
      <div className="flex gap-2 pt-2">
        <div
          data-testid="skeleton-button-1"
          className="h-8 w-20 bg-muted rounded motion-safe:animate-pulse"
        />
        <div
          data-testid="skeleton-button-2"
          className="h-8 w-24 bg-muted rounded motion-safe:animate-pulse"
        />
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/AnswerSkeleton.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/AnswerSkeleton.tsx src/components/assistant-v2/__tests__/AnswerSkeleton.test.tsx
git commit -m "feat(assistant): add AnswerSkeleton with reduced motion support"
```

---

## Task 22: Create Announcer Component

**Files:**

- Create: `src/components/assistant-v2/Announcer.tsx`
- Test: `src/components/assistant-v2/__tests__/Announcer.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/assistant-v2/__tests__/Announcer.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Announcer } from '../Announcer'

describe('Announcer', () => {
  it('renders with role="status"', () => {
    render(<Announcer message="" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-live="polite"', () => {
    render(<Announcer message="" />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('has aria-atomic="true"', () => {
    render(<Announcer message="" />)

    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
  })

  it('is visually hidden but accessible', () => {
    render(<Announcer message="Loading answer..." />)

    const announcer = screen.getByRole('status')
    expect(announcer).toHaveClass('sr-only')
  })

  it('displays the message', () => {
    render(<Announcer message="Answer received: VAT rate is 25%" />)

    expect(screen.getByRole('status')).toHaveTextContent('Answer received: VAT rate is 25%')
  })

  it('updates message when prop changes', () => {
    const { rerender } = render(<Announcer message="Loading..." />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading...')

    rerender(<Announcer message="Complete!" />)

    expect(screen.getByRole('status')).toHaveTextContent('Complete!')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/assistant-v2/__tests__/Announcer.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/components/assistant-v2/Announcer.tsx
interface AnnouncerProps {
  message: string
}

export function Announcer({ message }: AnnouncerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/assistant-v2/__tests__/Announcer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/assistant-v2/Announcer.tsx src/components/assistant-v2/__tests__/Announcer.test.tsx
git commit -m "feat(assistant): add Announcer component for screen readers"
```

---

## Task 22b: Update Module Index

**Files:**

- Modify: `src/components/assistant-v2/index.ts`

**Step 1: Update exports**

```typescript
// src/components/assistant-v2/index.ts
export { AssistantContainer } from "./AssistantContainer"
export { AssistantInput } from "./AssistantInput"
export { SuggestionChips } from "./SuggestionChips"
export { HistoryBar } from "./HistoryBar"
export { AnswerSection } from "./AnswerSection"
export { EmptyState } from "./EmptyState"
export { AnswerSkeleton } from "./AnswerSkeleton"
export { Announcer } from "./Announcer"
```

**Step 2: Commit**

```bash
git add src/components/assistant-v2/index.ts
git commit -m "feat(assistant): update Phase 4 component exports"
```

---

## Phase 4 Complete

After completing all tasks:

```bash
npx vitest run src/components/assistant-v2/
```

Expected: All 8 test files pass.

**Next:** Phase 5 (Answer Components) - Tasks 23-30
