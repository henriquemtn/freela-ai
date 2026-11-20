import { normalizeName, normalizePhone, websiteKey } from "./normalize";

export type CandidateKey = {
  provider: string;
  providerPlaceId: string;
  name: string;
  city: string | null;
  phone: string | null;
  websiteUrl: string | null;
};

export type CompanyKey = {
  id: string;
  provider: string | null;
  providerPlaceId: string | null;
  name: string;
  city: string | null;
  phone: string | null;
  websiteUrl: string | null;
};

export type Match =
  | { kind: "exact"; companyId: string } // same provider place: safe to mark as duplicate
  | { kind: "possible"; companyId: string; reason: "website" | "phone" | "name_city" } // needs human review
  | null;

/**
 * Matches a candidate against existing companies. Only the provider place ID is
 * treated as certain; website, phone and name+city are flagged for review, never merged.
 */
// ponytail: linear scan over all companies; index by key in a Map if the CRM grows past ~10k companies.
export function matchCompany(c: CandidateKey, companies: CompanyKey[]): Match {
  const exact = companies.find((co) => co.provider === c.provider && co.providerPlaceId === c.providerPlaceId);
  if (exact) return { kind: "exact", companyId: exact.id };

  const site = websiteKey(c.websiteUrl);
  const phone = normalizePhone(c.phone);
  const nameCity = c.city ? `${normalizeName(c.name)}|${normalizeName(c.city)}` : null;

  for (const co of companies) {
    if (site && websiteKey(co.websiteUrl) === site) return { kind: "possible", companyId: co.id, reason: "website" };
    if (phone && normalizePhone(co.phone) === phone) return { kind: "possible", companyId: co.id, reason: "phone" };
    if (nameCity && co.city && `${normalizeName(co.name)}|${normalizeName(co.city)}` === nameCity)
      return { kind: "possible", companyId: co.id, reason: "name_city" };
  }
  return null;
}
