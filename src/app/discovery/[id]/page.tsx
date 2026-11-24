import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSocialUrl } from "@/discovery/normalize";
import { CANDIDATE_STATUS_LABEL, DUPLICATE_REASON_LABEL, PROVIDER_LABEL, RUN_STATUS_LABEL } from "@/discovery/labels";
import { matchCompany } from "@/discovery/dedupe";
import { preScore } from "@/discovery/prescore";
import { effectivePriority } from "@/core/pipeline";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cancelRun, dismissCandidates, promoteAndResearch, promoteCandidates } from "../actions";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function RunPage({ params, searchParams }: PageProps<"/discovery/[id]">) {
  const { id } = await params;
  const { show } = await searchParams;
  await connection(); // live progress
  const showAll = show === "all";

  const run = await db.discoveryRun.findUnique({ where: { id } });
  if (!run) notFound();
  const [candidates, companies] = await Promise.all([
    db.discoveryCandidate.findMany({
      where: { runId: id, ...(showAll ? {} : { status: "pending" }) },
      orderBy: [{ term: "asc" }, { name: "asc" }],
      include: { company: { select: { id: true, name: true } } },
    }),
    // Matched live against the CRM as it is now (companies may have been added since the run).
    db.company.findMany({ select: { id: true, name: true, city: true, phone: true, websiteUrl: true, provider: true, providerPlaceId: true } }),
  ]);
  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  // Preliminary ranking from search data; research gives the full score after promotion.
  const ranked = candidates
    .map((c) => ({ ...c, pre: preScore(c) }))
    .sort((a, b) => b.pre.score - a.pre.score || a.name.localeCompare(b.name));
  const active = run.status === "queued" || run.status === "running";
  const waitingForWorker = run.status === "queued" && new Date().getTime() - run.createdAt.getTime() > 10_000;

  return (
    <div className="space-y-8">
      <AutoRefresh active={active} />
      <PageHeader
        title={run.terms.join(", ")}
        description={`${run.area} · ${PROVIDER_LABEL[run.provider] ?? run.provider} · ${formatDateTime(run.createdAt)}`}
        back={{ href: "/discovery", label: "Descoberta" }}
        actions={
          active && (
            <form action={cancelRun.bind(null, id)}>
              <Button type="submit" variant="outline">Cancelar</Button>
            </form>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Badge variant={run.status === "failed" ? "destructive" : "secondary"}>{RUN_STATUS_LABEL[run.status]}</Badge>
        <span><span className="tabular-nums font-medium">{run.foundCount}</span> encontrados</span>
        <span><span className="tabular-nums font-medium">{run.duplicateCount}</span> já no CRM</span>
        {run.failedCount > 0 && <span className="text-destructive">{run.failedCount} termo(s) com erro</span>}
      </div>
      {waitingForWorker && (
        <p className="text-sm text-muted-foreground">Aguardando o worker. Ele está rodando? (<code>pnpm worker</code>)</p>
      )}
      {run.error && <pre className="whitespace-pre-wrap rounded-lg border border-destructive/40 p-3 text-xs text-destructive">{run.error}</pre>}

      <div className="inline-flex rounded-xl border border-border bg-card p-1 text-sm">
        {[
          { href: `/discovery/${id}`, label: "Para revisar", on: !showAll },
          { href: `/discovery/${id}?show=all`, label: "Todos", on: showAll },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn("rounded-lg px-4 py-1.5 text-muted-foreground hover:text-foreground", t.on && "bg-secondary font-medium text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {candidates.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {active ? "Buscando…" : showAll ? "Nenhum resultado." : "Nada para revisar."}
        </p>
      ) : (
        <form className="space-y-3">
          <div className="flex gap-2">
            <Button formAction={promoteAndResearch.bind(null, id)}>Adicionar e pesquisar</Button>
            <Button formAction={promoteCandidates.bind(null, id)} variant="secondary">Só adicionar</Button>
            <Button formAction={dismissCandidates.bind(null, id)} variant="outline">Descartar selecionados</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Empresa</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((c) => {
                const pending = c.status === "pending";
                const dup = pending ? matchCompany(c, companies) : null;
                return (
                  <TableRow key={c.id} className={cn(!pending && "opacity-60")}>
                    <TableCell>
                      {pending && <input type="checkbox" name="ids" value={c.id} aria-label={`Selecionar ${c.name}`} />}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium">
                        {c.name}
                        {c.sourceUrl && (
                          <a href={c.sourceUrl} target="_blank" rel="noreferrer" aria-label="Ver fonte" title="Onde foi encontrada" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{[c.category, c.city, c.term !== c.category && `“${c.term}”`].filter(Boolean).join(" · ")}</div>
                    </TableCell>
                    <TableCell>
                      {/* Band colors follow the priority bands (high 75+, medium 45+). */}
                      <Badge
                        title={c.pre.reasons.join(" · ")}
                        variant={{ high: "default", medium: "outline", low: "secondary" }[effectivePriority({ manualPriority: null, generatedScore: c.pre.score }) ?? "low"] as "default" | "outline" | "secondary"}
                        className="tabular-nums"
                      >
                        {c.pre.score}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                    <TableCell className="max-w-56">
                      {c.websiteUrl ? (
                        <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="block truncate text-muted-foreground hover:text-primary">
                          {isSocialUrl(c.websiteUrl) && <Badge variant="outline" className="mr-1">rede social</Badge>}
                          {c.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                        </a>
                      ) : (
                        <Badge>sem site encontrado</Badge>
                      )}
                      {c.instagramUrl && (
                        <a href={c.instagramUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-muted-foreground hover:text-primary">
                          {c.instagramUrl.replace(/^https?:\/\/(www\.)?/, "")}
                        </a>
                      )}
                      {c.activityEvidence && <div className="text-xs text-muted-foreground" title="Evidência de atividade">{c.activityEvidence}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {pending ? (
                        dup ? (
                          <span className="text-destructive">
                            {dup.kind === "exact" ? "Já no CRM" : `Possível duplicata (${DUPLICATE_REASON_LABEL[dup.reason]})`}:{" "}
                            <Link href={`/companies/${dup.companyId}`} className="underline">{companyName.get(dup.companyId)}</Link>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{CANDIDATE_STATUS_LABEL.pending}</span>
                        )
                      ) : c.company ? (
                        <Link href={`/companies/${c.company.id}`} className="hover:text-primary">{CANDIDATE_STATUS_LABEL[c.status]} →</Link>
                      ) : (
                        <span className="text-muted-foreground">{CANDIDATE_STATUS_LABEL[c.status]}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </form>
      )}

      <p className="text-xs text-muted-foreground">
        O score aqui usa só os dados da busca (site, telefone, endereço); o score completo vem da pesquisa depois de adicionar.
        “Sem site encontrado” vem só da busca, não é prova de que a empresa não tem site; a verificação acontece na pesquisa.
      </p>
    </div>
  );
}
