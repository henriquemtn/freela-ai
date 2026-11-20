import { z } from "zod";

// Optional text field: "" becomes null.
export const opt = z.string().trim().transform((v) => v || null);

export const optEnum = <T extends Record<string, string>>(e: T) =>
  z.union([z.literal(""), z.enum(e)]).optional().transform((v) => v || null);

export const optDate = z
  .string()
  .transform((v) => (v ? new Date(v) : null)) // ponytail: datetime-local parsed in the server's timezone; fine while the app runs locally
  .refine((v) => v === null || !isNaN(v.getTime()), "Data inválida");

// Validates FormData; failures become a readable message for error.tsx.
export function parse<S extends z.ZodType>(schema: S, fd: FormData): z.output<S> {
  const r = schema.safeParse(Object.fromEntries(fd));
  if (!r.success) throw new Error(z.prettifyError(r.error));
  return r.data;
}
