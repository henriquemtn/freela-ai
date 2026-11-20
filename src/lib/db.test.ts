import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";

// Read-only round trip through Postgres; skipped when no database is configured.
describe.skipIf(!process.env.DATABASE_URL)("db timestamptz handling", () => {
  afterAll(() => db.$disconnect());

  it("writes and reads instants without shifting by the server offset", async () => {
    const instant = new Date("2026-11-20T12:00:00Z");
    const [row] = await db.$queryRaw<{ asText: string; asDate: Date; literal: Date }[]>`
      select ${instant}::timestamptz::text as "asText",
             ${instant}::timestamptz as "asDate",
             '2026-11-20T12:00:00Z'::timestamptz as literal`;
    expect(row.asText).toBe("2026-11-20 12:00:00+00");
    expect(row.asDate.toISOString()).toBe(instant.toISOString());
    expect(row.literal.toISOString()).toBe(instant.toISOString());
  });
});
