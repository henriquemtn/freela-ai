-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('open', 'proposal', 'won', 'lost');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "outreachDraft" TEXT;

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "service" TEXT,
    "valueCents" INTEGER,
    "status" "DealStatus" NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "proposalSentAt" TIMESTAMPTZ,
    "closedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deal_companyId_idx" ON "Deal"("companyId");

-- CreateIndex
CREATE INDEX "Deal_status_closedAt_idx" ON "Deal"("status", "closedAt");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

