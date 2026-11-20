import type { WebsiteStatus } from "@/generated/prisma/enums";
import { normalizePhone } from "@/discovery/normalize";

export const TEMPLATE_VARS = [
  { key: "nome", label: "Primeiro nome do contato, ou o nome da empresa" },
  { key: "empresa", label: "Nome curto da empresa" },
  { key: "categoria", label: "Categoria, em minúsculas" },
  { key: "cidade", label: "Cidade" },
  { key: "link", label: "Site ou perfil (sem https://)" },
] as const;

type VarKey = (typeof TEMPLATE_VARS)[number]["key"];
export type OutreachVars = Record<VarKey, string | null>;

/** "Leonardo Barbearia | Trindade" / "Pai e Filho - Jurerê" / "Brimo (Centro)" → the part before the qualifier. */
export function shortName(name: string): string {
  return name.split(/\s+[|–—-]\s+|\s*\(/)[0].trim() || name.trim();
}

export function outreachVars(
  company: { name: string; category: string | null; city: string | null; websiteUrl: string | null },
  contacts: { name: string | null; optedOut: boolean }[],
): OutreachVars {
  const person = contacts.find((c) => c.name && !c.optedOut)?.name?.trim().split(/\s+/)[0];
  return {
    nome: person ?? shortName(company.name),
    empresa: shortName(company.name),
    categoria: company.category?.toLocaleLowerCase("pt-BR") ?? null,
    cidade: company.city,
    link: company.websiteUrl?.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "") ?? null,
  };
}

/** Fills {vars}. Known vars without a value stay as {var} and are reported, so gaps are visible. */
export function renderTemplate(body: string, vars: OutreachVars): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const text = body.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!(key in vars)) return match;
    const value = vars[key as VarKey];
    if (!value) missing.add(key);
    return value || match;
  });
  return { text, missing: [...missing] };
}

/** Template for the company's presence; "unknown" falls back to the no-website one, then to the first. */
export function pickTemplate<T extends { websiteStatus: WebsiteStatus | null }>(templates: T[], status: WebsiteStatus): T | undefined {
  return (
    templates.find((t) => t.websiteStatus === status) ??
    (status === "unknown" ? templates.find((t) => t.websiteStatus === "not_found") : undefined) ??
    templates[0]
  );
}

export function whatsappUrl(phone: string | null, text: string): string | null {
  const digits = normalizePhone(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}
