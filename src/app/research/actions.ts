"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { researchOutputSchema } from "@/research/schema";

export async function startResearch(companyId: string) {
  const active = await db.researchJob.findFirst({ where: { companyId, status: { in: ["queued", "running"] } } });
  if (!active) await db.researchJob.create({ data: { companyId } });
  revalidatePath(`/companies/${companyId}`);
}

export async function cancelResearch(jobId: string) {
  const job = await db.researchJob.update({
    where: { id: jobId },
    data: { status: "cancelled", finishedAt: new Date() },
    select: { companyId: true },
  });
  revalidatePath(`/companies/${job.companyId}`);
}

/** Saves a phone/WhatsApp/email found by research as a Contact, keeping its source (LGPD). */
export async function saveFoundChannel(reportId: string, index: number) {
  const report = await db.researchReport.findUniqueOrThrow({ where: { id: reportId } });
  const channel = researchOutputSchema.parse(report.findings).contactChannels[z.number().int().min(0).parse(index)];
  if (!channel) throw new Error("Canal não encontrado no relatório");
  if (channel.type === "instagram" || channel.type === "other") throw new Error("Só telefone, WhatsApp e e-mail viram contato");

  await db.contact.create({
    data: {
      companyId: report.companyId,
      ...(channel.type === "email" ? { email: channel.value } : { phone: channel.value }),
      notes: channel.type === "whatsapp" ? "WhatsApp" : null,
      source: channel.sourceUrl,
      collectedAt: new Date(),
    },
  });
  revalidatePath(`/companies/${report.companyId}`);
}
