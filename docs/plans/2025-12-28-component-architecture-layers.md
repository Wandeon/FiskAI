# Component Architecture Layers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add patterns, sections, and templates layers to the existing component architecture with ESLint-enforced import boundaries.

**Architecture:** Extend (not replace) the existing structure. Keep `src/design-system/*` as token source, keep `src/components/ui` as primitives, add new layers on top. Enforce boundaries via ESLint restricted-imports, not conventions.

**Tech Stack:** React, TypeScript, Tailwind CSS, CVA, ESLint (eslint-plugin-import)

---

## Current State (Do Not Change)

```
src/design-system/          # Tokens - KEEP AS-IS
src/components/ui/          # Primitives - KEEP AS-IS
src/components/ui/motion/   # Motion primitives - KEEP AS-IS
src/components/ui/patterns/ # Patterns (GlassCard, etc.) - EXTEND
src/components/motion/      # Animation behaviors - KEEP AS-IS
```

## Target State (Add These)

```
src/components/patterns/    # NEW: Composed patterns (SectionHeading, IconBadge)
src/components/sections/    # NEW: Page sections (HeroSection, FeatureGrid)
src/components/templates/   # NEW: Portal-scoped templates (marketing only initially)
```

## Import Boundary Rules

```
tokens (design-system)     → can be imported by anything
ui (primitives)            → can import tokens, lib/utils only
patterns                   → can import ui + tokens + motion
sections                   → can import patterns + ui + tokens + motion
templates                  → can import sections + patterns + ui + tokens
pages                      → can import templates + data loaders only
```

---

## Task 1: Create Directory Structure

**Files:**

- Create: `src/components/patterns/index.ts`
- Create: `src/components/sections/index.ts`
- Create: `src/components/templates/index.ts`
- Create: `src/components/templates/marketing/index.ts`

**Step 1: Create directories and barrel exports**

```bash
mkdir -p src/components/patterns
mkdir -p src/components/sections
mkdir -p src/components/templates/marketing
```

**Step 2: Create barrel export for patterns**

Create `src/components/patterns/index.ts`:

```typescript
// Patterns: Composed primitives for reuse across sections
// Import boundary: Can import from ui/*, design-system/*, motion/*

export * from "./SectionHeading"
export * from "./IconBadge"
```

**Step 3: Create barrel export for sections**

Create `src/components/sections/index.ts`:

```typescript
// Sections: Complete page sections for marketing pages
// Import boundary: Can import from patterns/*, ui/*, design-system/*, motion/*

export * from "./HeroSection"
export * from "./FeatureGrid"
export * from "./CTASection"
```

**Step 4: Create barrel export for templates**

Create `src/components/templates/index.ts`:

```typescript
// Templates: Portal-scoped page templates
// Import boundary: Can import from sections/*, patterns/*, ui/*

export * from "./marketing"
```

Create `src/components/templates/marketing/index.ts`:

```typescript
// Marketing portal templates
export * from "./MarketingPageTemplate"
```

**Step 5: Commit**

```bash
git add src/components/patterns src/components/sections src/components/templates
git commit -m "chore: add patterns, sections, templates directory structure"
```

---

## Task 2: Create SectionHeading Pattern (Token-Compliant)

**Files:**

- Create: `src/components/patterns/SectionHeading.tsx`

**Critical:** Uses semantic tokens only — no raw Tailwind palette colors.

**Step 1: Create SectionHeading component**

Create `src/components/patterns/SectionHeading.tsx`:

```typescript
import { cn } from "@/lib/utils"
import { Reveal } from "@/components/motion/Reveal"

interface SectionHeadingProps {
  /** Optional small label above the title */
  label?: string
  /** Main heading text */
  title: string
  /** Optional description below the title */
  description?: string
  /** Text alignment */
  align?: "left" | "center"
  /** Additional classes */
  className?: string
}

/**
 * SectionHeading: Consistent typography pattern for section headers.
 *
 * Uses semantic tokens only:
 * - text-accent for labels (maps to --accent CSS variable)
 * - text-foreground for titles (maps to --text-primary)
 * - text-secondary for descriptions (maps to --text-secondary)
 */
export function SectionHeading({
  label,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal>
      <div
        className={cn(
          "mb-12 max-w-2xl",
          align === "center" && "mx-auto text-center",
          className
        )}
      >
        {label && (
          <span className="text-label-sm text-accent uppercase tracking-wider block mb-3">
            {label}
          </span>
        )}
        <h2 className="text-display-md text-foreground">{title}</h2>
        {description && (
          <p className="text-body-lg text-secondary mt-4">{description}</p>
        )}
      </div>
    </Reveal>
  )
}
```

**Step 2: Update patterns barrel export**

Update `src/components/patterns/index.ts`:

```typescript
export * from "./SectionHeading"
```

**Step 3: Verify token compliance**

Run: `npx eslint src/components/patterns/SectionHeading.tsx --ext .tsx`
Expected: No "hardcoded color" warnings

**Step 4: Commit**

```bash
git add src/components/patterns/SectionHeading.tsx src/components/patterns/index.ts
git commit -m "feat(patterns): add SectionHeading with semantic tokens"
```

---

## Task 3: Create IconBadge Pattern

**Files:**

- Create: `src/components/patterns/IconBadge.tsx`

**Step 1: Create IconBadge component**

Create `src/components/patterns/IconBadge.tsx`:

```typescript
import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

interface IconBadgeProps {
  /** Lucide icon component */
  icon: LucideIcon
  /** Size variant */
  size?: "sm" | "default" | "lg"
  /** Visual variant using semantic tokens */
  variant?: "accent" | "success" | "warning" | "danger" | "info"
  /** Additional classes */
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  default: "h-12 w-12 rounded-xl",
  lg: "h-16 w-16 rounded-2xl",
}

const iconSizeClasses = {
  sm: "h-4 w-4",
  default: "h-6 w-6",
  lg: "h-8 w-8",
}

// Using semantic token CSS variables for theming
const variantClasses = {
  accent: "bg-accent/10 text-accent",
  success: "bg-success-bg text-success-icon",
  warning: "bg-warning-bg text-warning-icon",
  danger: "bg-danger-bg text-danger-icon",
  info: "bg-info-bg text-info-icon",
}

/**
 * IconBadge: Icon in a colored circle pattern.
 *
 * Uses semantic status tokens for consistent theming.
 */
export function IconBadge({
  icon: Icon,
  size = "default",
  variant = "accent",
  className,
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Icon className={iconSizeClasses[size]} />
    </div>
  )
}
```

**Step 2: Update patterns barrel export**

Update `src/components/patterns/index.ts`:

```typescript
export * from "./SectionHeading"
export * from "./IconBadge"
```

**Step 3: Commit**

```bash
git add src/components/patterns/IconBadge.tsx src/components/patterns/index.ts
git commit -m "feat(patterns): add IconBadge with semantic status tokens"
```

---

## Task 4: Create FeatureCard Pattern

**Files:**

- Create: `src/components/patterns/FeatureCard.tsx`

**Step 1: Create FeatureCard component**

Create `src/components/patterns/FeatureCard.tsx`:

```typescript
import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/primitives/card"
import { IconBadge } from "./IconBadge"
import { HoverScale } from "@/components/ui/motion/HoverScale"

interface FeatureCardProps {
  /** Lucide icon component */
  icon: LucideIcon
  /** Card title */
  title: string
  /** Card description */
  description: string
  /** Optional link - makes entire card clickable */
  href?: string
  /** Icon variant */
  iconVariant?: "accent" | "success" | "warning" | "danger" | "info"
  /** Additional classes */
  className?: string
}

/**
 * FeatureCard: Glass card with icon badge, title, and description.
 *
 * Composes: Card (primitive) + IconBadge (pattern) + HoverScale (motion)
 */
export function FeatureCard({
  icon,
  title,
  description,
  href,
  iconVariant = "accent",
  className,
}: FeatureCardProps) {
  const content = (
    <Card variant="glass" className={cn("h-full", className)}>
      <IconBadge icon={icon} variant={iconVariant} className="mb-4" />
      <h3 className="text-heading-md text-foreground">{title}</h3>
      <p className="text-body-sm text-secondary mt-2">{description}</p>
    </Card>
  )

  if (href) {
    return (
      <HoverScale>
        <Link href={href} className="block h-full">
          {content}
        </Link>
      </HoverScale>
    )
  }

  return content
}
```

**Step 2: Update patterns barrel export**

Update `src/components/patterns/index.ts`:

```typescript
export * from "./SectionHeading"
export * from "./IconBadge"
export * from "./FeatureCard"
```

**Step 3: Commit**

```bash
git add src/components/patterns/FeatureCard.tsx src/components/patterns/index.ts
git commit -m "feat(patterns): add FeatureCard composing Card + IconBadge"
```

---

## Task 5: Create HeroSection

**Files:**

- Create: `src/components/sections/HeroSection.tsx`

**Step 1: Create HeroSection component**

Create `src/components/sections/HeroSection.tsx`:

```typescript
"use client"

import { cn } from "@/lib/utils"
import { SectionBackground } from "@/components/ui/patterns/SectionBackground"
import { GradientButton } from "@/components/ui/patterns/GradientButton"
import { Button } from "@/components/ui/primitives/button"
import { Reveal } from "@/components/motion/Reveal"
import Link from "next/link"

interface HeroAction {
  label: string
  href: string
  variant?: "primary" | "secondary"
}

interface HeroSectionProps {
  /** Optional small label above the title */
  label?: string
  /** Main headline */
  title: string
  /** Supporting description */
  description?: string
  /** Call-to-action buttons (max 2 recommended) */
  actions?: HeroAction[]
  /** Background variant */
  backgroundVariant?: "hero" | "gradient" | "dark"
  /** Show animated background elements */
  showOrbs?: boolean
  /** Show grid overlay */
  showGrid?: boolean
  /** Additional content (right panel, illustration, etc.) */
  aside?: React.ReactNode
  /** Additional classes for the container */
  className?: string
}

/**
 * HeroSection: Full-width hero with background effects.
 *
 * Composes: SectionBackground + GradientButton + Button + Reveal
 */
export function HeroSection({
  label,
  title,
  description,
  actions = [],
  backgroundVariant = "hero",
  showOrbs = true,
  showGrid = true,
  aside,
  className,
}: HeroSectionProps) {
  return (
    <SectionBackground
      variant={backgroundVariant}
      showOrbs={showOrbs}
      showGrid={showGrid}
    >
      <div className={cn("mx-auto max-w-7xl px-4 py-24 md:py-32", className)}>
        <div className={cn("grid gap-12", aside && "lg:grid-cols-2 lg:items-center")}>
          <Reveal>
            <div className="max-w-2xl">
              {label && (
                <span className="text-label-sm text-accent uppercase tracking-wider block mb-4">
                  {label}
                </span>
              )}
              <h1 className="text-display-lg text-foreground md:text-display-xl">
                {title}
              </h1>
              {description && (
                <p className="text-body-lg text-secondary mt-6 max-w-xl">
                  {description}
                </p>
              )}
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-8">
                  {actions.map((action, i) =>
                    action.variant === "secondary" ? (
                      <Button key={i} variant="secondary" asChild>
                        <Link href={action.href}>{action.label}</Link>
                      </Button>
                    ) : (
                      <GradientButton key={i} href={action.href}>
                        {action.label}
                      </GradientButton>
                    )
                  )}
                </div>
              )}
            </div>
          </Reveal>

          {aside && (
            <Reveal delay={0.2}>
              <div className="lg:pl-8">{aside}</div>
            </Reveal>
          )}
        </div>
      </div>
    </SectionBackground>
  )
}
```

**Step 2: Update sections barrel export**

Update `src/components/sections/index.ts`:

```typescript
export * from "./HeroSection"
```

**Step 3: Commit**

```bash
git add src/components/sections/HeroSection.tsx src/components/sections/index.ts
git commit -m "feat(sections): add HeroSection with SectionBackground composition"
```

---

## Task 6: Create FeatureGrid Section

**Files:**

- Create: `src/components/sections/FeatureGrid.tsx`

**Step 1: Create FeatureGrid component**

Create `src/components/sections/FeatureGrid.tsx`:

```typescript
"use client"

import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"
import { SectionHeading } from "@/components/patterns/SectionHeading"
import { FeatureCard } from "@/components/patterns/FeatureCard"
import { Stagger, StaggerItem } from "@/components/motion/Stagger"
import { Reveal } from "@/components/motion/Reveal"

interface FeatureItem {
  icon: LucideIcon
  title: string
  description: string
  href?: string
  iconVariant?: "accent" | "success" | "warning" | "danger" | "info"
}

interface FeatureGridProps {
  /** Optional section label */
  label?: string
  /** Section title */
  title: string
  /** Optional section description */
  description?: string
  /** Feature items */
  items: FeatureItem[]
  /** Number of columns at large breakpoint */
  columns?: 2 | 3 | 4
  /** Center the heading */
  centerHeading?: boolean
  /** Additional classes */
  className?: string
}

const columnClasses = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

/**
 * FeatureGrid: Section with heading and grid of feature cards.
 *
 * Composes: SectionHeading + FeatureCard + Stagger animations
 */
export function FeatureGrid({
  label,
  title,
  description,
  items,
  columns = 3,
  centerHeading = false,
  className,
}: FeatureGridProps) {
  return (
    <section className={cn("py-24", className)}>
      <div className="mx-auto max-w-7xl px-4">
        <Reveal>
          <SectionHeading
            label={label}
            title={title}
            description={description}
            align={centerHeading ? "center" : "left"}
          />
        </Reveal>

        <Stagger className={cn("grid gap-6 md:grid-cols-2", columnClasses[columns])}>
          {items.map((item, i) => (
            <StaggerItem key={i}>
              <FeatureCard
                icon={item.icon}
                title={item.title}
                description={item.description}
                href={item.href}
                iconVariant={item.iconVariant}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
```

**Step 2: Update sections barrel export**

Update `src/components/sections/index.ts`:

```typescript
export * from "./HeroSection"
export * from "./FeatureGrid"
```

**Step 3: Commit**

```bash
git add src/components/sections/FeatureGrid.tsx src/components/sections/index.ts
git commit -m "feat(sections): add FeatureGrid with staggered animations"
```

---

## Task 7: Create CTASection

**Files:**

- Create: `src/components/sections/CTASection.tsx`

**Step 1: Create CTASection component**

Create `src/components/sections/CTASection.tsx`:

```typescript
"use client"

import { cn } from "@/lib/utils"
import { SectionBackground } from "@/components/ui/patterns/SectionBackground"
import { GradientButton } from "@/components/ui/patterns/GradientButton"
import { Button } from "@/components/ui/primitives/button"
import { Reveal } from "@/components/motion/Reveal"
import Link from "next/link"

interface CTAAction {
  label: string
  href: string
  variant?: "primary" | "secondary"
}

interface CTASectionProps {
  /** Main headline */
  title: string
  /** Supporting description */
  description?: string
  /** Call-to-action buttons */
  actions: CTAAction[]
  /** Optional content for right side (testimonial, image, etc.) */
  aside?: React.ReactNode
  /** Background variant */
  backgroundVariant?: "gradient" | "hero" | "dark"
  /** Additional classes */
  className?: string
}

/**
 * CTASection: Full-width call-to-action section.
 *
 * Composes: SectionBackground + GradientButton + Button + Reveal
 */
export function CTASection({
  title,
  description,
  actions,
  aside,
  backgroundVariant = "gradient",
  className,
}: CTASectionProps) {
  return (
    <SectionBackground variant={backgroundVariant}>
      <div className={cn("mx-auto max-w-7xl px-4 py-24", className)}>
        <div className={cn("grid gap-12", aside && "lg:grid-cols-2 lg:items-center")}>
          <Reveal>
            <div>
              <h2 className="text-display-md text-foreground">{title}</h2>
              {description && (
                <p className="text-body-lg text-secondary mt-4 max-w-xl">
                  {description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-8">
                {actions.map((action, i) =>
                  action.variant === "secondary" ? (
                    <Button key={i} variant="secondary" asChild>
                      <Link href={action.href}>{action.label}</Link>
                    </Button>
                  ) : (
                    <GradientButton key={i} href={action.href}>
                      {action.label}
                    </GradientButton>
                  )
                )}
              </div>
            </div>
          </Reveal>

          {aside && (
            <Reveal delay={0.2}>
              <div>{aside}</div>
            </Reveal>
          )}
        </div>
      </div>
    </SectionBackground>
  )
}
```

**Step 2: Update sections barrel export**

Update `src/components/sections/index.ts`:

```typescript
export * from "./HeroSection"
export * from "./FeatureGrid"
export * from "./CTASection"
```

**Step 3: Commit**

```bash
git add src/components/sections/CTASection.tsx src/components/sections/index.ts
git commit -m "feat(sections): add CTASection for conversion blocks"
```

---

## Task 8: Create MarketingPageTemplate

**Files:**

- Create: `src/components/templates/marketing/MarketingPageTemplate.tsx`

**Step 1: Create MarketingPageTemplate**

Create `src/components/templates/marketing/MarketingPageTemplate.tsx`:

```typescript
import { type ComponentProps } from "react"
import { HeroSection } from "@/components/sections/HeroSection"
import { FeatureGrid } from "@/components/sections/FeatureGrid"
import { CTASection } from "@/components/sections/CTASection"

interface MarketingPageTemplateProps {
  /** Hero section props */
  hero: ComponentProps<typeof HeroSection>
  /** Optional feature grid sections (can have multiple) */
  featureSections?: ComponentProps<typeof FeatureGrid>[]
  /** Optional CTA section */
  cta?: ComponentProps<typeof CTASection>
  /** Additional sections to render between features and CTA */
  children?: React.ReactNode
}

/**
 * MarketingPageTemplate: Standard marketing page layout.
 *
 * Portal-scoped to (marketing) route group.
 * Pages become configuration, not layout code.
 */
export function MarketingPageTemplate({
  hero,
  featureSections = [],
  cta,
  children,
}: MarketingPageTemplateProps) {
  return (
    <>
      <HeroSection {...hero} />

      {featureSections.map((section, i) => (
        <FeatureGrid key={i} {...section} />
      ))}

      {children}

      {cta && <CTASection {...cta} />}
    </>
  )
}
```

**Step 2: Update templates barrel exports**

Update `src/components/templates/marketing/index.ts`:

```typescript
export * from "./MarketingPageTemplate"
```

Update `src/components/templates/index.ts`:

```typescript
export * from "./marketing"
```

**Step 3: Commit**

```bash
git add src/components/templates/
git commit -m "feat(templates): add MarketingPageTemplate for marketing portal"
```

---

## Task 9: Add ESLint Import Boundary Rules

**Files:**

- Modify: `.eslintrc.json` or `eslint.config.js`

**Step 1: Install eslint-plugin-import if not present**

```bash
npm list eslint-plugin-import || npm install -D eslint-plugin-import
```

**Step 2: Add import boundary rules**

Add to ESLint config (adjust based on existing config format):

```javascript
// Add to rules section
{
  "import/no-restricted-paths": [
    "error",
    {
      "zones": [
        // Primitives cannot import from patterns, sections, or templates
        {
          "target": "./src/components/ui/**/*",
          "from": "./src/components/patterns/**/*",
          "message": "Primitives cannot import from patterns. Use tokens or lib/utils only."
        },
        {
          "target": "./src/components/ui/**/*",
          "from": "./src/components/sections/**/*",
          "message": "Primitives cannot import from sections."
        },
        {
          "target": "./src/components/ui/**/*",
          "from": "./src/components/templates/**/*",
          "message": "Primitives cannot import from templates."
        },
        // Patterns cannot import from sections or templates
        {
          "target": "./src/components/patterns/**/*",
          "from": "./src/components/sections/**/*",
          "message": "Patterns cannot import from sections."
        },
        {
          "target": "./src/components/patterns/**/*",
          "from": "./src/components/templates/**/*",
          "message": "Patterns cannot import from templates."
        },
        // Sections cannot import from templates
        {
          "target": "./src/components/sections/**/*",
          "from": "./src/components/templates/**/*",
          "message": "Sections cannot import from templates."
        },
        // Pages should not import sections/patterns directly (prefer templates)
        {
          "target": "./src/app/**/*",
          "from": "./src/components/sections/**/*",
          "message": "Pages should import templates, not sections directly. Create a template if needed.",
          "except": ["./src/app/**/components/**/*"]
        }
      ]
    }
  ]
}
```

**Step 3: Test the rules**

```bash
npx eslint src/components/patterns/ src/components/sections/ src/components/templates/ --ext .tsx
```

**Step 4: Commit**

```bash
git add .eslintrc.json package.json package-lock.json
git commit -m "chore: add ESLint import boundary rules for component layers"
```

---

## Task 10: Create Example Page Using Template

**Files:**

- Create: `src/app/(marketing)/example-template/page.tsx`

**Purpose:** Prove the pattern works. Delete after verification.

**Step 1: Create example page**

Create `src/app/(marketing)/example-template/page.tsx`:

```typescript
import { MarketingPageTemplate } from "@/components/templates"
import { Receipt, Building2, CreditCard, FileText } from "lucide-react"

export const metadata = {
  title: "Template Example | FiskAI",
  description: "Example page using MarketingPageTemplate",
}

// The page is now just configuration
export default function ExampleTemplatePage() {
  return (
    <MarketingPageTemplate
      hero={{
        label: "Template Demo",
        title: "Pages Are Now Configuration",
        description: "This entire page is defined by passing props to a template. Zero layout code in page.tsx.",
        actions: [
          { label: "Primary Action", href: "#", variant: "primary" },
          { label: "Secondary Action", href: "#", variant: "secondary" },
        ],
      }}
      featureSections={[
        {
          label: "Features",
          title: "What You Get",
          description: "Every feature card uses the same pattern, ensuring visual consistency.",
          items: [
            {
              icon: Receipt,
              title: "Fiscalization",
              description: "Automatic JIR/ZKI for every invoice.",
              href: "/features/fiscalization",
            },
            {
              icon: Building2,
              title: "Bank Sync",
              description: "Connect to all major Croatian banks.",
              href: "/features/banking",
            },
            {
              icon: CreditCard,
              title: "Payments",
              description: "Track payments and reconcile automatically.",
              href: "/features/payments",
            },
            {
              icon: FileText,
              title: "Reports",
              description: "Generate tax-ready reports instantly.",
              href: "/features/reports",
            },
          ],
          columns: 2,
        },
      ]}
      cta={{
        title: "Ready to Start?",
        description: "Join thousands of Croatian businesses using FiskAI.",
        actions: [
          { label: "Get Started Free", href: "/register", variant: "primary" },
        ],
      }}
    />
  )
}
```

**Step 2: Test the page**

```bash
npm run dev
# Visit http://localhost:3000/example-template
```

**Step 3: Commit**

```bash
git add src/app/\(marketing\)/example-template/
git commit -m "feat: add example page demonstrating MarketingPageTemplate"
```

---

## Summary

After completing all tasks:

1. **New directories:** `patterns/`, `sections/`, `templates/marketing/`
2. **New patterns:** SectionHeading, IconBadge, FeatureCard
3. **New sections:** HeroSection, FeatureGrid, CTASection
4. **New template:** MarketingPageTemplate
5. **ESLint boundaries:** Import restrictions enforced
6. **Example page:** Proof that pages are now configuration

**Next steps after this plan:**

- Migrate existing marketing pages to use templates
- Add more sections (FAQSection, TestimonialSection, ComparisonSection)
- Create ContentPageTemplate for knowledge hub pages
