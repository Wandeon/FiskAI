# News Article Structured Sections - Visual Guide

## Overview

The news article template now includes four standardized, visually distinct sections that help readers quickly find the information they need.

## Section Flow

```
┌─────────────────────────────────────────┐
│         Article Header                   │
│  • Category Badge                        │
│  • Title                                 │
│  • Meta Info (date, impact level)        │
│  • Featured Image                        │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  ⚡ TL;DR — Brzi pregled    [BLUE]       │
│  Quick summary of the article            │
│  • Key takeaways                         │
│  • Most important information            │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         Main Article Content             │
│  Full article text, analysis, details    │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  ✓ Što napraviti            [GREEN]      │
│  Action checklist:                       │
│  ✓ First action item                     │
│  ✓ Second action item                    │
│  ✓ Third action item                     │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  🔧 Povezani alati          [CYAN]       │
│  Grid of related tool links:             │
│  [Tool 1]  [Tool 2]                      │
│  [Tool 3]  [Tool 4]                      │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  🔗 Izvori                  [PURPLE]     │
│  Source attribution:                     │
│  • Original article title                │
│  • Source website                        │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         Srodne vijesti                   │
│  Related news articles grid              │
└─────────────────────────────────────────┘
```

## Visual Design

### Color Scheme & Purpose

| Section            | Color                           | Icon            | Purpose                          |
| ------------------ | ------------------------------- | --------------- | -------------------------------- |
| **TL;DR**          | Blue (`border-blue-500/20`)     | ⚡ Zap          | Quick overview for busy readers  |
| **Što napraviti**  | Green (`border-emerald-500/20`) | ✓ CheckCircle   | Actionable next steps            |
| **Povezani alati** | Cyan (`border-cyan-500/20`)     | 🔧 Wrench       | Links to helpful tools           |
| **Izvori**         | Purple (`border-purple-500/20`) | 🔗 ExternalLink | Source attribution & credibility |

### Common Design Pattern

All sections follow this consistent pattern:

```
┌────────────────────────────────────────────────────┐
│  ┌──────┐                                          │
│  │ ICON │  Section Title                           │
│  └──────┘                                          │
│           Section content goes here...             │
│           • Item 1                                 │
│           • Item 2                                 │
└────────────────────────────────────────────────────┘
```

**Design Elements:**

- Rounded corners (`rounded-xl`)
- Subtle borders with color-coded accents
- Gradient background (`bg-gradient-to-br`)
- Icon in colored badge (40×40px, `rounded-lg`)
- Consistent padding (`p-6`)
- Shadow (`shadow-sm`)

### Responsive Behavior

- **Mobile**: Single column layout
- **Tablet+**: Related Tools displays in 2-column grid
- All sections maintain full width on mobile
- Touch-friendly hover states

## Dark Theme Optimization

All sections are designed for the dark theme with:

- Low opacity backgrounds (`/10` opacity)
- Subtle borders (`/20` opacity)
- High contrast text (white, color accents)
- Smooth transitions on interactive elements

## Implementation Notes

### Automatic Extraction

The template automatically extracts sections from markdown:

```markdown
## TL;DR

Content here...

## Što napraviti

- Action 1
- Action 2

## Povezani alati

[Tool Name](url)
```

### Graceful Degradation

- Sections are optional
- Articles render normally without them
- No errors if sections are missing
- Content is automatically removed from main body to avoid duplication

### Parser Logic

1. **Regex Pattern Matching**: Finds `## TL;DR`, `## Što napraviti`, `## Povezani alati`
2. **Content Extraction**: Captures everything until next heading
3. **List Parsing**: Converts markdown lists to array items
4. **Link Parsing**: Extracts `[text](url)` patterns
5. **Deduplication**: Removes sections from main content

## Content Guidelines

### TL;DR

- 2-4 sentences maximum
- Focus on the "So What?"
- Include key numbers/dates
- Answer: What changed and why it matters?

### Što napraviti

- 3-7 action items
- Specific and actionable
- Ordered by priority/urgency
- Include deadlines where relevant

### Povezani alati

- 2-6 related tools
- Direct links to `/alati/*` pages
- Most relevant tools first
- Tools that help implement the action items

### Izvori

- Automatically generated from database
- Shows original article titles
- Links to source websites
- Provides credibility and transparency
