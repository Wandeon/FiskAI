CREATE TABLE "compliance_deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"deadline_date" date NOT NULL,
	"deadline_type" varchar(50) NOT NULL,
	"applies_to" jsonb DEFAULT '["all"]'::jsonb NOT NULL,
	"recurrence" varchar(20),
	"recurrence_day" integer,
	"source_url" varchar(500),
	"source_name" varchar(100),
	"severity" varchar(20) DEFAULT 'normal',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_deadlines_date" ON "compliance_deadlines" USING btree ("deadline_date");--> statement-breakpoint
CREATE INDEX "idx_deadlines_type" ON "compliance_deadlines" USING btree ("deadline_type");