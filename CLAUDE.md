# FiskAI Project Notes

## Deployment

**Coolify Dashboard:** https://git.metrica.hr

**Deploy API Endpoint:**

```
POST https://git.metrica.hr/api/v1/deploy?uuid=yosgwcswc8w88gg8wocwogok&force=false
Authorization: Bearer <token>
```

**Note:** Token needs to be obtained from Coolify dashboard if expired.

## Tech Stack

- Next.js 14 App Router
- Drizzle ORM + PostgreSQL
- CVA design system
- Tailwind CSS

## Key Directories

- `/content/vodici/` - MDX guides
- `/content/usporedbe/` - MDX comparisons
- `/docs/plans/` - Implementation plans
- `/src/components/ui/patterns/` - Design system components (SectionBackground, GlassCard, etc.)
