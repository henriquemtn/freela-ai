import Link from "next/link";
import { Eyebrow, PageHeader } from "@/components/page-header";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "@/components/tasks";
import { ACTIVE_STAGES, STAGE_LABEL } from "@/core/pipeline";
import { pipelineValueCents } from "@/core/deals";
import { followUpSuggestions } from "@/core/followups";
import { FollowUpSuggestions } from "@/components/follow-up-suggestions";
import { db } from "@/lib/db";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Stages where the deal is still open (not yet hired).
const OPEN_STAGES = ["potential", "contacted", "in_progress"] as const;

function Stat({ label, value, href, alert }: { label: string; value: React.ReactNode; href?: string; alert?: boolean }) {
  const body = (
    <Card className={cn("h-full gap-2 transition-colors", href && "hover:border-primary/40", alert && "border-destructive/40")}>
      <CardContent className="space-y-2">
        <Eyebrow>{label}</Eyebrow>
        <div className={cn("text-[28px] leading-8 font-semibold tracking-[-0.03em] tabular-nums", alert && "text-destructive")}>{value}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function OverviewPage() {
  await connection(); // always dynamic (depends on "now")
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const include = { company: { select: { id: true, name: true } } };

  const [byStage, openValue, dueTasks, overdueCount, recentActivity, recentCompanies, researching, followUpRows] = await Promise.all([
    db.company.groupBy({ by: ["stage"], _count: true }),
    db.company.findMany({
      where: { stage: { in: [...OPEN_STAGES] } },
      select: { stage: true, estimatedValueCents: true, deals: { select: { status: true, valueCents: true } } },
    }),
    db.task.findMany({ where: { completedAt: null, dueAt: { lt: endOfToday } }, orderBy: { dueAt: "asc" }, take: 15, include }),
    db.task.count({ where: { completedAt: null, dueAt: { lt: now } } }),
    db.activity.findMany({ orderBy: { occurredAt: "desc" }, take: 8, include: { company: { select: { name: true } } } }),
    db.company.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, city: true, createdAt: true } }),
    db.researchJob.count({ where: { status: { in: ["queued", "running"] } } }),
    db.company.findMany({
      where: { stage: { in: ["contacted", "in_progress", "working", "completed"] } },
      select: {
        id: true,
        name: true,
        stage: true,
        createdAt: true,
        lastInteractionAt: true,
        deals: { where: { status: "proposal" }, select: { proposalSentAt: true }, orderBy: { proposalSentAt: "asc" }, take: 1 },
        _count: { select: { tasks: { where: { completedAt: null } }, activities: { where: { type: { in: ["message", "email", "call"] } } } } },
      },
    }),
  ]);
  const suggestions = followUpSuggestions(
    followUpRows.map((c) => ({
      id: c.id,
      name: c.name,
      stage: c.stage,
      createdAt: c.createdAt,
      lastInteractionAt: c.lastInteractionAt,
      hasOpenTask: c._count.tasks > 0,
      contactAttempts: c._count.activities,
      proposalSentAt: c.deals[0]?.proposalSentAt ?? null,
    })),
    now,
  ).slice(0, 10);
  const count = (s: string) => byStage.find((r) => r.stage === s)?._count ?? 0;
  const activeLeads = OPEN_STAGES.reduce((n, s) => n + count(s), 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Visão geral" description="O que precisa da sua atenção hoje, e como está o funil.">
        {researching > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            {researching} {researching === 1 ? "pesquisa em andamento" : "pesquisas em andamento"}
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Leads ativos" value={activeLeads} href="/pipeline" />
        <Stat label="Em negociação" value={count("in_progress")} href="/companies?stage=in_progress" />
        <Stat label="Clientes ativos" value={count("working")} href="/companies?stage=working" />
        <Stat label="Valor em aberto" value={formatBRL(pipelineValueCents(openValue))} />
        <Stat label="Tarefas atrasadas" value={overdueCount} href="/tasks" alert={overdueCount > 0} />
      </div>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {[...ACTIVE_STAGES, "rejected" as const].map((s) => (
          <Link
            key={s}
            href={s === "rejected" ? "/limbo" : `/companies?stage=${s}`}
            className="rounded-xl border border-border bg-card/50 px-3.5 py-2.5 text-xs transition-colors hover:border-primary/40"
          >
            <div className="text-muted-foreground">{STAGE_LABEL[s]}</div>
            <div className="text-lg font-semibold tabular-nums">{count(s)}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FollowUpSuggestions suggestions={suggestions} />
        <Card>
          <CardHeader>
            <CardTitle>Para hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {dueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada pendente para hoje.</p>
            ) : (
              <ul className="divide-y divide-border">
                {dueTasks.map((t) => <TaskItem key={t.id} task={t} now={now} showCompany />)}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem atividades ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-4">
                    <span className="truncate">
                      <Link href={`/companies/${a.companyId}`} className="font-medium hover:text-primary">{a.company.name}</Link>
                      <span className="text-muted-foreground"> · {a.type === "stage_change" && a.toStage ? STAGE_LABEL[a.toStage] : a.body}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empresas recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa ainda. <Link href="/companies/new" className="text-primary hover:underline">Cadastrar a primeira</Link>
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentCompanies.map((c) => (
                  <li key={c.id} className="flex justify-between gap-4">
                    <span className="truncate">
                      <Link href={`/companies/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                      {c.city && <span className="text-muted-foreground"> · {c.city}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
