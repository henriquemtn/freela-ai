"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { parse } from "@/lib/form";
import { configuredProvider, hasStableIds } from "@/discovery/config";
import { presenceFromListing } from "@/discovery/normalize";
import { PROVIDER_LABEL } from "@/discovery/labels";

const runSchema = z.object({
  area: z.string().trim().min(2, "Informe a região"),
  terms: z
    .string()
    .transform((s) => [...new Set(s.split(/[\n,]/).map((t) => t.trim()).filter(Boolean))])
    .pipe(z.array(z.string()).min(1, "Informe ao menos um termo").max(10, "Máximo de 10 termos por busca")),
});

export async function startRun(fd: FormData) {
  const { area, terms } = parse(runSchema, fd);
  const run = await db.discoveryRun.create({ data: { area, terms, provider: configuredProvider() } });
  revalidatePath("/discovery");
  redirect(`/discovery/${run.id}`);
}

export async function cancelRun(id: string) {
  await db.discoveryRun.updateMany({
    where: { id, status: { in: ["queued", "running"] } },
    data: { status: "cancelled", finishedAt: new Date() },
  });
  revalidatePath(`/discovery/${id}`);
}

function ids(fd: FormData) {
  const r = z.array(z.string().min(1)).min(1, "Selecione ao menos um candidato").safeParse(fd.getAll("ids"));
  if (!r.success) throw new Error(z.prettifyError(r.error));
  return r.data;
}

/** Turns reviewed candidates into CRM companies (human approval per spec). Returns the new company ids. */
async function promote(runId: string, fd: FormData): Promise<string[]> {
  const created: string[] = [];
  const candidates = await db.discoveryCandidate.findMany({ where: { id: { in: ids(fd) }, runId, status: "pending" } });
  for (const c of candidates) {
    await db.$transaction(async (tx) => {
      // Only real provider IDs identify a business; Claude's name+city keys don't.
      const stableId = hasStableIds(c.provider) ? c.providerPlaceId : null;
      // Another run may have promoted the same place meanwhile.
      const existing =
        stableId &&
        (await tx.company.findUnique({
          where: { provider_providerPlaceId: { provider: c.provider, providerPlaceId: stableId } },
          select: { id: true },
        }));
      if (existing) {
        await tx.discoveryCandidate.update({ where: { id: c.id }, data: { status: "duplicate", companyId: existing.id } });
        return;
      }
      const company = await tx.company.create({
        data: {
          name: c.name,
          category: c.category,
          address: c.address,
          city: c.city,
          state: c.state,
          phone: c.phone,
          websiteUrl: c.websiteUrl,
          instagramUrl: c.instagramUrl,
          websiteStatus: presenceFromListing(c.websiteUrl, c.instagramUrl),
          provider: c.provider,
          providerPlaceId: stableId,
        },
      });
      await tx.activity.create({
        data: {
          companyId: company.id,
          type: "note",
          body: `Importada da descoberta: ${PROVIDER_LABEL[c.provider] ?? c.provider}, termo "${c.term}"`,
        },
      });
      await tx.discoveryCandidate.update({ where: { id: c.id }, data: { status: "promoted", companyId: company.id } });
      created.push(company.id);
    });
  }
  return created;
}

export async function promoteCandidates(runId: string, fd: FormData) {
  await promote(runId, fd);
  revalidatePath("/", "layout");
}

/** Promote and queue Claude research for each new company. */
export async function promoteAndResearch(runId: string, fd: FormData) {
  const companyIds = await promote(runId, fd);
  if (companyIds.length) await db.researchJob.createMany({ data: companyIds.map((companyId) => ({ companyId })) });
  revalidatePath("/", "layout");
}

export async function dismissCandidates(runId: string, fd: FormData) {
  await db.discoveryCandidate.updateMany({ where: { id: { in: ids(fd) }, runId, status: "pending" }, data: { status: "dismissed" } });
  revalidatePath(`/discovery/${runId}`);
}
