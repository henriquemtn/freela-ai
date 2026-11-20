import { describe, expect, it } from "vitest";
import { goalProgress, outreachByWeek, weeklyFocus, type FocusInput } from "./overview";

const now = new Date(2026, 10, 20, 12, 0); // Friday, Nov 20 2026 (local)

describe("goalProgress", () => {
  it("computes progress, remaining, days left (today included) and projection", () => {
    expect(goalProgress(500000, 200000, 150000, now)).toEqual({ pct: 0.4, remainingCents: 300000, daysLeft: 11, projectedPct: 0.7 });
    expect(goalProgress(100000, 150000, 0, now).remainingCents).toBe(0);
  });
});

describe("weeklyFocus", () => {
  const c = (o: Partial<FocusInput>): FocusInput => ({
    id: "x", name: "X", stage: "contacted", priority: null, score: null, nextActionAt: null, hasOpenProposal: false, ...o,
  });

  it("ranks by priority, boosted by overdue actions and proposals, with reasons", () => {
    const out = weeklyFocus(
      [
        c({ id: "low", priority: "low" }),
        c({ id: "high", priority: "high", score: 80 }),
        c({ id: "mediumOverdue", priority: "medium", nextActionAt: new Date(2026, 10, 18), hasOpenProposal: true }),
        c({ id: "client", stage: "working", priority: "high" }), // already a client: not a lead to focus
        c({ id: "nothing" }), // no priority, no signal
      ],
      now,
    );
    expect(out.map((o) => o.id)).toEqual(["mediumOverdue", "high", "low"]);
    expect(out[0].reasons).toEqual(["Ação atrasada", "Proposta aberta"]);
    expect(out[1].reasons).toEqual(["Score 80"]);
  });

  it("names the weekday of an upcoming action", () => {
    const [f] = weeklyFocus([c({ priority: "low", nextActionAt: new Date(2026, 10, 24, 10) })], now);
    expect(f.reasons).toEqual(["Próxima ação: ter"]);
  });
});

describe("outreachByWeek", () => {
  it("buckets by Monday-start weeks and keeps empty weeks", () => {
    const w = outreachByWeek([new Date(2026, 10, 16, 9), new Date(2026, 10, 20, 9), new Date(2026, 10, 10, 9)], now, 3);
    expect(w).toEqual([
      { label: "02/11", count: 0 },
      { label: "09/11", count: 1 },
      { label: "16/11", count: 2 },
    ]);
  });
});
