// src/lib/db/schema/newsletter.ts
import { pgTable, uuid, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core"

export const newsletterSubscriptions = pgTable(
  "newsletter_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    isActive: boolean("is_active").default(true).notNull(),
    source: varchar("source", { length: 100 }).default("vijesti_sidebar"), // Track where signup came from
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_newsletter_email").on(table.email),
    index("idx_newsletter_active").on(table.isActive),
  ]
)

// Export types
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect
export type NewNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert
