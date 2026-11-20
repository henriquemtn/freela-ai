import { db } from "@/lib/db";
import { reactivationTarget, transition } from "@/core/pipeline";
import { nextActionFrom } from "@/core/tasks";
import type { Stage } from "@/generated/prisma/enums";

// Shared server-side CRM operations. Deliberately not in a "use server" file,
// so they aren't exposed as callable Server Actions on their own.

/**
 * Applies a stage transition and logs it on the timeline, atomically.
 * "reactivate" resolves the target from the company's stage history.
 */
export async function applyTransition(id: string, to: Stage | "reactivate", opts?: Parameters<typeof transition>[2]) {
  await db.$transaction(async (tx) => {
    const current = await tx.company.findUniqueOrThrow({ where: { id }, select: { stage: true } });
    const target =
      to === "reactivate"
        ? reactivationTarget(
            await tx.activity.findMany({
              where: { companyId: id, type: "stage_change" },
              orderBy: { occurredAt: "desc" },
              select: { fromStage: true, toStage: true },
            }),
          )
        : to;
    const t = transition(current, target, opts);
    await tx.company.update({ where: { id }, data: t.update });
    await tx.activity.create({ data: { ...t.activity, companyId: id } });
  });
}

/** Recomputes the Company.nextActionAt cache from its open tasks. */
export async function syncNextAction(companyId: string | null) {
  if (!companyId) return;
  const tasks = await db.task.findMany({ where: { companyId, completedAt: null }, select: { dueAt: true, completedAt: true } });
  await db.company.update({ where: { id: companyId }, data: { nextActionAt: nextActionFrom(tasks) } });
}

/** Sets lastInteractionAt unless a later interaction is already recorded. */
export async function touchLastInteraction(companyId: string, when: Date) {
  await db.company.updateMany({
    where: { id: companyId, OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: when } }] },
    data: { lastInteractionAt: when },
  });
}
