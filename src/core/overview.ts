import type { Priority, Stage } from "@/generated/prisma/enums";

/** Progress toward the monthly income goal (won deals closed this month). */
export function goalProgress(goalCents: number, earnedCents: number, openProposalsCents: number, now = new Date()) {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    pct: goalCents > 0 ? earnedCents / goalCents : 0,
    remainingCents: Math.max(0, goalCents - earnedCents),
    daysLeft: lastDay - now.getDate() + 1, // today included
    // If every open proposal closed this month.
    projectedPct: goalCents > 0 ? (earnedCents + openProposalsCents) / goalCents : 0,
  };
}

export type FocusInput = {
  id: string;
  name: string;
  stage: Stage;
  priority: Priority | null;
  score: number | null;
  nextActionAt: Date | null;
  hasOpenProposal: boolean;
};

const PRIORITY_WEIGHT = { high: 30, medium: 20, low: 10 } as const;
const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * Leads worth attention this week: priority first, boosted by overdue or
 * this-week actions, open proposals and active negotiation. Explains why.
 */
export function weeklyFocus(companies: FocusInput[], now = new Date(), limit = 6) {
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  return companies
    .filter((c) => c.stage === "potential" || c.stage === "contacted" || c.stage === "in_progress")
    .map((c) => {
      const reasons: string[] = [];
      let points = c.priority ? PRIORITY_WEIGHT[c.priority] : 0;
      if (c.nextActionAt && c.nextActionAt < now) {
        points += 8;
        reasons.push("Ação atrasada");
      } else if (c.nextActionAt && c.nextActionAt <= weekAhead) {
        points += 5;
        reasons.push(`Próxima ação: ${WEEKDAY[c.nextActionAt.getDay()]}`);
      }
      if (c.hasOpenProposal) {
        points += 6;
        reasons.push("Proposta aberta");
      }
      if (c.stage === "in_progress") {
        points += 3;
        reasons.push("Em negociação");
      }
      if (c.score != null) reasons.push(`Score ${c.score}`);
      return { ...c, points, reasons };
    })
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

/** Outreach attempts per week (weeks start Monday), oldest first, including empty weeks. */
export function outreachByWeek(dates: Date[], now = new Date(), weeks = 8) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const starts = Array.from({ length: weeks }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * (weeks - 1 - i)));
  return starts.map((start, i) => {
    const end = starts[i + 1] ?? new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
    return {
      label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
      count: dates.filter((d) => d >= start && d < end).length,
    };
  });
}
