import { describe, expect, it } from "vitest";
import { dealStats, funnel, revenueByMonth } from "./analytics";
import { dealStatusUpdate, pipelineValueCents, stageAfterDeal } from "./deals";
import { followUpSuggestions, type FollowUpInput } from "./followups";

const now = new Date(2026, 10, 20, 12, 0); // local
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("deals", () => {
  it("status update stamps proposal once and closes/reopens", () => {
    const sent = dealStatusUpdate({ proposalSentAt: null }, "proposal", now);
    expect(sent).toEqual({ status: "proposal", proposalSentAt: now, closedAt: null });
    const later = new Date(now.getTime() + 1000);
    expect(dealStatusUpdate({ proposalSentAt: now }, "proposal", later).proposalSentAt).toBe(now);
    expect(dealStatusUpdate({ proposalSentAt: null }, "won", now).closedAt).toBe(now);
    expect(dealStatusUpdate({ proposalSentAt: now }, "open", now).closedAt).toBeNull();
  });

  it("stage effects: new deal reopens a completed client; won moves leads to working", () => {
    expect(stageAfterDeal("created", "completed")).toBe("in_progress");
    expect(stageAfterDeal("created", "contacted")).toBeNull();
    expect(stageAfterDeal("won", "in_progress")).toBe("working");
    expect(stageAfterDeal("won", "working")).toBeNull();
    expect(stageAfterDeal("won", "rejected")).toBeNull();
  });

  it("pipeline value uses open deals, else the estimate, only for leads", () => {
    expect(
      pipelineValueCents([
        { stage: "contacted", estimatedValueCents: 100, deals: [{ status: "open", valueCents: 500 }, { status: "lost", valueCents: 900 }] },
        { stage: "potential", estimatedValueCents: 200, deals: [] },
        { stage: "in_progress", estimatedValueCents: 300, deals: [{ status: "won", valueCents: 999 }] },
        { stage: "working", estimatedValueCents: 1000, deals: [{ status: "open", valueCents: 1000 }] },
      ]),
    ).toBe(500 + 200 + 300);
  });
});

describe("followUpSuggestions", () => {
  const c = (o: Partial<FollowUpInput>): FollowUpInput => ({
    id: "c", name: "Empresa", stage: "contacted", createdAt: daysAgo(30), lastInteractionAt: daysAgo(4),
    hasOpenTask: false, contactAttempts: 1, proposalSentAt: null, ...o,
  });

  it("suggests a follow-up after 3 days without reply", () => {
    expect(followUpSuggestions([c({})], now)[0]).toMatchObject({ kind: "no_reply", days: 4 });
    expect(followUpSuggestions([c({ lastInteractionAt: daysAgo(2) })], now)).toEqual([]);
  });

  it("stops insisting after 3 attempts and suggests Limbo after a week", () => {
    expect(followUpSuggestions([c({ contactAttempts: 3, lastInteractionAt: daysAgo(4) })], now)).toEqual([]);
    expect(followUpSuggestions([c({ contactAttempts: 3, lastInteractionAt: daysAgo(8) })], now)[0].kind).toBe("give_up");
  });

  it("skips companies that already have an open task", () => {
    expect(followUpSuggestions([c({ hasOpenTask: true, lastInteractionAt: daysAgo(30) })], now)).toEqual([]);
  });

  it("covers proposals, stalled negotiations and old clients, oldest first", () => {
    const out = followUpSuggestions(
      [
        c({ id: "p", stage: "in_progress", proposalSentAt: daysAgo(6), lastInteractionAt: daysAgo(6) }),
        c({ id: "s", stage: "in_progress", lastInteractionAt: daysAgo(10) }),
        c({ id: "k", stage: "completed", lastInteractionAt: daysAgo(120) }),
        c({ id: "w", stage: "working", lastInteractionAt: daysAgo(200) }), // active work: no nagging
      ],
      now,
    );
    expect(out.map((s) => [s.companyId, s.kind])).toEqual([["k", "check_in"], ["s", "stalled"], ["p", "proposal"]]);
  });
});

describe("analytics", () => {
  it("revenue per month includes empty months and ignores older ones", () => {
    const r = revenueByMonth(
      [
        { valueCents: 1000, closedAt: new Date(2026, 10, 3) },
        { valueCents: 500, closedAt: new Date(2026, 10, 18) },
        { valueCents: 700, closedAt: new Date(2026, 8, 1) },
        { valueCents: 999, closedAt: new Date(2025, 0, 1) },
      ],
      now,
      3,
    );
    expect(r).toEqual([{ label: "set/26", cents: 700 }, { label: "out/26", cents: 0 }, { label: "nov/26", cents: 1500 }]);
  });

  it("deal stats", () => {
    const s = dealStats([{ status: "won", valueCents: 1000 }, { status: "won", valueCents: 3000 }, { status: "lost", valueCents: 500 }, { status: "open", valueCents: 1 }]);
    expect(s).toMatchObject({ won: 2, lost: 1, revenueCents: 4000, averageTicketCents: 2000, enoughData: false });
    expect(s.winRate).toBeCloseTo(2 / 3);
  });

  it("funnel counts the furthest stage each company reached, Limbo included", () => {
    const f = funnel([
      { stage: "potential", visited: [] },
      { stage: "rejected", visited: ["potential", "contacted", "rejected"] },
      { stage: "working", visited: ["potential", "contacted", "in_progress", "working"] },
      { stage: "contacted", visited: ["potential", "contacted"] },
    ]);
    expect(f.map((s) => s.count)).toEqual([4, 3, 1, 1, 0]);
    expect(f[1].rate).toBeCloseTo(3 / 4);
    expect(f[0].rate).toBeNull();
  });
});
