import { describe, expect, it } from "vitest";
import { effectivePriority } from "@/core/pipeline";
import { researchOutputSchema, type ResearchOutput } from "./schema";
import { scoreResearch } from "./score";

const base: ResearchOutput = {
  websiteStatus: "social_only",
  officialWebsite: null,
  websiteAssessment: "Só Instagram encontrado",
  socialProfiles: [{ platform: "instagram", url: "https://instagram.com/x" }],
  contactChannels: [
    { type: "whatsapp", value: "(48) 99999-0000", sourceUrl: "https://instagram.com/x" },
    { type: "instagram", value: "@x", sourceUrl: "https://instagram.com/x" },
  ],
  signals: {
    activeEvidence: { level: "strong", reason: "Posts recentes" },
    commercialPotential: { level: "high", reason: "Muitos clientes" },
    opportunityFit: { level: "strong", reason: "Agendamento só por DM" },
  },
  opportunities: [],
  suggestedServices: [],
  summary: "Resumo",
  confidence: 0.8,
  sources: [{ url: "https://instagram.com/x", title: "Instagram" }],
  limitations: [],
};

describe("scoreResearch", () => {
  it("adds up the spec weights with explanations", () => {
    const { score, breakdown } = scoreResearch(base);
    expect(score).toBe(100);
    expect(breakdown.map((b) => b.max).reduce((a, b) => a + b)).toBe(100);
    expect(breakdown.find((b) => b.key === "contactability")?.reason).toBe("Canais encontrados: WhatsApp, Instagram");
  });

  it("never rates high just because no website was found", () => {
    const weak = {
      ...base,
      websiteStatus: "not_found" as const,
      contactChannels: [],
      signals: {
        activeEvidence: { level: "none" as const, reason: "-" },
        commercialPotential: { level: "unknown" as const, reason: "-" },
        opportunityFit: { level: "none" as const, reason: "-" },
      },
    };
    const { score } = scoreResearch(weak);
    expect(score).toBe(25);
    expect(effectivePriority({ manualPriority: null, generatedScore: score })).toBe("low");
  });

  it("an active website scores zero on that criterion", () => {
    const { breakdown } = scoreResearch({ ...base, websiteStatus: "active" });
    expect(breakdown[0].points).toBe(0);
  });

  it("contactability: other channels alone give 5, direct alone 10", () => {
    const only = (type: "email" | "phone") => scoreResearch({ ...base, contactChannels: [{ type, value: "x", sourceUrl: "u" }] });
    expect(only("email").breakdown[3].points).toBe(5);
    expect(only("phone").breakdown[3].points).toBe(10);
  });
});

describe("researchOutputSchema", () => {
  it("rejects output without sources or with an invalid status", () => {
    expect(researchOutputSchema.safeParse(base).success).toBe(true);
    expect(researchOutputSchema.safeParse({ ...base, sources: [] }).success).toBe(false);
    expect(researchOutputSchema.safeParse({ ...base, websiteStatus: "maybe" }).success).toBe(false);
    expect(researchOutputSchema.safeParse({ ...base, confidence: 1.5 }).success).toBe(false);
  });
});
