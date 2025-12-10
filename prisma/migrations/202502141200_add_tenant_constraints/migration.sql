-- Adds unique constraint for contacts per company (OIB)
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_companyId_oib_key" ON "Contact"("companyId", "oib");

-- Ensures invoice numbers are unique per company
CREATE UNIQUE INDEX IF NOT EXISTS "EInvoice_companyId_invoiceNumber_key" ON "EInvoice"("companyId", "invoiceNumber");
