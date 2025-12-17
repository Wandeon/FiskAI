# Stripe-Style Command Palette Search

**Date:** 2025-12-18
**Status:** Approved

## Overview

Replace the current navigation-only command palette with a Stripe-style global search that indexes guides, tools, quick actions, and navigation.

## Decisions Made

| Decision         | Choice                                             |
| ---------------- | -------------------------------------------------- |
| Scope            | Navigation + Knowledge Hub + Tools + Quick Actions |
| Result display   | Grouped by type                                    |
| Initial state    | Recent searches + Quick actions                    |
| Index strategy   | Static build-time JSON                             |
| Keyboard support | Full (⌘K, arrows, ⌘+number shortcuts)              |

## Architecture

### Component Structure

```
src/components/ui/
├── command-palette/
│   ├── CommandPalette.tsx      # Main modal wrapper
│   ├── CommandInput.tsx        # Search input with keyboard handling
│   ├── CommandResults.tsx      # Grouped results display
│   ├── CommandItem.tsx         # Individual result row
│   ├── useCommandPalette.ts    # State & keyboard logic
│   └── index.ts
```

### Search Index

```
src/lib/search/
├── build-index.ts              # Runs at build time
├── search-index.json           # Generated ~50-100KB
├── search.ts                   # Client-side fuzzy search
└── types.ts

scripts/
├── build-search-index.ts       # Build script
```

### Data Flow

1. `next build` runs `build-search-index.ts` → scans MDX + navigation + tools
2. Outputs `public/search-index.json` with all searchable content
3. Client loads index on first `⌘K` press (lazy)
4. Fuzzy search runs entirely client-side via `fuse.js`
5. Recent searches stored in `localStorage`

### Index Entry Shape

```typescript
interface SearchEntry {
  id: string
  type: "action" | "tool" | "guide" | "comparison" | "how-to" | "news" | "nav"
  title: string
  description?: string
  keywords: string[] // Extra searchable terms
  href: string
  icon?: string // Lucide icon name
  shortcut?: string // e.g., "⌘1" for quick actions
}
```

## UI Design

### Modal Appearance

- Centered modal, max-width ~640px
- Backdrop blur with dark overlay (`bg-black/50 backdrop-blur-sm`)
- Rounded corners, subtle border (`border-white/10`)
- Smooth open animation (scale from 95% + fade)

### Search Input

- Large input, 48px height
- Search icon left, shortcut badge right
- Auto-focus on open

### Results Layout

```
┌─────────────────────────────────────────────────┐
│ 🔍  bruto                                       │
├─────────────────────────────────────────────────┤
│ Quick Actions                                   │
│   ⌘1  💰 Calculate net salary                  │
│                                                 │
│ Tools                                           │
│   →   📊 Bruto-neto kalkulator                 │
│        Izračunaj neto plaću iz bruto iznosa    │
│                                                 │
│ Guides                                          │
│   →   📖 Porez na dohodak                      │
│        Sve o porezu za obrtnike i freelancere  │
└─────────────────────────────────────────────────┘
```

### Selected State

- Light background highlight (`bg-white/5`)
- Left accent border in brand color
- Keyboard selection follows mouse hover

### Styling

Use existing CSS variables: `--foreground`, `--border`, `--surface-secondary`

## Keyboard Navigation

### Opening/Closing

- `⌘K` / `Ctrl+K` - Toggle open (global listener)
- `Esc` - Close modal
- Click backdrop - Close modal

### Navigation

- `↑` / `↓` - Move selection through results
- `Enter` - Navigate to selected item
- Selection wraps (bottom → top)
- Selection skips group headers

### Quick Action Shortcuts

- `⌘1` through `⌘5` - Jump directly to quick action
- Only active when search is empty
- Visual indicator shows shortcut in UI

### Search Behavior

- Debounce: 100ms
- Fuzzy matching via `fuse.js` (~3KB gzipped)
- Match highlights in results
- Empty query → show recent + quick actions

### Recent Searches

- Store last 5 searches in `localStorage`
- Only store when user navigates (not every keystroke)
- Click 'x' to remove individual recent

## Content Indexed

| Type         | Source                     | Fields                         |
| ------------ | -------------------------- | ------------------------------ |
| `action`     | Hardcoded list             | title, description, href, icon |
| `tool`       | `/alati/*` pages           | title, description, href       |
| `guide`      | `/content/vodici/*.mdx`    | frontmatter title, description |
| `comparison` | `/content/usporedbe/*.mdx` | frontmatter title, description |
| `how-to`     | `/kako-da/*` pages         | title, description             |
| `news`       | `/content/vijesti/*.mdx`   | title, excerpt (latest 20)     |
| `nav`        | `/lib/navigation.ts`       | label, description, href       |

### Quick Actions (Hardcoded)

```typescript
const QUICK_ACTIONS = [
  {
    id: "calc-salary",
    title: "Izračunaj neto plaću",
    href: "/alati/bruto-neto",
    icon: "Calculator",
  },
  {
    id: "check-pdv",
    title: "Provjeri PDV prag",
    href: "/alati/pdv-kalkulator",
    icon: "TrendingUp",
  },
  {
    id: "compare-types",
    title: "Usporedi obrt vs d.o.o.",
    href: "/usporedbe/obrt-vs-doo",
    icon: "Scale",
  },
  {
    id: "calc-contributions",
    title: "Izračunaj doprinose",
    href: "/alati/kalkulator-doprinosa",
    icon: "Coins",
  },
  { id: "posd-calc", title: "POSD kalkulator", href: "/alati/posd-kalkulator", icon: "FileText" },
]
```

## Build Integration

**package.json:**

```json
{
  "scripts": {
    "prebuild": "tsx scripts/build-search-index.ts",
    "build": "next build"
  }
}
```

**Output:** `public/search-index.json` (~30-50KB, ~8-12KB gzipped)

## Dependencies

- `fuse.js` - Fuzzy search (~3KB gzipped)
- Existing: `lucide-react`, `framer-motion`
