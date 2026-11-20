import { isSocialUrl } from "./normalize";

type Candidate = { websiteUrl: string | null; phone: string | null; address: string | null };

/**
 * Preliminary 0-100 ranking from search data alone, before research. Like the
 * full score, a missing website can't make a lead high on its own (max 40):
 * it also needs a way to reach them and signs the business exists.
 */
export function preScore(c: Candidate): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (!c.websiteUrl) {
    score += 40;
    reasons.push("Sem site encontrado");
  } else if (isSocialUrl(c.websiteUrl)) {
    score += 40;
    reasons.push("Só rede social");
  } else {
    score += 10;
    reasons.push("Já tem site");
  }
  if (c.phone) {
    score += 30;
    reasons.push("Telefone");
  }
  if (c.address) {
    score += 15;
    reasons.push("Endereço");
  }
  if (c.websiteUrl) {
    score += 15;
    reasons.push("Presença online ativa");
  }
  return { score, reasons };
}
