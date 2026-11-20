import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEAL_STATUS_LABEL, isOpenDeal } from "@/core/deals";
import { centsToInput, formatBRL, formatDate } from "@/lib/format";
import type { Deal } from "@/generated/prisma/client";
import type { DealStatus, Stage } from "@/generated/prisma/enums";
import { createDeal, deleteDeal, setDealStatus, updateDeal } from "@/app/deals/actions";

const NEXT: Record<DealStatus, { to: DealStatus; label: string; variant?: "default" | "secondary" | "ghost" }[]> = {
  open: [
    { to: "proposal", label: "Proposta enviada", variant: "secondary" },
    { to: "won", label: "Fechou" },
    { to: "lost", label: "Perdeu", variant: "ghost" },
  ],
  proposal: [
    { to: "won", label: "Fechou" },
    { to: "lost", label: "Perdeu", variant: "ghost" },
  ],
  won: [{ to: "open", label: "Reabrir", variant: "ghost" }],
  lost: [{ to: "open", label: "Reabrir", variant: "ghost" }],
};

function DealFields({ d }: { d?: Deal }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Input name="title" required placeholder="Ex.: Site institucional" defaultValue={d?.title} className="sm:col-span-2" />
      <Input name="service" placeholder="Serviço (opcional)" defaultValue={d?.service ?? ""} />
      <Input name="value" inputMode="decimal" placeholder="Valor (R$)" defaultValue={centsToInput(d?.valueCents ?? null)} />
      <Input name="notes" placeholder="Notas (opcional)" defaultValue={d?.notes ?? ""} className="sm:col-span-2" />
    </div>
  );
}

export function DealsCard({ companyId, deals, stage }: { companyId: string; deals: Deal[]; stage: Stage }) {
  const repeat = stage === "completed";
  return (
    <Card>
      <CardHeader><CardTitle>Negócios</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {deals.map((d) => (
          <div key={d.id} className="space-y-2 rounded-xl border border-border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-muted-foreground">
                  {[d.service, d.proposalSentAt && `proposta em ${formatDate(d.proposalSentAt)}`, d.closedAt && `encerrado em ${formatDate(d.closedAt)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {d.valueCents != null && <span className="font-medium tabular-nums">{formatBRL(d.valueCents)}</span>}
                <Badge variant={d.status === "won" ? "default" : d.status === "lost" ? "destructive" : "outline"}>{DEAL_STATUS_LABEL[d.status]}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {NEXT[d.status].map((n) => (
                <form key={n.to} action={setDealStatus.bind(null, d.id, n.to)}>
                  <Button type="submit" size="sm" variant={n.variant ?? "default"}>{n.label}</Button>
                </form>
              ))}
            </div>
            {/* ponytail: <details> as edit mode, no client state */}
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Editar</summary>
              <form action={updateDeal.bind(null, d.id)} className="mt-2 space-y-2">
                <DealFields d={d} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Salvar</Button>
                  <Button formAction={deleteDeal.bind(null, d.id)} size="sm" variant="ghost" className="text-destructive">
                    <Trash2 /> Excluir
                  </Button>
                </div>
              </form>
            </details>
          </div>
        ))}

        <details className="rounded-xl border border-dashed border-border p-3 text-sm" open={deals.length === 0 && stage !== "potential"}>
          <summary className="cursor-pointer text-muted-foreground">
            {repeat ? "Nova oportunidade (cliente já atendido)" : deals.some((d) => isOpenDeal(d.status)) ? "Outra oportunidade" : "Nova oportunidade"}
          </summary>
          <form action={createDeal.bind(null, companyId)} className="mt-3 space-y-2">
            <DealFields />
            {repeat && <p className="text-xs text-muted-foreground">A empresa volta para “Em andamento” no pipeline, sem duplicar o cadastro.</p>}
            <Button type="submit" size="sm">Criar</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
