import type { DealStatus, Stage } from "@/generated/prisma/enums";

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  open: "Em negociação",
  proposal: "Proposta enviada",
  won: "Fechado",
  lost: "Perdido",
};

const OPEN: DealStatus[] = ["open", "proposal"];
export const isOpenDeal = (status: DealStatus) => OPEN.includes(status);

/** Fields to persist when a deal changes status. Reopening clears closedAt; the first proposal date is kept. */
export function dealStatusUpdate(current: { proposalSentAt: Date | null }, to: DealStatus, now = new Date()) {
  return {
    status: to,
    proposalSentAt: to === "proposal" && !current.proposalSentAt ? now : current.proposalSentAt,
    closedAt: to === "won" || to === "lost" ? now : null,
  };
}

/**
 * Pipeline move implied by a deal event, or null:
 * - a new deal on a completed client reopens it (repeat business, same company record);
 * - winning a deal on a lead means the client hired: move to "working".
 */
export function stageAfterDeal(event: "created" | "won", stage: Stage): Stage | null {
  if (event === "created" && stage === "completed") return "in_progress";
  if (event === "won" && (stage === "potential" || stage === "contacted" || stage === "in_progress")) return "working";
  return null;
}

type PipelineCompany = {
  stage: Stage;
  estimatedValueCents: number | null;
  deals: { status: DealStatus; valueCents: number | null }[];
};

/** Open value of leads still being sold: open deals' values, or the company's estimate when it has no open deal. */
export function pipelineValueCents(companies: PipelineCompany[]): number {
  let total = 0;
  for (const c of companies) {
    if (c.stage !== "potential" && c.stage !== "contacted" && c.stage !== "in_progress") continue;
    const open = c.deals.filter((d) => isOpenDeal(d.status));
    total += open.length ? open.reduce((n, d) => n + (d.valueCents ?? 0), 0) : (c.estimatedValueCents ?? 0);
  }
  return total;
}
