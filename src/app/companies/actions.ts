"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/format";
import { reactivationTarget, transition } from "@/core/pipeline";
import { ActivityType, Priority, RejectionReason, Stage, WebsiteStatus } from "@/generated/prisma/enums";

// Optional text field: "" becomes null.
const opt = z.string().trim().transform((v) => v || null);
const optEnum = <T extends Record<string, string>>(e: T) =>
  z.union([z.literal(""), z.enum(e)]).optional().transform((v) => v || null);
const optDate = z
  .string()
  .transform((v) => (v ? new Date(v) : null)) // ponytail: datetime-local parsed in the server's timezone; fine while the app runs locally
  .refine((v) => v === null || !isNaN(v.getTime()), "Invalid date");

const companySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: opt,
  city: opt,
  state: opt,
  address: opt,
  phone: opt,
  websiteUrl: opt,
  websiteStatus: z.enum(WebsiteStatus),
  manualPriority: optEnum(Priority),
  estimatedValue: z.string().transform(parseMoneyToCents),
  nextActionAt: optDate,
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
}).refine((c) => c.name || c.phone || c.email, "Provide a name, phone or email");

// Validates FormData; failures become a readable message for error.tsx.
function parse<S extends z.ZodType>(schema: S, fd: FormData): z.output<S> {
  const r = schema.safeParse(Object.fromEntries(fd));
  if (!r.success) throw new Error(z.prettifyError(r.error));
  return r.data;
}

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
  await db.$transaction(async (tx) => {
    const current = await tx.company.findUniqueOrThrow({ where: { id }, select: { stage: true } });
    const t = transition(current, to, { reason, note });
    await tx.company.update({ where: { id }, data: t.update });
    await tx.activity.create({ data: { ...t.activity, companyId: id } });
  });
  refresh(id);
}

export async function reactivate(id: string) {
  await db.$transaction(async (tx) => {
    const current = await tx.company.findUniqueOrThrow({ where: { id }, select: { stage: true } });
    const history = await tx.activity.findMany({
      where: { companyId: id, type: "stage_change" },
      orderBy: { occurredAt: "desc" },
      select: { fromStage: true, toStage: true },
    });
    const t = transition(current, reactivationTarget(history));
    await tx.company.update({ where: { id }, data: t.update });
    await tx.activity.create({ data: { ...t.activity, companyId: id } });
  });
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
  body: z.string().trim().min(1, "Describe the activity"),
  occurredAt: optDate,
});

export async function addActivity(companyId: string, fd: FormData) {
  const { type, body, occurredAt } = parse(activitySchema, fd);
  const when = occurredAt ?? new Date();
  await db.$transaction([
    db.activity.create({ data: { companyId, type, body, occurredAt: when } }),
    // Notes don't count as an interaction with the client.
    ...(type === "note"
      ? []
      : [
          db.company.updateMany({
            where: { id: companyId, OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: when } }] },
            data: { lastInteractionAt: when },
          }),
        ]),
  ]);
  refresh(companyId);
}
