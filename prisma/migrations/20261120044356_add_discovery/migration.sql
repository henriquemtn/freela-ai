-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('pending', 'promoted', 'dismissed', 'duplicate');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerPlaceId" TEXT;

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "terms" TEXT[],
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ,
    "finishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryCandidate" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPlaceId" TEXT NOT NULL,
    "status" "CandidateStatus" NOT NULL DEFAULT 'pending',
    "term" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "mapsUrl" TEXT,
    "businessStatus" TEXT,
    "possibleDuplicateId" TEXT,
    "companyId" TEXT,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscoveryRun_status_createdAt_idx" ON "DiscoveryRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_provider_providerPlaceId_idx" ON "DiscoveryCandidate"("provider", "providerPlaceId");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_status_fetchedAt_idx" ON "DiscoveryCandidate"("status", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryCandidate_runId_provider_providerPlaceId_key" ON "DiscoveryCandidate"("runId", "provider", "providerPlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_provider_providerPlaceId_key" ON "Company"("provider", "providerPlaceId");

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiscoveryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_possibleDuplicateId_fkey" FOREIGN KEY ("possibleDuplicateId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

