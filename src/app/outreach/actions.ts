"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { optEnum, parse } from "@/lib/form";
import { applyTransition, syncNextAction, touchLastInteraction } from "@/lib/crm";
import { shortName } from "@/core/outreach";
import { WebsiteStatus } from "@/generated/prisma/enums";

const templateSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao modelo"),
  body: z.string().trim().min(1, "O texto não pode ficar vazio"),
  websiteStatus: optEnum(WebsiteStatus),
});

export async function createTemplate(fd: FormData) {
  await db.messageTemplate.create({ data: parse(templateSchema, fd) });
  revalidatePath("/", "layout");
}

export async function updateTemplate(id: string, fd: FormData) {
  await db.messageTemplate.update({ where: { id }, data: parse(templateSchema, fd) });
  revalidatePath("/", "layout");
}

export async function deleteTemplate(id: string) {
  await db.messageTemplate.delete({ where: { id } });
  revalidatePath("/", "layout");
}

const CHANNELS = { whatsapp: "WhatsApp", instagram: "Instagram", email: "E-mail", other: "outro canal" } as const;
const FOLLOW_UP_DAYS = 3;

const outreachSchema = z.object({
  body: z.string().trim().min(1, "A mensagem está vazia"),
  channel: z.enum(Object.keys(CHANNELS) as [keyof typeof CHANNELS]),
  moveStage: z.literal("on").optional().transform(Boolean),
  followUp: z.literal("on").optional().transform(Boolean),
});

/** The user sent the message themselves; this only records it (spec: no automated sending). */
export async function recordOutreach(companyId: string, fd: FormData) {
  const { body, channel, moveStage, followUp } = parse(outreachSchema, fd);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, stage: true } });
  const now = new Date();

  await db.activity.create({
    data: { companyId, type: channel === "email" ? "email" : "message", body: `Abordagem via ${CHANNELS[channel]}:\n\n${body}`, occurredAt: now },
  });
  await touchLastInteraction(companyId, now);
  if (moveStage && company.stage === "potential") await applyTransition(companyId, "contacted");
  if (followUp) {
    const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + FOLLOW_UP_DAYS, 10, 0);
    await db.task.create({ data: { companyId, title: `Follow-up da abordagem: ${shortName(company.name)}`, dueAt: due } });
    await syncNextAction(companyId);
  }
  revalidatePath("/", "layout");
}
