import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/auto-refresh";
import { PriorityBadge, WebsiteBadge } from "@/components/badges";
import { Eyebrow } from "@/components/page-header";
import { effectivePriority } from "@/core/pipeline";
import { normalizePhone } from "@/discovery/normalize";
import { formatDateTime } from "@/lib/format";
import { researchOutputSchema } from "@/research/schema";
import type { ScoreItem } from "@/research/score";
import type { Contact, ResearchJob, ResearchReport } from "@/generated/prisma/client";
import type { Priority } from "@/generated/prisma/enums";
import { cancelResearch, saveFoundChannel, startResearch } from "@/app/research/actions";

const CHANNEL_LABEL = { phone: "Telefone", whatsapp: "WhatsApp", email: "E-mail", instagram: "Instagram", other: "Outro" };
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");

export function ResearchCard({
  companyId,
  job,
  report,
  contacts,
  manualPriority,
}: {
  companyId: string;
  job: ResearchJob | null;
  report: ResearchReport | null;
  contacts: Contact[];
  manualPriority: Priority | null;
}) {
  const active = job && (job.status === "queued" || job.status === "running");
  const failed = job?.status === "failed" && (!report || job.createdAt > report.createdAt) ? job : null;
  const parsed = report ? researchOutputSchema.safeParse(report.findings) : null;
  const findings = parsed?.success ? parsed.data : null;
  const breakdown = (report?.scoreBreakdown ?? []) as ScoreItem[];
  const saved = new Set(contacts.flatMap((c) => [normalizePhone(c.phone), c.email?.toLowerCase()]).filter(Boolean));

  return (
    <Card>
      <AutoRefresh active={!!active} ms={4000} />
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> Pesquisa
        </CardTitle>
        {active ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {job.status === "queued" ? "Na fila (o worker precisa estar rodando)" : "Pesquisando… leva de 1 a 3 minutos"}
            <form action={cancelResearch.bind(null, job.id)}>
              <Button type="submit" size="sm" variant="ghost">Cancelar</Button>
            </form>
          </div>
        ) : (
          <form action={startResearch.bind(null, companyId)}>
            <Button type="submit" size="sm" variant={report ? "outline" : "default"}>
              {report ? "Pesquisar de novo" : "Pesquisar com Claude"}
            </Button>
          </form>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {failed && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            A última pesquisa falhou: {failed.error}
          </p>
        )}

        {!report && !active && !failed && (
          <p className="text-sm text-muted-foreground">
            O Claude verifica se a empresa tem site, encontra canais de contato públicos e aponta oportunidades, sempre com as fontes.
          </p>
        )}

        {report && (
          <>
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="space-y-2">
                <Eyebrow>Score</Eyebrow>
                <div className="flex items-baseline gap-1">
                  <span className="text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{report.score}</span>
                  <span className="text-lg text-dim">/100</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <PriorityBadge priority={effectivePriority({ manualPriority, generatedScore: report.score })} />
                  <WebsiteBadge status={report.websiteStatus} />
                </div>
                <div className="text-xs text-muted-foreground">Confiança {Math.round(report.confidence * 100)}%</div>
              </div>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed">{report.summary}</p>
                {findings && (
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground">Site:</span> {findings.websiteAssessment}
                    {findings.officialWebsite && (
                      <>
                        {" "}
                        <a href={findings.officialWebsite} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {host(findings.officialWebsite)}
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Eyebrow>Como o score foi calculado</Eyebrow>
              <ul className="space-y-3">
                {breakdown.map((b) => (
                  <li key={b.key} className="grid gap-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span>{b.label}</span>
                      <span className="tabular-nums text-muted-foreground">{b.points}/{b.max}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(b.points / b.max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{b.reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {findings && findings.opportunities.length > 0 && (
              <div className="space-y-3">
                <Eyebrow>Oportunidades</Eyebrow>
                <ul className="space-y-3 text-sm">
                  {findings.opportunities.map((o, i) => (
                    <li key={i}>
                      <div className="font-medium">{o.title}</div>
                      <p className="text-muted-foreground">{o.description}</p>
                      {o.evidence.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-3 text-xs">
                          {o.evidence.map((url, j) => (
                            <a key={j} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-dim hover:text-primary">
                              <ExternalLink className="size-3" /> {host(url).slice(0, 40)}
                            </a>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {findings && findings.suggestedServices.length > 0 && (
              <div className="space-y-3">
                <Eyebrow>Serviços que fazem sentido</Eyebrow>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {findings.suggestedServices.map((s, i) => (
                    <li key={i} className="rounded-xl border border-border p-3 text-sm">
                      <div className="font-medium">{s.service}</div>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {findings && findings.contactChannels.length > 0 && (
              <div className="space-y-3">
                <Eyebrow>Canais de contato encontrados</Eyebrow>
                <ul className="divide-y divide-border text-sm">
                  {findings.contactChannels.map((c, i) => {
                    const key = c.type === "email" ? c.value.toLowerCase() : normalizePhone(c.value);
                    const savable = c.type === "phone" || c.type === "whatsapp" || c.type === "email";
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 py-2">
                        <span>
                          <span className="text-muted-foreground">{CHANNEL_LABEL[c.type]}:</span> {c.value}{" "}
                          <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-dim hover:text-primary">(fonte)</a>
                        </span>
                        {savable &&
                          (key && saved.has(key) ? (
                            <span className="text-xs text-dim">Salvo nos contatos</span>
                          ) : (
                            <form action={saveFoundChannel.bind(null, report.id, i)}>
                              <Button type="submit" size="sm" variant="secondary">Salvar contato</Button>
                            </form>
                          ))}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {findings && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Fontes ({findings.sources.length}){findings.limitations.length > 0 && ` e limitações (${findings.limitations.length})`}
                </summary>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <ul className="space-y-1">
                    {findings.sources.map((s, i) => (
                      <li key={i}>
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.title || host(s.url)}</a>
                      </li>
                    ))}
                  </ul>
                  {findings.limitations.length > 0 && (
                    <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                      {findings.limitations.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  )}
                </div>
              </details>
            )}

            {!findings && <Badge variant="destructive">Detalhes do relatório em formato inválido</Badge>}

            <p className="text-xs text-dim">
              Pesquisado em {formatDateTime(report.createdAt)}
              {report.model && ` · ${report.model}`}
              {report.costUsd != null && ` · US$ ${report.costUsd.toFixed(2)}`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
