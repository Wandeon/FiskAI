// src/lib/db/schema/deadlines.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core"

export const complianceDeadlines = pgTable(
  "compliance_deadlines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    deadlineDate: date("deadline_date").notNull(),
    deadlineType: varchar("deadline_type", { length: 50 }).notNull(), // 'tax', 'reporting', 'registration', 'regulatory'

    // Targeting - which business types this applies to
    appliesTo: jsonb("applies_to").notNull().default(["all"]),

    // Recurrence
    recurrence: varchar("recurrence", { length: 20 }), // 'monthly', 'quarterly', 'yearly', null for one-time
    recurrenceDay: integer("recurrence_day"),

    // Metadata
    sourceUrl: varchar("source_url", { length: 500 }),
    sourceName: varchar("source_name", { length: 100 }),
    severity: varchar("severity", { length: 20 }).default("normal"), // 'critical', 'high', 'normal', 'low'

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_deadlines_date").on(table.deadlineDate),
    index("idx_deadlines_type").on(table.deadlineType),
  ]
)

export type ComplianceDeadline = typeof complianceDeadlines.$inferSelect
export type NewComplianceDeadline = typeof complianceDeadlines.$inferInsert
