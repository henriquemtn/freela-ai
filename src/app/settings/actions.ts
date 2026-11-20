"use server";

import { revalidatePath } from "next/cache";
import { parse } from "@/lib/form";
import { profileSchema, setProfile } from "@/lib/settings";

export async function saveProfile(fd: FormData) {
  const profile = parse(profileSchema, fd);
  // Store links with a scheme so they work when pasted in messages.
  if (profile.portfolioUrl && !/^https?:\/\//i.test(profile.portfolioUrl)) profile.portfolioUrl = `https://${profile.portfolioUrl}`;
  await setProfile(profile);
  revalidatePath("/", "layout");
}
