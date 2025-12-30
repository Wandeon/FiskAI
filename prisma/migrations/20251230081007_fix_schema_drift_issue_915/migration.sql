-- AlterTable: Add isSupplier field to Contact model
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "isSupplier" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Add composite index on Contact for companyId and isSupplier
CREATE INDEX IF NOT EXISTS "Contact_companyId_isSupplier_idx" ON "Contact"("companyId", "isSupplier");

-- AlterTable: Add discoveredAt field to DiscoveredItem model
ALTER TABLE "DiscoveredItem" ADD COLUMN IF NOT EXISTS "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: Add Document model for staff portal document management
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'EUR',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "mimeType" TEXT,
    "storagePath" TEXT,
    "storageKey" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Document indexes
CREATE INDEX IF NOT EXISTS "Document_companyId_idx" ON "Document"("companyId");
CREATE INDEX IF NOT EXISTS "Document_status_idx" ON "Document"("status");
CREATE INDEX IF NOT EXISTS "Document_category_idx" ON "Document"("category");
CREATE INDEX IF NOT EXISTS "Document_uploadedAt_idx" ON "Document"("uploadedAt");

-- AddForeignKey: Document to Company relation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Document_companyId_fkey'
    ) THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
