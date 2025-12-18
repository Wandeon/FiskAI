# Adaptive Guidance System - Design Document

> **Status:** Design Complete | **Date:** 2025-12-18

## Problem Statement

Many FiskAI users, especially paušalni obrtnici, are "clueless about what they need to do and what they should pay attention to." They don't know what they don't know. Current competitors provide tools but leave users to figure out compliance on their own.

**Our differentiator:** "Be with them every step of the way" - a complete compliance assistant that adapts to user expertise.

## Design Overview

### Competence Model: 3 Levels × 3 Categories

Users independently set their experience level for each business domain:

| Category          | Scope                                                  |
| ----------------- | ------------------------------------------------------ |
| **Fakturiranje**  | Invoicing, e-računi, fiskalizacija, contacts, products |
| **Financije**     | Taxes, contributions (doprinosi), banking, PO-SD       |
| **EU poslovanje** | VAT thresholds, EU sales, OSS registration, VIES       |

**Levels:**

- **Beginner (Početnik):** Full guidance, proactive help
- **Average (Srednji):** Clean UI with safety net
- **Pro (Profesionalac):** Speed and density, minimal interruptions

### Setting Competence Levels

Users can adjust their levels at multiple touchpoints:

1. **Onboarding wizard** - Initial setup with category-by-category selection
2. **Settings page** - Full control in `/settings/guidance`
3. **Quick-toggle** - Header/sidebar dropdown for fast switching

---

## Mode Specifications

### Beginner Mode

**Philosophy:** Hand-holding compliance assistant. Never let them miss anything.

| Feature                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| Monthly Checklist       | "Što moram napraviti?" - prioritized task list  |
| Proactive Notifications | Alerts 7/3/1 days before deadlines              |
| Step-by-step Wizards    | Guided flows for invoices, PO-SD, contributions |
| Tooltips                | "Što je ovo?" icons throughout UI               |
| Contextual Explanations | Inline help text on complex screens             |
| AI Chat Assistant       | Natural language help (separate feature)        |

### Average Mode

**Philosophy:** Clean interface with safety net for risky actions.

| Feature             | Description                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Standard UI         | Default component sizing and spacing                                                        |
| Safety Net Triggers | Help appears for: first-time actions, large amounts, deadline proximity, error-prone fields |
| Help Buttons        | Visible "Pomozi mi" / "?" buttons                                                           |
| On-demand Guides    | Access to full documentation                                                                |

**Safety net triggers on:**

- First time performing an action
- Unusually large amounts (>2x average)
- Actions within 3 days of deadline
- Fields with high error rates

### Pro Mode

**Philosophy:** Maximum efficiency for experienced users.

| Feature                     | Description                               |
| --------------------------- | ----------------------------------------- |
| Dense UI                    | Compact spacing, more data per screen     |
| Critical-only Notifications | Only overdue/urgent items                 |
| Skip Wizards                | Direct forms, no hand-holding             |
| Keyboard Shortcuts          | Cmd+K palette, hotkeys for common actions |
| Hidden Tooltips             | Show only on explicit hover               |
| Bulk Operations             | Multi-select, batch processing            |

---

## Monthly Checklist Hub

**The killer feature** - A unified view of everything the user needs to do this month.

### Locations

| Location                | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| **Dashboard Widget**    | Primary view, top of dashboard           |
| **Dedicated Page**      | `/checklist` - full management interface |
| **Notification Center** | Badge count, quick preview               |
| **Sidebar Mini-view**   | Collapsible progress indicator           |

### Data Sources

The checklist aggregates from multiple systems:

1. **Deadlines from Calendar**
   - PO-SD quarterly submissions
   - Monthly contribution payments
   - HOK quarterly fees
   - VAT registration thresholds

2. **Unpaid Obligations**
   - Pending doprinosi payments
   - Overdue invoices to collect
   - Tax liabilities

3. **Pending Actions**
   - Draft invoices to complete
   - Unsigned documents
   - Incomplete contact records

4. **Onboarding Gaps**
   - Missing company data (OIB, address)
   - Unconfigured e-invoice provider
   - No products/contacts added

5. **Seasonal/Annual Tasks**
   - Annual PO-SD summary
   - JOPPD submissions
   - HOK membership renewal

6. **Smart Suggestions**
   - AI-detected patterns (e.g., "You usually invoice Client X around this time")
   - Revenue threshold warnings
   - Compliance recommendations

### Checklist Item Structure

```typescript
interface ChecklistItem {
  id: string
  category: "fakturiranje" | "financije" | "eu"
  type: "deadline" | "payment" | "action" | "onboarding" | "seasonal" | "suggestion"

  title: string
  description: string

  dueDate?: Date
  urgency: "critical" | "soon" | "upcoming" | "optional"

  action: {
    type: "link" | "wizard" | "quick-action"
    href?: string
    wizardId?: string
    quickAction?: () => void
  }

  completedAt?: Date
  dismissedAt?: Date
  snoozedUntil?: Date
}
```

### Urgency Levels

| Level        | Visual    | Criteria                 |
| ------------ | --------- | ------------------------ |
| **Critical** | 🔴 Red    | Overdue or due today     |
| **Soon**     | 🟡 Yellow | Due within 3 days        |
| **Upcoming** | 🔵 Blue   | Due within 7 days        |
| **Optional** | ⚪ Gray   | Suggestions, no deadline |

---

## Notification System

### Channels (Future consideration)

- **In-app** - Badge counts, toast notifications
- **Email** - Daily/weekly digest, urgent alerts
- **Push** - Mobile app (future)

### Notification Rules by Level

| Event                  | Beginner | Average | Pro |
| ---------------------- | -------- | ------- | --- |
| 7 days before deadline | ✅       | ❌      | ❌  |
| 3 days before deadline | ✅       | ✅      | ❌  |
| 1 day before deadline  | ✅       | ✅      | ✅  |
| Deadline day           | ✅       | ✅      | ✅  |
| Overdue                | ✅       | ✅      | ✅  |
| Smart suggestions      | ✅       | ❌      | ❌  |
| Onboarding reminders   | ✅       | ✅      | ❌  |

---

## UI Components

### 1. Competence Selector

```
┌─────────────────────────────────────────────────────────┐
│  Razina iskustva                                        │
├─────────────────────────────────────────────────────────┤
│  Fakturiranje     [Početnik] [Srednji] [Pro]           │
│  Financije        [Početnik] [Srednji] [Pro]           │
│  EU poslovanje    [Početnik] [Srednji] [Pro]           │
└─────────────────────────────────────────────────────────┘
```

### 2. Dashboard Checklist Widget

```
┌─────────────────────────────────────────────────────────┐
│  📋 Što moram napraviti?                    Prosinac '25│
├─────────────────────────────────────────────────────────┤
│  🔴 Doprinosi za studeni - plaćanje         Danas!     │
│     └─ [Generiraj uplatnicu]                           │
│                                                         │
│  🟡 PO-SD Q4 - priprema                     Za 5 dana  │
│     └─ [Otvori wizard]                                 │
│                                                         │
│  🔵 Provjeri limite PDV-a                   Za 12 dana │
│     └─ [Vidi detalje]                                  │
│                                                         │
│  ──────────────────────────────────────────────────────│
│  ✅ 3 dovršeno ovaj mjesec          [Vidi sve →]       │
└─────────────────────────────────────────────────────────┘
```

### 3. Sidebar Mini-view

```
┌──────────────┐
│ 📋 3 zadatka │
│ ████████░░░░ │
│    75%       │
└──────────────┘
```

### 4. Quick Toggle (Header)

```
[👤 ▾] → Dropdown:
  ─────────────────
  Razina pomoći:
  ○ Početnik
  ● Srednji
  ○ Pro
  ─────────────────
  [Prilagodi po kategoriji →]
```

---

## Implementation Phases

### Phase 1: Foundation

- [ ] Database schema for user preferences (competence levels)
- [ ] Checklist data aggregation service
- [ ] Basic checklist API endpoints

### Phase 2: Core UI

- [ ] Competence selector component
- [ ] Dashboard checklist widget
- [ ] Dedicated checklist page

### Phase 3: Mode Differentiation

- [ ] Beginner: Enable all tooltips, wizards, notifications
- [ ] Average: Safety net triggers
- [ ] Pro: Dense UI variant, keyboard shortcuts

### Phase 4: Sidebar & Notifications

- [ ] Sidebar mini-view
- [ ] Notification center integration
- [ ] Email digest system

### Phase 5: Intelligence

- [ ] Smart suggestions engine
- [ ] Pattern detection
- [ ] AI chat integration

---

## Database Schema

```sql
-- User guidance preferences
CREATE TABLE user_guidance_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Competence levels per category (beginner, average, pro)
  level_fakturiranje VARCHAR(20) DEFAULT 'beginner',
  level_financije VARCHAR(20) DEFAULT 'beginner',
  level_eu VARCHAR(20) DEFAULT 'beginner',

  -- Global quick-set (overrides per-category if set)
  global_level VARCHAR(20),

  -- Notification preferences
  email_digest VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, none
  push_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist item completions/dismissals
CREATE TABLE checklist_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  item_type VARCHAR(50) NOT NULL,
  item_reference VARCHAR(100) NOT NULL, -- e.g., "deadline:posd:2025-Q4"

  action VARCHAR(20) NOT NULL, -- completed, dismissed, snoozed
  snoozed_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_user_company ON checklist_interactions(user_id, company_id);
CREATE INDEX idx_checklist_reference ON checklist_interactions(item_reference);
```

---

## Success Metrics

1. **Deadline compliance rate** - % of obligations paid on time
2. **Checklist engagement** - Daily/weekly active users viewing checklist
3. **Task completion rate** - % of checklist items completed vs dismissed
4. **Mode distribution** - How users self-select (expect: 60% beginner, 30% average, 10% pro)
5. **Support ticket reduction** - "How do I..." questions should decrease

---

## Open Questions

1. Should competence levels affect data visibility, or just UI/UX treatment?
2. How do we handle users who outgrow beginner mode? (Suggest upgrade?)
3. Should the checklist show completed items for satisfaction, or hide them?
4. How aggressive should smart suggestions be? (Risk of notification fatigue)

---

## References

- Existing deadline system: `/src/lib/deadlines/`
- Payment obligations: `/src/lib/pausalni/obligation-generator.ts`
- Dashboard page: `/src/app/(dashboard)/dashboard/page.tsx`
- Onboarding checklist: Already exists in dashboard, can be extended
