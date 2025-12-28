# Component Layers Migration Contract

> Migration guide for adopting the 4-layer component architecture.

## Layer Hierarchy

```
ui/ (primitives) → patterns/ → sections/ → templates/ → pages
```

Each layer can only import from layers to its left.

## Migration Scope

**Phase 1 (Current):** Marketing portal only

- Templates: `src/components/templates/marketing/`
- Pages: `src/app/(marketing)/`

**Phase 2 (Future):** App portal
**Phase 3 (Future):** Staff/Admin portals

## Migration Contract

### Before Migration (Page-driven layout)

```tsx
// src/app/(marketing)/features/page.tsx
export default function FeaturesPage() {
  return (
    <SectionBackground variant="hero">
      <div className="mx-auto max-w-7xl px-4 py-24">
        <span className="text-accent">Features</span>
        <h1 className="text-display-lg">Build faster</h1>
        <p className="text-secondary">Description here</p>
        <GradientButton href="/signup">Get Started</GradientButton>
      </div>
    </SectionBackground>
    // ...more sections with layout code
  )
}
```

### After Migration (Configuration-driven)

```tsx
// src/app/(marketing)/features/page.tsx
import { MarketingPageTemplate } from "@/components/templates"
import { Zap, Shield, Clock } from "lucide-react"

export default function FeaturesPage() {
  return (
    <MarketingPageTemplate
      hero={{
        label: "Features",
        title: "Build faster",
        description: "Description here",
        actions: [{ label: "Get Started", href: "/signup" }],
      }}
      featureSections={[
        {
          title: "Core Capabilities",
          items: [
            { icon: Zap, title: "Fast", description: "..." },
            { icon: Shield, title: "Secure", description: "..." },
            { icon: Clock, title: "Real-time", description: "..." },
          ],
        },
      ]}
      cta={{
        title: "Ready to start?",
        actions: [{ label: "Sign Up", href: "/signup" }],
      }}
    />
  )
}
```

## Step-by-Step Migration

### 1. Identify Layout Decisions

Look for:

- `<div className="mx-auto max-w-7xl...">` - Container layout
- `grid`, `flex`, `gap-*` - Grid/flex layout
- `py-*`, `px-*`, `mt-*` - Spacing decisions
- Direct use of `SectionBackground`, `Reveal`, `Stagger`

These should move to sections/templates.

### 2. Extract to Sections

For each page section, determine if it matches an existing section:

- Full-width hero with CTA → `HeroSection`
- Grid of feature cards → `FeatureGrid`
- Call-to-action banner → `CTASection`

If no match, create a new section component.

### 3. Compose with Template

If multiple pages share the same section order, use a template:

- Marketing landing pages → `MarketingPageTemplate`

### 4. Verify Token Compliance

Run the no-hardcoded-colors lint:

```bash
npm run lint
```

All new code must use semantic tokens only.

## Token Reference

### Allowed in Components

```tsx
// Text colors (semantic)
text - foreground // Primary text
text - secondary // Muted text
text - accent // Brand accent

// Status colors (semantic)
text - success - icon // Success state
text - warning - icon // Warning state
text - danger - icon // Error state
text - info - icon // Info state

// Backgrounds (semantic)
bg - surface // Card/panel background
bg - accent / 10 // Accent tinted background
bg - success - bg // Success background
bg - warning - bg // Warning background
bg - danger - bg // Danger background
bg - info - bg // Info background
```

### Forbidden in Components

```tsx
// Raw Tailwind palette - use semantic tokens instead
text-white          // → text-foreground
text-slate-*        // → text-secondary or text-foreground
text-gray-*         // → text-secondary
text-cyan-*         // → text-accent
bg-slate-*          // → bg-surface or bg-background
bg-[#...]           // → Use CSS variables
```

## ESLint Enforcement

Import boundaries are enforced by `import/no-restricted-paths`:

```
ui/ ✗→ patterns/     "Primitives cannot import from patterns"
ui/ ✗→ sections/     "Primitives cannot import from sections"
ui/ ✗→ templates/    "Primitives cannot import from templates"
patterns/ ✗→ sections/   "Patterns cannot import from sections"
patterns/ ✗→ templates/  "Patterns cannot import from templates"
sections/ ✗→ templates/  "Sections cannot import from templates"
components/ ✗→ app/      "Components cannot import from app routes"
```

Token compliance is enforced by `fisk-design-system/no-hardcoded-colors`.

## Testing Enforcement

To verify ESLint catches violations:

```tsx
// Test file: src/components/patterns/__test-violation.tsx
// This should trigger ESLint error:
import { HeroSection } from "@/components/sections/HeroSection"
```

Run: `npm run lint`

Expected: Error "Patterns cannot import from sections."

## Component Prop Types

All section prop types are exported for type-safe configuration:

```tsx
import type {
  HeroSectionProps,
  HeroAction,
  FeatureGridProps,
  FeatureItem,
  CTASectionProps,
  CTAAction,
} from "@/components/sections"

import type { SectionHeadingProps, FeatureCardProps, IconBadgeProps } from "@/components/patterns"
```

## Reduced Motion

All motion components respect `prefers-reduced-motion`:

- `Reveal` - Uses `useReducedMotion()`, skips animation if preferred
- `Stagger` - Uses `useReducedMotion()`, skips stagger effect if preferred
- `HoverScale` - CSS-based, uses `@media (prefers-reduced-motion)`

No additional work needed for accessibility compliance.

## Checklist for Migrated Pages

- [ ] No layout divs in page component
- [ ] Uses section components or template
- [ ] No raw Tailwind palette colors
- [ ] No direct imports of primitives (use patterns/sections)
- [ ] TypeScript: uses exported prop types
- [ ] ESLint: passes with no errors
