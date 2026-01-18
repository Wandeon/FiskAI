CREATE TABLE "regulatory_companion_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"business_type" varchar(50) NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"unsubscribed_at" timestamp with time zone,
	"source" varchar(50) DEFAULT 'marketing-site',
	"ip_address" inet,
	"user_agent" text
);
--> statement-breakpoint
CREATE INDEX "idx_rc_subscribers_email" ON "regulatory_companion_subscribers" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "idx_rc_subscribers_business_type" ON "regulatory_companion_subscribers" USING btree ("business_type");
