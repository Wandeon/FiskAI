-- Add unique constraint on Evidence (url, contentHash) to prevent duplicates
-- Duplicates have already been cleaned up in previous step

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_url_contentHash_key" ON "Evidence"("url", "contentHash");
