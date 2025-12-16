CREATE TABLE "news_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text,
	"url" varchar(1000) NOT NULL,
	"published_at" timestamp with time zone,
	"summary_hr" text,
	"categories" jsonb DEFAULT '[]'::jsonb,
	"relevance_score" integer,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news_sources" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"url" varchar(500) NOT NULL,
	"feed_type" varchar(20) NOT NULL,
	"feed_url" varchar(500),
	"scrape_selector" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"fetch_interval_hours" integer DEFAULT 24 NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "news_items" ADD CONSTRAINT "news_items_source_id_news_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."news_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_news_items_source" ON "news_items" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_news_items_published" ON "news_items" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_news_items_processed" ON "news_items" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_news_items_url" ON "news_items" USING btree ("url");--> statement-breakpoint
CREATE INDEX "idx_news_sources_active" ON "news_sources" USING btree ("is_active");