"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { opt, parse } from "@/lib/form";
import { formatBRL, parseMoneyToCents } from "@/lib/format";
import { applyTransition } from "@/lib/crm";
import { DEAL_STATUS_LABEL, dealStatusUpdate, stageAfterDeal } from "@/core/deals";
import { DealStatus } from "@/generated/prisma/enums";

const dealSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à oportunidade"),
  service: opt,
  value: z.string().transform(parseMoneyToCents),
  notes: opt,
});

const money = (cents: number | null) => (cents != null ? ` (${formatBRL(cents)})` : "");

export async function createDeal(companyId: string, fd: FormData) {
  const { value, ...data } = parse(dealSchema, fd);
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { stage: true } });
  const deal = await db.deal.create({ data: { ...data, valueCents: value, companyId } });
  await db.activity.create({ data: { companyId, type: "note", body: `Nova oportunidade: ${deal.title}${money(deal.valueCents)}` } });
  const to = stageAfterDeal("created", company.stage);
  if (to) await applyTransition(companyId, to);
  revalidatePath("/", "layout");
}

export async function updateDeal(id: string, fd: FormData) {
  const { value, ...data } = parse(dealSchema, fd);
  await db.deal.update({ where: { id }, data: { ...data, valueCents: value } });
  revalidatePath("/", "layout");
}

export async function setDealStatus(id: string, status: DealStatus) {
  const to = z.enum(DealStatus).parse(status);
  const deal = await db.deal.findUniqueOrThrow({ where: { id }, include: { company: { select: { stage: true } } } });
  if (deal.status === to) return;
  await db.deal.update({ where: { id }, data: dealStatusUpdate(deal, to) });
  await db.activity.create({
    data: { companyId: deal.companyId, type: "note", body: `${DEAL_STATUS_LABEL[to]}: ${deal.title}${money(deal.valueCents)}` },
  });
  if (to === "won") {
    const stage = stageAfterDeal("won", deal.company.stage);
    if (stage) await applyTransition(deal.companyId, stage);
  }
  revalidatePath("/", "layout");
}

export async function deleteDeal(id: string) {
  await db.deal.delete({ where: { id } });
  revalidatePath("/", "layout");
}
