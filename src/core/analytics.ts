import type { DealStatus, Stage } from "@/generated/prisma/enums";
import { ACTIVE_STAGES } from "./pipeline";

/** Below this many companies/decided deals, rates are noise; the UI says "dados insuficientes". */
export const MIN_SAMPLE = 5;

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Won revenue per calendar month (server local time), oldest first, including empty months. */
export function revenueByMonth(won: { valueCents: number | null; closedAt: Date | null }[], now = new Date(), months = 6) {
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, cents: 0 };
  });
  for (const d of won) {
    if (!d.closedAt) continue;
    const b = buckets.find((x) => x.year === d.closedAt!.getFullYear() && x.month === d.closedAt!.getMonth());
    if (b) b.cents += d.valueCents ?? 0;
  }
  return buckets.map(({ label, cents }) => ({ label, cents }));
}

export function dealStats(deals: { status: DealStatus; valueCents: number | null }[]) {
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost").length;
  const revenue = won.reduce((n, d) => n + (d.valueCents ?? 0), 0);
  const decided = won.length + lost;
  return {
    won: won.length,
    lost,
    revenueCents: revenue,
    averageTicketCents: won.length ? Math.round(revenue / won.length) : null,
    winRate: decided ? won.length / decided : null,
    enoughData: decided >= MIN_SAMPLE,
  };
}

/**
 * Conversion funnel: how many companies ever reached each active stage (from
 * their current stage and stage history, so Limbo leads count up to where they got).
 */
export function funnel(companies: { stage: Stage; visited: Stage[] }[]) {
  const index = (s: Stage) => (ACTIVE_STAGES as readonly Stage[]).indexOf(s);
  const reached = companies.map((c) => Math.max(0, ...[c.stage, ...c.visited].map(index)));
  return ACTIVE_STAGES.map((stage, i) => {
    const count = reached.filter((r) => r >= i).length;
    const prev = i === 0 ? null : reached.filter((r) => r >= i - 1).length;
    return { stage, count, rate: prev ? count / prev : null };
  });
}
