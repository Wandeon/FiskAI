# AGENTS.md - Agent Instructions

Instructions for AI agents working on FiskAI-App.

---

## Definition of Done

A feature is **NOT DONE** until ALL of these are true:

### Code Quality
- [ ] No TODO comments in feature code
- [ ] No FIXME comments
- [ ] No placeholder values or hardcoded test data
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] No "temporary" solutions

### Functionality
- [ ] All error states handled
- [ ] All loading states handled
- [ ] All empty states handled
- [ ] Works on mobile (375px)
- [ ] Works on desktop

### Testing
- [ ] Unit tests written
- [ ] Tests passing
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes (when configured)

### Documentation
- [ ] Code is self-documenting (clear names)
- [ ] Complex logic has comments
- [ ] New features documented in CHANGELOG.md

---

## Banned Phrases

Never use these when reporting completion:

```
❌ "Feature is done, just needs..."     → NOT DONE
❌ "Works, but I'll clean up..."        → NOT DONE
❌ "TODO: handle edge case"             → NOT DONE
❌ "Placeholder for now"                → NOT DONE
❌ "Will add tests later"               → NOT DONE
❌ "Quick fix, refactor later"          → NOT DONE
❌ "Should work"                        → VERIFY IT WORKS
❌ "TS errors are preexisting"          → FIX THEM
```

---

## Completion Report Format

When completing a task, provide:

```markdown
## Completion Report

### Files Changed
- [list of files created/modified]

### Tests
- [X tests added, Y passing]

### Verification
- `pnpm typecheck` output: [PASS/FAIL]
- `pnpm build` output: [PASS/FAIL]
- Manual testing: [description]

### Remaining Work
- [None / list of follow-up tasks]
```

---

## Before Starting Any Task

1. Read CLAUDE.md for project rules
2. Read docs/ROADMAP.md to understand current phase
3. Check what's in scope for current sprint
4. If task is not in current sprint, ask before proceeding

---

## File Organization Rules

| Type | Location |
|------|----------|
| React components | `apps/web/src/components/` |
| Page routes | `apps/web/src/app/` |
| API routes | `apps/web/src/app/api/` |
| tRPC routers | `packages/trpc/src/routers/` |
| Zod schemas | `packages/shared/src/schemas/` |
| Utilities | `packages/shared/src/` |
| UI primitives | `packages/ui/src/components/` |
| Database | `packages/db/` |

---

## Commit Messages

Use conventional commits:

```
type(scope): description

feat(invoice): add invoice creation form
fix(auth): resolve session timeout
chore(deps): update dependencies
docs(readme): add installation steps
test(invoice): add unit tests for creation
refactor(ui): simplify button component
```

Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`

---

## Error Handling Pattern

Always handle errors explicitly:

```typescript
// GOOD
try {
  const result = await api.createInvoice(data);
  toast.success('Račun kreiran');
  return result;
} catch (error) {
  toast.error(getErrorMessage(error));
  throw error;
}

// BAD
const result = await api.createInvoice(data); // No error handling
```

---

## Croatian Language Notes

- Use Croatian in user-facing strings
- Date format: "29. siječnja 2026."
- Number format: "1.000,00" (not "1,000.00")
- Currency: EUR
- Common terms:
  - Račun = Invoice
  - Kupac = Customer
  - Dobavljač = Supplier
  - OIB = Tax ID
  - PDV = VAT
  - Poslovni prostor = Business premises
  - Naplatni uređaj = Payment device
