-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('potential', 'contacted', 'in_progress', 'working', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('not_found', 'social_only', 'outdated', 'active', 'unknown');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('no_interest', 'no_response', 'already_has_provider', 'no_budget', 'not_a_fit', 'invalid_business', 'duplicate', 'other');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('note', 'stage_change', 'call', 'message', 'email', 'meeting');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "websiteStatus" "WebsiteStatus" NOT NULL DEFAULT 'unknown',
    "stage" "Stage" NOT NULL DEFAULT 'potential',
    "generatedScore" INTEGER,
    "manualPriority" "Priority",
    "estimatedValueCents" INTEGER,
    "nextActionAt" TIMESTAMPTZ,
    "lastInteractionAt" TIMESTAMPTZ,
    "rejectionReason" "RejectionReason",
    "rejectionNote" TEXT,
    "closedAt" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "collectedAt" TIMESTAMPTZ,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "body" TEXT,
    "fromStage" "Stage",
    "toStage" "Stage",
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_stage_idx" ON "Company"("stage");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_city_idx" ON "Company"("city");

-- CreateIndex
CREATE INDEX "Company_nextActionAt_idx" ON "Company"("nextActionAt");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "Activity_companyId_occurredAt_idx" ON "Activity"("companyId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
