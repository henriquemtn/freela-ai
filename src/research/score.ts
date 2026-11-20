import type { WebsiteStatus } from "@/generated/prisma/enums";
import type { ResearchOutput } from "./schema";

export type ScoreItem = { key: string; label: string; points: number; max: number; reason: string };

// Spec section 10 weights. The agent reports levels; points are fixed here so
// the score is explainable and stable across runs.
const WEBSITE: Record<WebsiteStatus, [number, string]> = {
  not_found: [25, "Nenhum site próprio encontrado"],
  social_only: [25, "Presença só em redes sociais ou diretórios"],
  outdated: [15, "Site existe, mas está desatualizado"],
  unknown: [5, "Não foi possível confirmar a presença"],
  active: [0, "Já tem um site ativo"],
};
const COMMERCIAL = { high: 25, medium: 15, low: 5, unknown: 0 } as const;
const ACTIVE = { strong: 15, some: 8, none: 0 } as const;
const OPPORTUNITY = { strong: 20, moderate: 12, weak: 5, none: 0 } as const;

const CONTACT_LABEL = { phone: "telefone", whatsapp: "WhatsApp", email: "e-mail", instagram: "Instagram", other: "outro" };

/** Phone/WhatsApp is worth 10, any other channel 5 more, capped at 15. */
function contactability(channels: ResearchOutput["contactChannels"]): ScoreItem {
  const types = [...new Set(channels.map((c) => c.type))];
  const direct = types.some((t) => t === "phone" || t === "whatsapp");
  const other = types.some((t) => t !== "phone" && t !== "whatsapp");
  return {
    key: "contactability",
    label: "Contato público",
    points: Math.min(15, (direct ? 10 : 0) + (other ? 5 : 0)),
    max: 15,
    reason: types.length ? `Canais encontrados: ${types.map((t) => CONTACT_LABEL[t]).join(", ")}` : "Nenhum canal público encontrado",
  };
}

export function scoreResearch(r: ResearchOutput): { score: number; breakdown: ScoreItem[] } {
  const [webPoints, webReason] = WEBSITE[r.websiteStatus];
  const s = r.signals;
  const breakdown: ScoreItem[] = [
    { key: "website", label: "Sem site próprio", points: webPoints, max: 25, reason: webReason },
    { key: "commercial", label: "Potencial comercial", points: COMMERCIAL[s.commercialPotential.level], max: 25, reason: s.commercialPotential.reason },
    { key: "active", label: "Empresa ativa", points: ACTIVE[s.activeEvidence.level], max: 15, reason: s.activeEvidence.reason },
    contactability(r.contactChannels),
    { key: "opportunity", label: "Oportunidade digital", points: OPPORTUNITY[s.opportunityFit.level], max: 20, reason: s.opportunityFit.reason },
  ];
  return { score: breakdown.reduce((n, b) => n + b.points, 0), breakdown };
}
