-- AlterTable
ALTER TABLE "DiscoveryCandidate" DROP COLUMN "businessStatus",
DROP COLUMN "mapsUrl",
ADD COLUMN     "sourceUrl" TEXT;

