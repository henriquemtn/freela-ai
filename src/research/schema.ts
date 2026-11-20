import { z } from "zod";
import { WebsiteStatus } from "@/generated/prisma/enums";

const reason = z.string().trim().min(1).describe("Short justification grounded in the sources");

/** What the research agent must return. Validated by the CLI (JSON Schema) and again here. */
export const researchOutputSchema = z.object({
  websiteStatus: z
    .enum(WebsiteStatus)
    .describe(
      "not_found: no standalone site after searching; social_only: only social/directory profiles; outdated: site exists but is clearly outdated or deficient; active: working, reasonably current site; unknown: not enough evidence",
    ),
  officialWebsite: z.string().nullable().describe("Official standalone website URL, or null"),
  websiteAssessment: reason.describe("Why this website status, citing what was checked"),
  socialProfiles: z.array(z.object({ platform: z.string(), url: z.string() })).max(6),
  contactChannels: z
    .array(
      z.object({
        type: z.enum(["phone", "whatsapp", "email", "instagram", "other"]),
        value: z.string().trim().min(1).describe("Exactly as published by the business"),
        sourceUrl: z.string().describe("Page where it is published"),
      }),
    )
    .max(8)
    .describe("Public business contact channels only, never personal data of individuals"),
  signals: z.object({
    activeEvidence: z.object({ level: z.enum(["strong", "some", "none"]), reason }),
    commercialPotential: z.object({ level: z.enum(["high", "medium", "low", "unknown"]), reason }),
    opportunityFit: z.object({ level: z.enum(["strong", "moderate", "weak", "none"]), reason }),
  }),
  opportunities: z
    .array(z.object({ title: z.string(), description: z.string(), evidence: z.array(z.string()).describe("Source URLs") }))
    .max(5),
  suggestedServices: z.array(z.object({ service: z.string(), reason: z.string() })).max(4),
  summary: z.string().trim().min(1).describe("2-3 sentences in Brazilian Portuguese"),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.object({ url: z.string(), title: z.string() })).min(1),
  limitations: z.array(z.string()),
});

export type ResearchOutput = z.output<typeof researchOutputSchema>;
