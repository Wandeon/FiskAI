// src/lib/db/schema/regulatory-companion.ts
import { pgTable, uuid, varchar, timestamp, text, index, inet } from "drizzle-orm/pg-core"

/**
 * Business type enum values for regulatory companion subscribers
 * These correspond to the business entity types in Croatia
 */
export const BUSINESS_TYPES = [
  "pausalni",
  "obrt-dohodak",
  "doo",
  "freelancer",
  "razmisljam",
] as const
export type BusinessType = (typeof BUSINESS_TYPES)[number]

/**
 * Regulatory Companion subscribers table
 * Stores newsletter-style subscriptions for regulatory updates from the marketing site
 * These users have NOT created accounts - they're just interested in updates
 */
export const regulatoryCompanionSubscribers = pgTable(
  "regulatory_companion_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    businessType: varchar("business_type", { length: 50 }).notNull(),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    source: varchar("source", { length: 50 }).default("marketing-site"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("idx_rc_subscribers_email").on(table.email),
    index("idx_rc_subscribers_business_type").on(table.businessType),
  ]
)

// Export types
export type RegulatoryCompanionSubscriber = typeof regulatoryCompanionSubscribers.$inferSelect
export type NewRegulatoryCompanionSubscriber = typeof regulatoryCompanionSubscribers.$inferInsert
