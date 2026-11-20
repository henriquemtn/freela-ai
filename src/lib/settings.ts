import { z } from "zod";
import { db } from "@/lib/db";

const GOAL_KEY = "monthlyGoalCents";

/** Monthly income goal in cents, or null when not set. */
export async function getMonthlyGoalCents(): Promise<number | null> {
  const row = await db.setting.findUnique({ where: { key: GOAL_KEY } });
  const parsed = z.number().int().positive().safeParse(row?.value);
  return parsed.success ? parsed.data : null;
}

export async function setMonthlyGoalCents(cents: number | null) {
  if (cents == null) await db.setting.deleteMany({ where: { key: GOAL_KEY } });
  else await db.setting.upsert({ where: { key: GOAL_KEY }, create: { key: GOAL_KEY, value: cents }, update: { value: cents } });
}

const PROFILE_KEY = "profile";

export const profileSchema = z.object({
  name: z.string().trim().max(80).default(""),
  profession: z.string().trim().max(80).default(""),
  portfolioUrl: z.string().trim().max(300).default(""),
});
export type Profile = z.output<typeof profileSchema>;

/** The user's own details, used in outreach messages. Missing fields come back as "". */
export async function getProfile(): Promise<Profile> {
  const row = await db.setting.findUnique({ where: { key: PROFILE_KEY } });
  const parsed = profileSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : profileSchema.parse({});
}

export async function setProfile(profile: Profile) {
  await db.setting.upsert({ where: { key: PROFILE_KEY }, create: { key: PROFILE_KEY, value: profile }, update: { value: profile } });
}
