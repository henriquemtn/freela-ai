import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const config = {
  connectionString: process.env.DATABASE_URL,
  // adapter-pg sends and parses timestamps without an offset; a UTC session
  // keeps timestamptz values correct (otherwise they shift by the server offset).
  options: "-c timezone=UTC",
};

// Reuse the client across `next dev` hot reloads, unless it is stale: after
// `prisma generate` the PrismaClient class itself is reloaded (new models), and
// after a config change the key differs.
const key = JSON.stringify(config);
const g = globalThis as unknown as { db?: PrismaClient; dbKey?: string };

if (g.db && (!(g.db instanceof PrismaClient) || g.dbKey !== key)) {
  void (g.db as PrismaClient).$disconnect();
  g.db = undefined;
}

export const db = g.db ?? new PrismaClient({ adapter: new PrismaPg(config) });

if (process.env.NODE_ENV !== "production") Object.assign(g, { db, dbKey: key });
