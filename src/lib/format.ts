import type { Priority, WebsiteStatus } from "@/generated/prisma/enums";

export const WEBSITE_LABEL: Record<WebsiteStatus, string> = {
  not_found: "No website",
  social_only: "Social only",
  outdated: "Outdated website",
  active: "Active website",
  unknown: "Not checked",
};

export const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High" };

/** "1.500,50" | "1500.5" | "1500" → cents. Empty → null. No floats: works on the string. */
export function parseMoneyToCents(input: string): number | null {
  let s = input.replace(/[R$\s]/g, "");
  if (!s) return null;
  // The last separator followed by 1-2 digits is the decimal one; the rest are thousands.
  const m = s.match(/^(.*?)[.,](\d{1,2})$/);
  const [int, dec] = m ? [m[1], m[2].padEnd(2, "0")] : [s, "00"];
  s = int.replace(/[.,]/g, "");
  if (!/^\d+$/.test(s)) throw new Error(`Invalid amount: ${input}`);
  return Number(s) * 100 + Number(dec);
}

export function centsToInput(cents: number | null) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

// Number/date format only (R$ 1.500,00 · 20/11/2026); UI text is English.
const LOCALE = "pt-BR";

const brl = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "BRL" });
export const formatBRL = (cents: number) => brl.format(cents / 100);

const dt = new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeStyle: "short" });
const d = new Intl.DateTimeFormat(LOCALE, { dateStyle: "short" });
export const formatDateTime = (v: Date) => dt.format(v);
export const formatDate = (v: Date) => d.format(v);

/** Date → <input type="datetime-local"> value in local time. */
export function toDateTimeLocal(v: Date | null) {
  if (!v) return "";
  const local = new Date(v.getTime() - v.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
