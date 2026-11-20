import type { Priority, RejectionReason, Stage } from "@/generated/prisma/enums";

export const ACTIVE_STAGES = ["potential", "contacted", "in_progress", "working", "completed"] as const satisfies Stage[];

export const STAGE_LABEL: Record<Stage, string> = {
  potential: "Potencial cliente",
  contacted: "Contato feito",
  in_progress: "Em andamento",
  working: "Trabalhando",
  completed: "Concluído",
  rejected: "Limbo",
};

export const REJECTION_LABEL: Record<RejectionReason, string> = {
  no_interest: "Sem interesse",
  no_response: "Sem resposta",
  already_has_provider: "Já tem fornecedor",
  no_budget: "Sem orçamento",
  not_a_fit: "Não é o perfil",
  invalid_business: "Negócio inválido",
  duplicate: "Duplicado",
  other: "Outro",
};

type Current = { stage: Stage };
type Opts = { reason?: RejectionReason | null; note?: string | null; now?: Date };

/**
 * Stage transition rules. Pure: returns the company update and the timeline
 * activity to persist. Any stage can move to any other (the user decides),
 * except: Limbo requires a reason, and moving to the same stage is rejected.
 */
export function transition(current: Current, to: Stage, opts: Opts = {}) {
  const now = opts.now ?? new Date();
  if (current.stage === to) throw new Error(`Empresa já está em "${STAGE_LABEL[to]}"`);
  if (to === "rejected" && !opts.reason) throw new Error("Motivo é obrigatório para mover ao Limbo");

  const leavingLimbo = current.stage === "rejected";
  const update = {
    stage: to,
    closedAt: to === "rejected" || to === "completed" ? now : null,
    rejectionReason: to === "rejected" ? opts.reason! : null,
    rejectionNote: to === "rejected" ? (opts.note ?? null) : null,
  };

  let body: string | null = null;
  if (to === "rejected") body = REJECTION_LABEL[opts.reason!] + (opts.note ? ` — ${opts.note}` : "");
  else if (leavingLimbo) body = "Reativada do Limbo";

  return {
    update,
    activity: { type: "stage_change" as const, fromStage: current.stage, toStage: to, body, occurredAt: now },
  };
}

/** Where a company reactivated from Limbo goes: last active stage in its history, else `potential`. */
export function reactivationTarget(history: { fromStage: Stage | null; toStage: Stage | null }[]): Stage {
  // history sorted newest first
  const entry = history.find((h) => h.toStage === "rejected" && h.fromStage && h.fromStage !== "rejected");
  return entry?.fromStage ?? "potential";
}

/** Spec bands: high 75–100, medium 45–74, low 0–44. Manual override wins. */
export function effectivePriority(c: { manualPriority: Priority | null; generatedScore: number | null }): Priority | null {
  if (c.manualPriority) return c.manualPriority;
  if (c.generatedScore == null) return null;
  return c.generatedScore >= 75 ? "high" : c.generatedScore >= 45 ? "medium" : "low";
}
