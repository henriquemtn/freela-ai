-- DropForeignKey
ALTER TABLE "DiscoveryCandidate" DROP CONSTRAINT "DiscoveryCandidate_possibleDuplicateId_fkey";

-- AlterTable
ALTER TABLE "DiscoveryCandidate" DROP COLUMN "possibleDuplicateId";

