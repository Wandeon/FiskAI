-- Add error recovery tracking fields to news_items
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "processing_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "news_items" ADD COLUMN IF NOT EXISTS "last_error_at" timestamp with time zone;

-- Add error recovery tracking fields to news_posts
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "processing_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "last_error_at" timestamp with time zone;

-- Create index for finding failed items (dead-letter queue)
CREATE INDEX IF NOT EXISTS "idx_news_items_failed" ON "news_items" ("status") WHERE "status" = 'failed';
CREATE INDEX IF NOT EXISTS "idx_news_posts_failed" ON "news_posts" ("status") WHERE "status" = 'failed';

-- Create index for finding items eligible for retry
CREATE INDEX IF NOT EXISTS "idx_news_items_retry" ON "news_items" ("status", "processing_attempts") WHERE "status" = 'pending' AND "processing_attempts" > 0;
CREATE INDEX IF NOT EXISTS "idx_news_posts_retry" ON "news_posts" ("status", "processing_attempts") WHERE "status" = 'draft' AND "processing_attempts" > 0;
