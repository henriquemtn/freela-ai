import { db } from "@/lib/db";
import type { DiscoveryRun } from "@/generated/prisma/client";
import { matchCompany } from "./dedupe";
import { getProvider } from "./providers";

/** Claims the oldest queued run atomically; safe with several workers. */
export async function claimRun(): Promise<DiscoveryRun | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "DiscoveryRun" SET status = 'running', "startedAt" = now()
    WHERE id = (
      SELECT id FROM "DiscoveryRun" WHERE status = 'queued'
      ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  return rows[0] ? db.discoveryRun.findUnique({ where: { id: rows[0].id } }) : null;
}

const isCancelled = async (id: string) =>
  (await db.discoveryRun.findUniqueOrThrow({ where: { id }, select: { status: true } })).status === "cancelled";

export async function executeRun(run: DiscoveryRun) {
  const errors: string[] = [];
  try {
    const provider = getProvider(run.provider);
    // ponytail: loads every company once per run for dedupe; fine for a personal CRM.
    const companies = await db.company.findMany({
      select: { id: true, provider: true, providerPlaceId: true, name: true, city: true, phone: true, websiteUrl: true },
    });

    for (const term of run.terms) {
      if (await isCancelled(run.id)) return;
      try {
        const places = await provider.search({ area: run.area, term });
        let found = 0;
        let duplicates = 0;
        for (const p of places) {
          const match = matchCompany({ ...p, provider: provider.name }, companies);
          const created = await db.discoveryCandidate.createMany({
            data: [
              {
                ...p,
                runId: run.id,
                provider: provider.name,
                term,
                status: match?.kind === "exact" ? "duplicate" : "pending",
                companyId: match?.kind === "exact" ? match.companyId : null,
              },
            ],
            skipDuplicates: true, // same place from another term of this run
          });
          found += created.count;
          if (created.count && match?.kind === "exact") duplicates++;
        }
        await db.discoveryRun.update({
          where: { id: run.id },
          data: { foundCount: { increment: found }, duplicateCount: { increment: duplicates } },
        });
      } catch (e) {
        errors.push(`${term}: ${e instanceof Error ? e.message : String(e)}`);
        await db.discoveryRun.update({ where: { id: run.id }, data: { failedCount: { increment: 1 } } });
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  const allFailed = errors.length > 0 && errors.length >= run.terms.length;
  // updateMany so a run cancelled meanwhile keeps its "cancelled" status.
  await db.discoveryRun.updateMany({
    where: { id: run.id, status: "running" },
    data: { status: allFailed ? "failed" : "completed", finishedAt: new Date(), error: errors.join("\n") || null },
  });
}

/** Runs left "running" by a crashed worker can't resume; mark them failed. */
export async function failOrphanedRuns() {
  await db.discoveryRun.updateMany({
    where: { status: "running" },
    data: { status: "failed", finishedAt: new Date(), error: "Worker interrompido durante a execução" },
  });
}
