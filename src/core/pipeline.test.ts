import { describe, expect, it } from "vitest";
import { effectivePriority, reactivationTarget, transition } from "./pipeline";

const now = new Date("2026-11-20T12:00:00Z");

describe("transition", () => {
  it("moves between active stages and records an activity", () => {
    const r = transition({ stage: "potential" }, "contacted", { now });
    expect(r.update).toEqual({ stage: "contacted", closedAt: null, rejectionReason: null, rejectionNote: null });
    expect(r.activity).toMatchObject({ type: "stage_change", fromStage: "potential", toStage: "contacted" });
  });

  it("rejects moving to the same stage", () => {
    expect(() => transition({ stage: "working" }, "working")).toThrow();
  });

  it("Limbo requires a reason and stores reason/note/closedAt", () => {
    expect(() => transition({ stage: "contacted" }, "rejected")).toThrow(/reason/);
    const r = transition({ stage: "contacted" }, "rejected", { reason: "no_budget", note: "back in March", now });
    expect(r.update).toMatchObject({ stage: "rejected", rejectionReason: "no_budget", rejectionNote: "back in March", closedAt: now });
    expect(r.activity.body).toBe("No budget — back in March");
  });

  it("completing sets closedAt; reopening clears it", () => {
    expect(transition({ stage: "working" }, "completed", { now }).update.closedAt).toBe(now);
    expect(transition({ stage: "completed" }, "in_progress", { now }).update.closedAt).toBeNull();
  });

  it("leaving Limbo clears the reason and notes the reactivation", () => {
    const r = transition({ stage: "rejected" }, "contacted", { now });
    expect(r.update.rejectionReason).toBeNull();
    expect(r.activity.body).toBe("Reactivated from Limbo");
  });
});

describe("reactivationTarget", () => {
  it("returns the stage before the most recent move to Limbo", () => {
    const history = [
      { fromStage: "in_progress" as const, toStage: "rejected" as const },
      { fromStage: "contacted" as const, toStage: "in_progress" as const },
      { fromStage: "potential" as const, toStage: "rejected" as const },
    ];
    expect(reactivationTarget(history)).toBe("in_progress");
  });

  it("falls back to potential without history", () => {
    expect(reactivationTarget([])).toBe("potential");
  });
});

describe("effectivePriority", () => {
  it("uses score bands and respects manual override", () => {
    expect(effectivePriority({ manualPriority: null, generatedScore: 75 })).toBe("high");
    expect(effectivePriority({ manualPriority: null, generatedScore: 74 })).toBe("medium");
    expect(effectivePriority({ manualPriority: null, generatedScore: 44 })).toBe("low");
    expect(effectivePriority({ manualPriority: "low", generatedScore: 90 })).toBe("low");
    expect(effectivePriority({ manualPriority: null, generatedScore: null })).toBeNull();
  });
});
