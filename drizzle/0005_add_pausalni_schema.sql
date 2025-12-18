-- Migration: 0005_add_pausalni_schema
-- Create paušalni compliance hub tables

-- Paušalni profile for each company
CREATE TABLE IF NOT EXISTS "pausalni_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"has_pdv_id" boolean DEFAULT false,
	"pdv_id" varchar(20),
	"pdv_id_since" date,
	"eu_active" boolean DEFAULT false,
	"hok_member_since" date,
	"tourism_activity" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "pausalni_profile_company_idx" ON "pausalni_profile" ("company_id");

-- Known EU vendors (pre-loaded + learned)
CREATE TABLE IF NOT EXISTS "eu_vendor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_pattern" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"vendor_type" varchar(50) NOT NULL,
	"is_eu" boolean DEFAULT true,
	"confidence_score" integer DEFAULT 100,
	"is_system" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "eu_vendor_pattern_idx" ON "eu_vendor" ("name_pattern");

-- Payment obligations (monthly doprinosi, quarterly porez, etc.)
CREATE TABLE IF NOT EXISTS "payment_obligation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"obligation_type" varchar(50) NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"paid_date" date,
	"paid_amount" numeric(10, 2),
	"matched_transaction_id" uuid,
	"match_type" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_obligation_company_status_idx" ON "payment_obligation" ("company_id", "status");
CREATE INDEX IF NOT EXISTS "payment_obligation_due_date_idx" ON "payment_obligation" ("due_date");

-- EU transactions requiring PDV reporting
CREATE TABLE IF NOT EXISTS "eu_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"bank_transaction_id" uuid,
	"direction" varchar(20) NOT NULL,
	"counterparty_name" varchar(255),
	"counterparty_country" varchar(2),
	"counterparty_vat_id" varchar(20),
	"transaction_date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"pdv_rate" numeric(4, 2) DEFAULT '25.00',
	"pdv_amount" numeric(10, 2),
	"reporting_month" integer NOT NULL,
	"reporting_year" integer NOT NULL,
	"vendor_id" uuid,
	"detection_method" varchar(20),
	"confidence_score" integer,
	"user_confirmed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "eu_transaction_reporting_idx" ON "eu_transaction" ("company_id", "reporting_year", "reporting_month");

-- Generated forms history
CREATE TABLE IF NOT EXISTS "generated_form" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"form_type" varchar(20) NOT NULL,
	"period_month" integer,
	"period_year" integer NOT NULL,
	"format" varchar(10) NOT NULL,
	"file_path" varchar(500),
	"file_hash" varchar(64),
	"form_data" jsonb,
	"submitted_to_porezna" boolean DEFAULT false,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS "notification_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT true,
	"remind_7_days" boolean DEFAULT true,
	"remind_3_days" boolean DEFAULT true,
	"remind_1_day" boolean DEFAULT true,
	"remind_day_of" boolean DEFAULT true,
	"google_calendar_connected" boolean DEFAULT false,
	"google_calendar_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
