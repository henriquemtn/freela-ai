import type { CandidateStatus, RunStatus } from "@/generated/prisma/enums";

export const PROVIDER_LABEL: Record<string, string> = { claude: "Claude (busca na web)", sample: "Dados de exemplo" };

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  queued: "Na fila",
  running: "Executando",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  pending: "Para revisar",
  promoted: "Adicionada ao CRM",
  dismissed: "Descartada",
  duplicate: "Já no CRM",
};

export const DUPLICATE_REASON_LABEL = { website: "mesmo site", phone: "mesmo telefone", name_city: "mesmo nome e cidade" };
