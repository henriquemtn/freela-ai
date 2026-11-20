// Background worker: runs discovery jobs outside the web request cycle.
// Start with `pnpm worker` (alongside `pnpm dev`).
import { claimRun, executeRun, failOrphanedRuns } from "@/discovery/run";
import { db } from "@/lib/db";

const POLL_MS = 3_000;

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => (stopping = true));

const log = (msg: string) => console.log(`[worker ${new Date().toISOString()}] ${msg}`);

async function main() {
  // ponytail: assumes a single worker; with several, orphan detection needs heartbeats.
  await failOrphanedRuns();
  log("pronto, aguardando execuções de descoberta");

  while (!stopping) {
    const run = await claimRun();
    if (run) {
      log(`execução ${run.id}: ${run.terms.join(", ")} em ${run.area} (${run.provider})`);
      await executeRun(run);
      log(`execução ${run.id} finalizada`);
      continue; // check for more work right away
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
