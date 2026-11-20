import { describe, expect, it } from "vitest";
import { centsToInput, parseMoneyToCents } from "./format";

describe("parseMoneyToCents", () => {
  it.each([
    ["1500", 150000],
    ["1.500", 150000],
    ["1.500,5", 150050],
    ["1.500,50", 150050],
    ["1500.50", 150050],
    ["R$ 2.300,00", 230000],
    ["0,99", 99],
    ["1.234.567,89", 123456789],
  ])("%s → %i", (input, cents) => expect(parseMoneyToCents(input)).toBe(cents));

  it("empty → null", () => expect(parseMoneyToCents("  ")).toBeNull());
  it("garbage → error", () => expect(() => parseMoneyToCents("abc")).toThrow());
  it("round trip", () => expect(parseMoneyToCents(centsToInput(150050))).toBe(150050));
});
