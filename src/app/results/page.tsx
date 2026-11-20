import Link from "next/link";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow, PageHeader } from "@/components/page-header";
import { dealStats, funnel, MIN_SAMPLE, revenueByMonth } from "@/core/analytics";
import { STAGE_LABEL } from "@/core/pipeline";
import { db } from "@/lib/db";
import { formatBRL, formatDate } from "@/lib/format";

const pct = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <Card className="gap-2">
      <CardContent className="space-y-2">
        <Eyebrow>{label}</Eyebrow>
        <div className="text-[28px] leading-8 font-semibold tracking-[-0.03em] tabular-nums">{value}</div>
        {note && <div className="text-xs text-muted-foreground">{note}</div>}
      </CardContent>
    </Card>
  );
}

export default async function ResultsPage() {
  await connection(); // monthly buckets depend on "now"
  const now = new Date();
  const [deals, companies] = await Promise.all([
    db.deal.findMany({ include: { company: { select: { id: true, name: true } } }, orderBy: { closedAt: { sort: "desc", nulls: "last" } } }),
    db.company.findMany({ select: { stage: true, activities: { where: { type: "stage_change" }, select: { fromStage: true, toStage: true } } } }),
  ]);

  const stats = dealStats(deals);
  const won = deals.filter((d) => d.status === "won");
  const months = revenueByMonth(won, now, 6);
  const maxMonth = Math.max(...months.map((m) => m.cents), 1);
  const thisMonth = months.at(-1)!.cents;
  const openProposals = deals.filter((d) => d.status === "proposal");
  const steps = funnel(companies.map((c) => ({ stage: c.stage, visited: c.activities.flatMap((a) => [a.fromStage, a.toStage]).filter((s) => s !== null) })));
  const enoughFunnel = companies.length >= MIN_SAMPLE;

  return (
    <div className="space-y-8">
      <PageHeader title="Resultados" description="Receita dos negócios fechados e como os leads avançam no funil." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Receita fechada" value={formatBRL(stats.revenueCents)} note={`${stats.won} negócio(s)`} />
        <Stat label="Neste mês" value={formatBRL(thisMonth)} />
        <Stat label="Ticket médio" value={stats.averageTicketCents == null ? "—" : formatBRL(stats.averageTicketCents)} />
        <Stat
          label="Taxa de ganho"
          value={stats.enoughData ? pct(stats.winRate) : "—"}
          note={stats.enoughData ? `${stats.won} ganhos, ${stats.lost} perdidos` : `Poucos dados (${stats.won + stats.lost} decididos)`}
        />
        <Stat
          label="Propostas em aberto"
          value={openProposals.length}
          note={formatBRL(openProposals.reduce((n, d) => n + (d.valueCents ?? 0), 0))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Receita por mês</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Single series: no legend (the title names it); value shown on hover/focus and in the table. */}
            <div className="flex h-44 items-end gap-2 border-b border-border" role="img" aria-label="Receita por mês nos últimos 6 meses">
              {months.map((m) => (
                <div key={m.label} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0}>
                  <div
                    className="w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                    style={{ height: m.cents ? `${Math.max(2, (m.cents / maxMonth) * 100)}%` : "0" }}
                  />
                  <div className="pointer-events-none absolute -top-2 left-1/2 hidden -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap group-hover:block group-focus:block">
                    {m.label}: <span className="font-medium tabular-nums">{formatBRL(m.cents)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 text-center text-xs text-muted-foreground">
              {months.map((m) => <div key={m.label} className="flex-1">{m.label}</div>)}
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Ver como tabela</summary>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {months.map((m) => (
                    <tr key={m.label} className="border-b border-border last:border-0">
                      <td className="py-1 text-muted-foreground">{m.label}</td>
                      <td className="py-1 text-right tabular-nums">{formatBRL(m.cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Funil de conversão</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s, i) => (
              <div key={s.stage} className="grid gap-1 text-sm">
                <div className="flex justify-between gap-4">
                  <span>{STAGE_LABEL[s.stage]}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.count}
                    {i > 0 && enoughFunnel && <span className="ml-2 text-dim">{pct(s.rate)} da etapa anterior</span>}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${steps[0].count ? (s.count / steps[0].count) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Conta até onde cada empresa já chegou, incluindo as que foram para o Limbo.
              {!enoughFunnel && ` As taxas aparecem a partir de ${MIN_SAMPLE} empresas.`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Negócios fechados</CardTitle></CardHeader>
        <CardContent>
          {won.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum negócio fechado ainda. Registre negócios na página de cada empresa.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {won.slice(0, 15).map((d) => (
                <li key={d.id} className="flex justify-between gap-4 py-2">
                  <span className="min-w-0 truncate">
                    <Link href={`/companies/${d.company.id}`} className="font-medium hover:text-primary">{d.company.name}</Link>
                    <span className="text-muted-foreground"> · {d.title}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {d.valueCents != null && formatBRL(d.valueCents)}
                    {d.closedAt && <span className="ml-3 text-xs text-muted-foreground">{formatDate(d.closedAt)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
