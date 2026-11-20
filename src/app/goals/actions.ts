"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parse } from "@/lib/form";
import { parseMoneyToCents } from "@/lib/format";
import { setMonthlyGoalCents } from "@/lib/settings";

const goalSchema = z.object({ goal: z.string().transform(parseMoneyToCents) });

/** Empty value clears the goal. */
export async function saveMonthlyGoal(fd: FormData) {
  const { goal } = parse(goalSchema, fd);
  await setMonthlyGoalCents(goal && goal > 0 ? goal : null);
  revalidatePath("/");
}
