-- Create enums for person snapshots and events
DO $$ BEGIN
    CREATE TYPE "PersonSnapshotAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "PersonEventType" AS ENUM (
        'PERSON_CREATED',
        'PERSON_UPDATED',
        'PERSON_DELETED',
        'CONTACT_ROLE_ASSIGNED',
        'EMPLOYEE_ROLE_ASSIGNED',
        'DIRECTOR_ROLE_ASSIGNED',
        'CONTACT_ROLE_REMOVED',
        'EMPLOYEE_ROLE_REMOVED',
        'DIRECTOR_ROLE_REMOVED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create Person table
CREATE TABLE IF NOT EXISTS "Person" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "normalizedFullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "oib" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "iban" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'HR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PersonContactRole table
CREATE TABLE IF NOT EXISTS "PersonContactRole" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 15,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonContactRole_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonContactRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonContactRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PersonEmployeeRole table
CREATE TABLE IF NOT EXISTS "PersonEmployeeRole" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "jobTitle" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonEmployeeRole_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonEmployeeRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonEmployeeRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PersonDirectorRole table
CREATE TABLE IF NOT EXISTS "PersonDirectorRole" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3),
    "resignationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonDirectorRole_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonDirectorRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonDirectorRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create PersonSnapshot table
CREATE TABLE IF NOT EXISTS "PersonSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "action" "PersonSnapshotAction" NOT NULL,
    "data" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedByUserId" TEXT,
    CONSTRAINT "PersonSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonSnapshot_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonSnapshot_capturedByUserId_fkey" FOREIGN KEY ("capturedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create PersonEvent table
CREATE TABLE IF NOT EXISTS "PersonEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "eventType" "PersonEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PersonEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraints and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Person_companyId_normalizedFullName_key" ON "Person"("companyId", "normalizedFullName");
CREATE UNIQUE INDEX IF NOT EXISTS "Person_companyId_oib_key" ON "Person"("companyId", "oib");
CREATE INDEX IF NOT EXISTS "Person_companyId_idx" ON "Person"("companyId");
CREATE INDEX IF NOT EXISTS "Person_oib_idx" ON "Person"("oib");
CREATE INDEX IF NOT EXISTS "Person_normalizedFullName_idx" ON "Person"("normalizedFullName");

CREATE UNIQUE INDEX IF NOT EXISTS "PersonContactRole_companyId_personId_key" ON "PersonContactRole"("companyId", "personId");
CREATE INDEX IF NOT EXISTS "PersonContactRole_companyId_idx" ON "PersonContactRole"("companyId");
CREATE INDEX IF NOT EXISTS "PersonContactRole_personId_idx" ON "PersonContactRole"("personId");
CREATE INDEX IF NOT EXISTS "PersonContactRole_type_idx" ON "PersonContactRole"("type");

CREATE UNIQUE INDEX IF NOT EXISTS "PersonEmployeeRole_companyId_personId_key" ON "PersonEmployeeRole"("companyId", "personId");
CREATE INDEX IF NOT EXISTS "PersonEmployeeRole_companyId_idx" ON "PersonEmployeeRole"("companyId");
CREATE INDEX IF NOT EXISTS "PersonEmployeeRole_personId_idx" ON "PersonEmployeeRole"("personId");

CREATE UNIQUE INDEX IF NOT EXISTS "PersonDirectorRole_companyId_personId_key" ON "PersonDirectorRole"("companyId", "personId");
CREATE INDEX IF NOT EXISTS "PersonDirectorRole_companyId_idx" ON "PersonDirectorRole"("companyId");
CREATE INDEX IF NOT EXISTS "PersonDirectorRole_personId_idx" ON "PersonDirectorRole"("personId");

CREATE INDEX IF NOT EXISTS "PersonSnapshot_companyId_idx" ON "PersonSnapshot"("companyId");
CREATE INDEX IF NOT EXISTS "PersonSnapshot_personId_idx" ON "PersonSnapshot"("personId");
CREATE INDEX IF NOT EXISTS "PersonSnapshot_capturedAt_idx" ON "PersonSnapshot"("capturedAt");

CREATE INDEX IF NOT EXISTS "PersonEvent_companyId_idx" ON "PersonEvent"("companyId");
CREATE INDEX IF NOT EXISTS "PersonEvent_personId_idx" ON "PersonEvent"("personId");
CREATE INDEX IF NOT EXISTS "PersonEvent_eventType_idx" ON "PersonEvent"("eventType");
CREATE INDEX IF NOT EXISTS "PersonEvent_createdAt_idx" ON "PersonEvent"("createdAt");
