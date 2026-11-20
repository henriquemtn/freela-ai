"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/format";
import { opt, optDate, optEnum, parse } from "@/lib/form";
import { ACTIVE_STAGES } from "@/core/pipeline";
import { applyTransition, touchLastInteraction } from "@/lib/crm";
import { ActivityType, Priority, RejectionReason, Stage, WebsiteStatus } from "@/generated/prisma/enums";

const companySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  category: opt,
  city: opt,
  state: opt,
  address: opt,
  phone: opt,
  websiteUrl: opt,
  websiteStatus: z.enum(WebsiteStatus),
  manualPriority: optEnum(Priority),
  estimatedValue: z.string().transform(parseMoneyToCents),
  notes: opt,
});

const contactSchema = z.object({
  name: opt,
  role: opt,
  email: opt.pipe(z.email().nullable()),
  phone: opt,
  source: opt,
  notes: opt,
  optedOut: z.literal("on").optional().transform(Boolean),
}).refine((c) => c.name || c.phone || c.email, "Informe nome, telefone ou e-mail");

function parseCompany(fd: FormData) {
  const { estimatedValue, ...rest } = parse(companySchema, fd);
  return { ...rest, estimatedValueCents: estimatedValue };
}

const refresh = (id?: string) => {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/companies/${id}`);
};

export async function createCompany(fd: FormData) {
  const c = await db.company.create({ data: parseCompany(fd) });
  refresh();
  redirect(`/companies/${c.id}`);
}

export async function updateCompany(id: string, fd: FormData) {
  await db.company.update({ where: { id }, data: parseCompany(fd) });
  refresh(id);
  redirect(`/companies/${id}`);
}

const stageSchema = z.object({
  to: z.enum(Stage),
  reason: optEnum(RejectionReason),
  note: opt.optional(),
});

export async function changeStage(id: string, fd: FormData) {
  const { to, reason, note } = parse(stageSchema, fd);
  await applyTransition(id, to, { reason, note });
  refresh(id);
}

/** Kanban drop: active stages only (Limbo needs a reason, set on the company page). */
export async function moveCompany(id: string, to: Stage) {
  await applyTransition(id, z.enum(ACTIVE_STAGES).parse(to));
  refresh(id);
}

export async function reactivate(id: string) {
  await applyTransition(id, "reactivate");
  refresh(id);
}

export async function addContact(companyId: string, fd: FormData) {
  await db.contact.create({ data: { ...parse(contactSchema, fd), companyId, collectedAt: new Date() } });
  refresh(companyId);
}

export async function updateContact(id: string, fd: FormData) {
  const c = await db.contact.update({ where: { id }, data: parse(contactSchema, fd) });
  refresh(c.companyId);
}

export async function deleteContact(id: string) {
  const c = await db.contact.delete({ where: { id } });
  refresh(c.companyId);
}

const activitySchema = z.object({
  type: z.enum(ActivityType).exclude(["stage_change"]),
  body: z.string().trim().min(1, "Descreva a atividade"),
  occurredAt: optDate,
});

export async function addActivity(companyId: string, fd: FormData) {
  const { type, body, occurredAt } = parse(activitySchema, fd);
  const when = occurredAt ?? new Date();
  await db.activity.create({ data: { companyId, type, body, occurredAt: when } });
  // Notes don't count as an interaction with the client.
  if (type !== "note") await touchLastInteraction(companyId, when);
  refresh(companyId);
}
