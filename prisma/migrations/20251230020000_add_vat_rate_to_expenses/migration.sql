-- AlterTable: Add vatRate field to Expense table
ALTER TABLE "Expense" ADD COLUMN "vatRate" DECIMAL(5,2);

-- AlterTable: Add vatRate field to RecurringExpense table
ALTER TABLE "RecurringExpense" ADD COLUMN "vatRate" DECIMAL(5,2);

-- BackfillData: Calculate and populate vatRate for existing expenses
UPDATE "Expense"
SET "vatRate" = ROUND(("vatAmount" / NULLIF("netAmount", 0)) * 100, 2)
WHERE "vatAmount" > 0 AND "netAmount" > 0 AND "vatRate" IS NULL;

UPDATE "Expense"
SET "vatRate" = 0
WHERE "vatAmount" = 0 AND "vatRate" IS NULL;

-- BackfillData: Calculate and populate vatRate for existing recurring expenses
UPDATE "RecurringExpense"
SET "vatRate" = ROUND(("vatAmount" / NULLIF("netAmount", 0)) * 100, 2)
WHERE "vatAmount" > 0 AND "netAmount" > 0 AND "vatRate" IS NULL;

UPDATE "RecurringExpense"
SET "vatRate" = 0
WHERE "vatAmount" = 0 AND "vatRate" IS NULL;

-- AlterTable: Make vatRate NOT NULL (after backfilling data)
ALTER TABLE "Expense" ALTER COLUMN "vatRate" SET NOT NULL;
ALTER TABLE "RecurringExpense" ALTER COLUMN "vatRate" SET NOT NULL;
