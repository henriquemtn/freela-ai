-- CreateTable
CREATE TABLE "ResearchJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "startedAt" TIMESTAMPTZ,
    "finishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT,
    "websiteStatus" "WebsiteStatus" NOT NULL,
    "websiteUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "findings" JSONB NOT NULL,
    "model" TEXT,
    "costUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchJob_status_createdAt_idx" ON "ResearchJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchJob_companyId_idx" ON "ResearchJob"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchReport_jobId_key" ON "ResearchReport"("jobId");

-- CreateIndex
CREATE INDEX "ResearchReport_companyId_createdAt_idx" ON "ResearchReport"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "ResearchJob" ADD CONSTRAINT "ResearchJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ResearchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

