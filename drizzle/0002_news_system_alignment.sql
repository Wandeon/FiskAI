-- Align news + newsletter schema with Drizzle models.
-- Safe to run multiple times (guards for prod hotfixes).

-- 1) Bring legacy news_items (0001) into the current shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'url'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'source_url'
  ) THEN
    ALTER TABLE "news_items" RENAME COLUMN "url" TO "source_url";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'title'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'original_title'
  ) THEN
    ALTER TABLE "news_items" RENAME COLUMN "title" TO "original_title";
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'original_content'
  ) THEN
    ALTER TABLE "news_items" RENAME COLUMN "content" TO "original_content";
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "fetched_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "summary_en" text;
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "impact_level" varchar(20);
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "assigned_to_post_id" uuid;
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "image_url" varchar(1000);
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "image_source" varchar(200);
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'pending' NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'relevance_score'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE "news_items"
      ALTER COLUMN "relevance_score" TYPE varchar(10)
      USING "relevance_score"::varchar;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'news_items'
      AND column_name = 'processed'
  ) THEN
    UPDATE "news_items"
    SET "status" = 'processed'
    WHERE "status" = 'pending' AND COALESCE("processed", false) = true;
  END IF;
END $$;
--> statement-breakpoint

-- 2) News system tables (taxonomy + posts)
ALTER TABLE "news_sources" ALTER COLUMN "scrape_selector" TYPE text USING "scrape_selector"::text;
--> statement-breakpoint
ALTER TABLE "news_sources" DROP COLUMN IF EXISTS "last_success_at";
--> statement-breakpoint
ALTER TABLE "news_sources" DROP COLUMN IF EXISTS "last_error";
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "news_categories" (
  "id" varchar(50) PRIMARY KEY NOT NULL,
  "slug" varchar(100) NOT NULL UNIQUE,
  "name_hr" varchar(200) NOT NULL,
  "parent_id" varchar(50) REFERENCES "news_categories"("id"),
  "icon" varchar(50),
  "color" varchar(20),
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_categories_slug" ON "news_categories" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_categories_parent" ON "news_categories" ("parent_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "news_tags" (
  "id" varchar(50) PRIMARY KEY NOT NULL,
  "slug" varchar(100) NOT NULL UNIQUE,
  "name_hr" varchar(200) NOT NULL,
  "created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_tags_slug" ON "news_tags" ("slug");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "news_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(300) NOT NULL UNIQUE,
  "type" varchar(20) NOT NULL,
  "title" varchar(500) NOT NULL,
  "content" text NOT NULL,
  "excerpt" varchar(500),
  "featured_image_url" varchar(1000),
  "featured_image_source" varchar(200),
  "featured_image_caption" varchar(500),
  "category_id" varchar(50) REFERENCES "news_categories"("id"),
  "tags" jsonb DEFAULT '[]'::jsonb,
  "impact_level" varchar(20),
  "ai_passes" jsonb DEFAULT '{}'::jsonb,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_posts_slug" ON "news_posts" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_posts_status" ON "news_posts" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_posts_published" ON "news_posts" ("published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_posts_category" ON "news_posts" ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_posts_type" ON "news_posts" ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_posts_impact" ON "news_posts" ("impact_level");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "news_post_sources" (
  "post_id" uuid NOT NULL REFERENCES "news_posts"("id") ON DELETE cascade,
  "news_item_id" uuid NOT NULL REFERENCES "news_items"("id") ON DELETE cascade,
  CONSTRAINT "news_post_sources_pkey" PRIMARY KEY ("post_id","news_item_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_post_sources_post" ON "news_post_sources" ("post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_post_sources_item" ON "news_post_sources" ("news_item_id");
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'news_items_assigned_to_post_id_news_posts_id_fk'
  ) THEN
    ALTER TABLE "news_items"
      ADD CONSTRAINT "news_items_assigned_to_post_id_news_posts_id_fk"
      FOREIGN KEY ("assigned_to_post_id") REFERENCES "news_posts"("id");
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_news_items_status" ON "news_items" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_items_impact" ON "news_items" ("impact_level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_items_assigned" ON "news_items" ("assigned_to_post_id");
--> statement-breakpoint

-- 3) Newsletter subscriptions (marketing lead magnet)
CREATE TABLE IF NOT EXISTS "newsletter_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "is_active" boolean DEFAULT true NOT NULL,
  "source" varchar(100) DEFAULT 'vijesti_sidebar',
  "confirmed_at" timestamptz,
  "unsubscribed_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_newsletter_email" ON "newsletter_subscriptions" ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_newsletter_active" ON "newsletter_subscriptions" ("is_active");
