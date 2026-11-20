import { describe, expect, it } from "vitest";
import { dueStatus, nextActionFrom } from "./tasks";

const now = new Date(2026, 10, 20, 14, 0); // local time
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0);

describe("dueStatus", () => {
  it("classifies open tasks by due date", () => {
    expect(dueStatus({ dueAt: at(19, 9), completedAt: null }, now)).toBe("overdue");
    expect(dueStatus({ dueAt: at(20, 9), completedAt: null }, now)).toBe("overdue"); // earlier today
    expect(dueStatus({ dueAt: at(20, 18), completedAt: null }, now)).toBe("today");
    expect(dueStatus({ dueAt: at(21, 9), completedAt: null }, now)).toBe("upcoming");
    expect(dueStatus({ dueAt: null, completedAt: null }, now)).toBe("no_date");
  });

  it("completed wins over due date", () => {
    expect(dueStatus({ dueAt: at(1, 9), completedAt: at(2, 9) }, now)).toBe("done");
  });
});

describe("nextActionFrom", () => {
  it("returns the earliest due date among open tasks", () => {
    expect(
      nextActionFrom([
        { dueAt: at(25, 9), completedAt: null },
        { dueAt: at(18, 9), completedAt: at(18, 10) }, // done: ignored
        { dueAt: null, completedAt: null },
        { dueAt: at(22, 9), completedAt: null },
      ]),
    ).toEqual(at(22, 9));
  });

  it("is null when nothing is open with a date", () => {
    expect(nextActionFrom([{ dueAt: null, completedAt: null }])).toBeNull();
    expect(nextActionFrom([])).toBeNull();
  });
});
