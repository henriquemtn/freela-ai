import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { runClaude } from "@/lib/claude";
import { effectivePriority } from "@/core/pipeline";
import { PRIORITY_LABEL } from "@/lib/format";
import type { ResearchJob } from "@/generated/prisma/client";
import { researchOutputSchema } from "./schema";
import { scoreResearch } from "./score";

const SKILL_PATH = join(process.cwd(), ".claude/skills/freela-business-research/SKILL.md");

/** The project skill is the single source of the research instructions. */
async function researchInstructions() {
  const skill = await readFile(SKILL_PATH, "utf8");
  return skill.replace(/^---[\s\S]*?---\s*/, ""); // drop frontmatter
}

export async function claimResearchJob(): Promise<ResearchJob | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "ResearchJob" SET status = 'running', "startedAt" = now()
    WHERE id = (
      SELECT id FROM "ResearchJob" WHERE status = 'queued'
      ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  return rows[0] ? db.researchJob.findUnique({ where: { id: rows[0].id } }) : null;
}

export async function executeResearch(job: ResearchJob) {
  try {
    const company = await db.company.findUniqueOrThrow({
      where: { id: job.companyId },
      select: { name: true, category: true, address: true, city: true, state: true, phone: true, websiteUrl: true },
    });
    // Minimal input (spec): only what identifies the business publicly.
    const input = {
      name: company.name,
      category: company.category,
      address: company.address,
      city: company.city,
      state: company.state,
      phone: company.phone,
      knownLinks: company.websiteUrl ? [company.websiteUrl] : [],
    };
    const prompt = `${await researchInstructions()}\n\n## Business to research\n\n\`\`\`json\n${JSON.stringify(input, null, 2)}\n\`\`\``;
    const model = process.env.FREELA_CLAUDE_MODEL || "sonnet";

    const { output, costUsd } = await runClaude({
      prompt,
      schema: researchOutputSchema,
      tools: ["WebSearch", "WebFetch"],
      timeoutMs: 10 * 60_000,
      model,
    });
    const { score, breakdown } = scoreResearch(output);
    console.info(`[research] ${company.name}: score ${score}, ${output.websiteStatus}, US$ ${costUsd?.toFixed(2) ?? "?"}`);

    await db.$transaction(async (tx) => {
      const current = await tx.researchJob.findUniqueOrThrow({ where: { id: job.id }, select: { status: true } });
      if (current.status !== "running") return; // cancelled meanwhile
      await tx.researchReport.create({
        data: {
          companyId: job.companyId,
          jobId: job.id,
          websiteStatus: output.websiteStatus,
          websiteUrl: output.officialWebsite,
          confidence: output.confidence,
          summary: output.summary,
          score,
          scoreBreakdown: breakdown,
          findings: output,
          model,
          costUsd,
        },
      });
      const updated = await tx.company.update({
        where: { id: job.companyId },
        data: {
          websiteStatus: output.websiteStatus,
          generatedScore: score,
          // Keep a URL the user set; fill it only when empty.
          ...(company.websiteUrl ? {} : { websiteUrl: output.officialWebsite ?? output.socialProfiles[0]?.url ?? null }),
        },
        select: { manualPriority: true, generatedScore: true },
      });
      const priority = effectivePriority(updated);
      await tx.activity.create({
        data: {
          companyId: job.companyId,
          type: "note",
          body: `Pesquisa concluída: score ${score}${priority ? ` (prioridade ${PRIORITY_LABEL[priority].toLowerCase()})` : ""}. ${output.summary}`,
        },
      });
      await tx.researchJob.update({ where: { id: job.id }, data: { status: "completed", finishedAt: new Date() } });
    });
  } catch (e) {
    await db.researchJob.updateMany({
      where: { id: job.id, status: "running" },
      data: { status: "failed", finishedAt: new Date(), error: e instanceof Error ? e.message.slice(0, 2000) : String(e) },
    });
  }
}

export async function failOrphanedResearch() {
  await db.researchJob.updateMany({
    where: { status: "running" },
    data: { status: "failed", finishedAt: new Date(), error: "Worker interrompido durante a execução" },
  });
}
