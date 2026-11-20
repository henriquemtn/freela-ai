"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { opt, optDate, parse } from "@/lib/form";
import { nextActionFrom } from "@/core/tasks";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório"),
  notes: opt,
  dueAt: optDate,
  companyId: opt.optional().transform((v) => v ?? null),
});

/** Recomputes the Company.nextActionAt cache from its open tasks. */
async function syncNextAction(companyId: string | null) {
  if (!companyId) return;
  const tasks = await db.task.findMany({ where: { companyId, completedAt: null }, select: { dueAt: true, completedAt: true } });
  await db.company.update({ where: { id: companyId }, data: { nextActionAt: nextActionFrom(tasks) } });
}

async function afterChange(...companyIds: (string | null)[]) {
  for (const id of new Set(companyIds)) await syncNextAction(id);
  revalidatePath("/", "layout");
}

export async function createTask(fd: FormData) {
  const t = await db.task.create({ data: parse(taskSchema, fd) });
  await afterChange(t.companyId);
}

export async function updateTask(id: string, fd: FormData) {
  const before = await db.task.findUniqueOrThrow({ where: { id }, select: { companyId: true } });
  const t = await db.task.update({ where: { id }, data: parse(taskSchema, fd) });
  await afterChange(before.companyId, t.companyId);
}

export async function toggleTask(id: string) {
  const t = await db.task.findUniqueOrThrow({ where: { id } });
  await db.task.update({ where: { id }, data: { completedAt: t.completedAt ? null : new Date() } });
  await afterChange(t.companyId);
}

export async function deleteTask(id: string) {
  const t = await db.task.delete({ where: { id } });
  await afterChange(t.companyId);
}
