import type { WebsiteStatus } from "@/generated/prisma/enums";

/** Digits only, with Brazil's country code added to bare 10/11-digit numbers. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

/** "https://www.Example.com.br/x" → "example.com.br". Invalid → null. */
export function normalizeDomain(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Lowercase, no accents, no punctuation, no legal suffixes: "Padaria São José Ltda." → "padaria sao jose". */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ltda|me|eireli|epp|s a|sa)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Social networks and directory/link pages: a listing "website" here is not a standalone site.
const SOCIAL_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "wa.me",
  "whatsapp.com",
  "linktr.ee",
  "tiktok.com",
  "youtube.com",
  "linkedin.com",
  "ifood.com.br",
  "booksy.com",
  "sites.google.com",
];

export function isSocialUrl(url: string | null | undefined): boolean {
  const domain = normalizeDomain(url);
  return !!domain && SOCIAL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/**
 * Initial presence from the listing alone. Per spec, a missing website field is
 * not proof of no website, so only "social_only" can be inferred here; real
 * verification happens in research (Phase 4).
 */
export function presenceFromListing(websiteUrl: string | null, instagramUrl: string | null = null): WebsiteStatus {
  return (websiteUrl && isSocialUrl(websiteUrl)) || (!websiteUrl && instagramUrl) ? "social_only" : "unknown";
}

/** Dedupe key for a website: the domain, or domain + profile path for social/directory URLs. */
export function websiteKey(url: string | null | undefined): string | null {
  const domain = normalizeDomain(url);
  if (!domain || !isSocialUrl(url)) return domain;
  try {
    const path = new URL(/^https?:\/\//i.test(url!) ? url! : `https://${url}`).pathname.toLowerCase().replace(/\/+$/, "");
    return path ? `${domain}${path}` : null; // bare instagram.com identifies nobody
  } catch {
    return null;
  }
}
