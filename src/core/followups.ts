import type { Stage } from "@/generated/prisma/enums";

export type FollowUpInput = {
  id: string;
  name: string;
  stage: Stage;
  createdAt: Date;
  lastInteractionAt: Date | null;
  hasOpenTask: boolean;
  /** Messages, emails and calls logged so far (first contact included). */
  contactAttempts: number;
  /** Oldest still-open proposal's sent date. */
  proposalSentAt: Date | null;
};

export type Suggestion = {
  companyId: string;
  name: string;
  kind: "no_reply" | "give_up" | "stalled" | "proposal" | "check_in";
  days: number;
  message: string;
};

// Thresholds (days). Spec: help follow up, but avoid repeated unwanted follow-ups.
const NO_REPLY_DAYS = 3;
const MAX_ATTEMPTS = 3; // first contact + 2 follow-ups
const GIVE_UP_DAYS = 7;
const STALLED_DAYS = 7;
const PROPOSAL_DAYS = 5;
const CHECK_IN_DAYS = 90;

const daysSince = (d: Date, now: Date) => Math.floor((now.getTime() - d.getTime()) / 86_400_000);

/** Who needs a next step. Companies with an open task are skipped: their next step already exists. */
export function followUpSuggestions(companies: FollowUpInput[], now = new Date()): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of companies) {
    if (c.hasOpenTask) continue;
    const days = daysSince(c.lastInteractionAt ?? c.createdAt, now);
    const base = { companyId: c.id, name: c.name, days };

    if (c.proposalSentAt && daysSince(c.proposalSentAt, now) >= PROPOSAL_DAYS) {
      const d = daysSince(c.proposalSentAt, now);
      out.push({ ...base, days: d, kind: "proposal", message: `Proposta enviada há ${d} dias sem resposta` });
    } else if (c.stage === "contacted" && c.contactAttempts >= MAX_ATTEMPTS) {
      if (days >= GIVE_UP_DAYS)
        out.push({ ...base, kind: "give_up", message: `Sem resposta após ${c.contactAttempts} contatos; considere o Limbo` });
    } else if (c.stage === "contacted" && days >= NO_REPLY_DAYS) {
      out.push({ ...base, kind: "no_reply", message: `Sem resposta há ${days} dias` });
    } else if (c.stage === "in_progress" && days >= STALLED_DAYS) {
      out.push({ ...base, kind: "stalled", message: `Negociação parada há ${days} dias` });
    } else if (c.stage === "completed" && days >= CHECK_IN_DAYS) {
      out.push({ ...base, kind: "check_in", message: `Cliente sem contato há ${days} dias: ofereça manutenção ou um novo projeto` });
    }
  }
  return out.sort((a, b) => b.days - a.days);
}
