import { describe, expect, it } from "vitest";
import { matchCompany, type CompanyKey } from "./dedupe";
import { isMobilePhone, isSocialUrl, normalizeDomain, normalizeName, normalizePhone, presenceFromListing, websiteKey } from "./normalize";
import { claudeDiscoverySchema, toFoundPlaces } from "./providers";
import { preScore } from "./prescore";

describe("normalize", () => {
  it("phones: digits with BR country code", () => {
    expect(normalizePhone("(48) 3333-4444")).toBe("554833334444");
    expect(normalizePhone("(48) 99999-8888")).toBe("5548999998888");
    expect(normalizePhone("+55 48 3333-4444")).toBe("554833334444");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("(048) 99120-0826")).toBe("5548991200826");
    expect(isMobilePhone("(48) 99120-0826")).toBe(true);
    expect(isMobilePhone("+55 48 99120-0826")).toBe(true);
    expect(isMobilePhone("(48) 3269-5995")).toBe(false);
  });

  it("domains", () => {
    expect(normalizeDomain("https://www.Exemplo.com.br/contato")).toBe("exemplo.com.br");
    expect(normalizeDomain("exemplo.com.br")).toBe("exemplo.com.br");
    expect(normalizeDomain("not a url")).toBeNull();
    expect(normalizeDomain("")).toBeNull();
  });

  it("names drop accents, punctuation and legal suffixes", () => {
    expect(normalizeName("Padaria São José Ltda.")).toBe("padaria sao jose");
    expect(normalizeName("PADARIA SAO JOSE - ME")).toBe("padaria sao jose");
  });

  it("social URLs and presence from listing", () => {
    expect(isSocialUrl("https://www.instagram.com/padaria")).toBe(true);
    expect(isSocialUrl("https://m.facebook.com/padaria")).toBe(true);
    expect(isSocialUrl("https://padaria.com.br")).toBe(false);
    expect(presenceFromListing("https://instagram.com/x")).toBe("social_only");
    expect(presenceFromListing("https://padaria.com.br")).toBe("unknown");
    expect(presenceFromListing(null)).toBe("unknown"); // missing field is not proof of no site
  });

  it("website keys keep the profile path for social URLs", () => {
    expect(websiteKey("https://www.instagram.com/Padaria/")).toBe("instagram.com/padaria");
    expect(websiteKey("https://instagram.com")).toBeNull();
    expect(websiteKey("https://padaria.com.br/menu")).toBe("padaria.com.br");
  });
});

describe("matchCompany", () => {
  const company = (o: Partial<CompanyKey>): CompanyKey => ({
    id: "co1", provider: null, providerPlaceId: null, name: "Outra", city: null, phone: null, websiteUrl: null, ...o,
  });
  const cand = { provider: "sample", providerPlaceId: "p1", name: "Padaria Sol", city: "Florianópolis", phone: null, websiteUrl: null };

  it("same provider place is an exact duplicate", () => {
    expect(matchCompany(cand, [company({ provider: "sample", providerPlaceId: "p1" })])).toEqual({ kind: "exact", companyId: "co1" });
  });

  it("website, phone and name+city are only possible duplicates", () => {
    expect(matchCompany({ ...cand, websiteUrl: "https://padaria.com.br" }, [company({ websiteUrl: "http://www.padaria.com.br/x" })]))
      .toEqual({ kind: "possible", companyId: "co1", reason: "website" });
    expect(matchCompany({ ...cand, phone: "(48) 3333-4444" }, [company({ phone: "+55 48 33334444" })]))
      .toEqual({ kind: "possible", companyId: "co1", reason: "phone" });
    expect(matchCompany(cand, [company({ name: "PADARIA SOL LTDA", city: "Florianopolis" })]))
      .toEqual({ kind: "possible", companyId: "co1", reason: "name_city" });
  });

  it("different Instagram profiles are not duplicates", () => {
    expect(matchCompany({ ...cand, websiteUrl: "https://instagram.com/a" }, [company({ websiteUrl: "https://instagram.com/b" })])).toBeNull();
  });

  it("same name in another city is not a duplicate", () => {
    expect(matchCompany(cand, [company({ name: "Padaria Sol", city: "São José" })])).toBeNull();
  });
});

describe("Claude discovery output", () => {
  const business = {
    name: "Padaria São José Ltda",
    category: "Padaria",
    address: null,
    city: "Florianópolis",
    state: "SC",
    phone: "(48) 99133-4444",
    websiteUrl: null,
    instagramUrl: "instagram.com/padariasj",
    activityEvidence: "Post de 10/11/2026 indexado no Google",
    sourceUrl: "https://example.com/padaria",
  };

  it("drops businesses without a WhatsApp/mobile number or activity evidence", () => {
    const kept = toFoundPlaces(
      {
        businesses: [business, { ...business, phone: "(48) 3333-4444" }, { ...business, phone: null }, { ...business, activityEvidence: null }],
        limitations: [],
      },
      { area: "Florianópolis, SC", term: "padaria" },
    );
    expect(kept).toHaveLength(1);
  });

  it("requires a source for every business", () => {
    const noSource = { ...business, sourceUrl: undefined };
    expect(claudeDiscoverySchema.safeParse({ businesses: [noSource], limitations: [] }).success).toBe(false);
    expect(claudeDiscoverySchema.safeParse({ businesses: [business], limitations: [] }).success).toBe(true);
  });

  it("keys results by normalized name + city (falling back to the search area)", () => {
    const [a, b] = toFoundPlaces(
      { businesses: [business, { ...business, name: "PADARIA SAO JOSE", city: null }], limitations: [] },
      { area: "Florianópolis, SC", term: "padaria" },
    );
    expect(a.providerPlaceId).toBe("padaria sao jose|florianopolis");
    expect(b.providerPlaceId).toBe("padaria sao jose|florianopolis sc");
  });

  it("adds https:// to bare domains", () => {
    const [a] = toFoundPlaces(
      { businesses: [{ ...business, websiteUrl: "padaria.com.br", sourceUrl: "http://guia.com/x" }], limitations: [] },
      { area: "Florianópolis, SC", term: "padaria" },
    );
    expect(a.websiteUrl).toBe("https://padaria.com.br");
    expect(a.instagramUrl).toBe("https://instagram.com/padariasj");
    expect(a.sourceUrl).toBe("http://guia.com/x");
  });
});

describe("preScore", () => {
  const c = (o: Partial<{ websiteUrl: string | null; phone: string | null; address: string | null; activityEvidence: string | null }>) => ({
    websiteUrl: null, phone: null, address: null, activityEvidence: null, ...o,
  });

  it("social-only with phone and address ranks highest", () => {
    expect(preScore(c({ phone: "48 3333-4444", address: "Rua A", activityEvidence: "post 10/11" })).score).toBe(100);
  });

  it("no website alone stays low", () => {
    expect(preScore(c({})).score).toBe(40);
  });

  it("an own website lowers the rank", () => {
    const r = preScore(c({ websiteUrl: "https://padaria.com.br", phone: "1", address: "x", activityEvidence: "y" }));
    expect(r.score).toBe(70);
    expect(r.reasons).toEqual(["Já tem site", "Telefone", "Endereço", "Ativo recentemente"]);
  });
});
