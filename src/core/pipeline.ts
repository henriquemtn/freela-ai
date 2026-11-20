import type { Priority, RejectionReason, Stage } from "@/generated/prisma/enums";

export const ACTIVE_STAGES = ["potential", "contacted", "in_progress", "working", "completed"] as const satisfies Stage[];

export const STAGE_LABEL: Record<Stage, string> = {
  potential: "Potential client",
  contacted: "Contact made",
  in_progress: "In progress",
  working: "Working",
  completed: "Completed",
  rejected: "Limbo",
};

export const REJECTION_LABEL: Record<RejectionReason, string> = {
  no_interest: "No interest",
  no_response: "No response",
  already_has_provider: "Already has a provider",
  no_budget: "No budget",
  not_a_fit: "Not a fit",
  invalid_business: "Invalid business",
  duplicate: "Duplicate",
  other: "Other",
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
  if (current.stage === to) throw new Error(`Company is already in "${STAGE_LABEL[to]}"`);
  if (to === "rejected" && !opts.reason) throw new Error("A reason is required to move to Limbo");

  const leavingLimbo = current.stage === "rejected";
  const update = {
    stage: to,
    closedAt: to === "rejected" || to === "completed" ? now : null,
    rejectionReason: to === "rejected" ? opts.reason! : null,
    rejectionNote: to === "rejected" ? (opts.note ?? null) : null,
  };

  let body: string | null = null;
  if (to === "rejected") body = REJECTION_LABEL[opts.reason!] + (opts.note ? ` — ${opts.note}` : "");
  else if (leavingLimbo) body = "Reactivated from Limbo";

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
