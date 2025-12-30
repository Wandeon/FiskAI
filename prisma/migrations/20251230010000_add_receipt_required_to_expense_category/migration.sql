-- Add receiptRequired field to ExpenseCategory
-- GitHub Issue #734: No receipt/document validation or requirement enforcement

-- Add receiptRequired column to ExpenseCategory table
ALTER TABLE "ExpenseCategory" ADD COLUMN "receiptRequired" BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient querying of categories requiring receipts
CREATE INDEX "ExpenseCategory_receiptRequired_idx" ON "ExpenseCategory"("receiptRequired");
