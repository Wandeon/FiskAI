# FiskAI Project Notes

## Deployment

**Coolify Dashboard:** https://git.metrica.hr

**Deploy API Endpoint:**

```
POST http://152.53.146.3:8000/api/v1/deploy?uuid=bsswgo8ggwgkw8c88wo8wcw8&force=false
Authorization: Bearer <token>
```

**GitHub Webhook URL (for auto-deploy on push):**

```
http://152.53.146.3:8000/webhooks/source/github/events/manual
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
