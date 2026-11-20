import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart } from "@/components/bar-chart";
import { PriorityBadge } from "@/components/badges";
import { FollowUpSuggestions } from "@/components/follow-up-suggestions";
import { Eyebrow, PageHeader } from "@/components/page-header";
import { TaskItem } from "@/components/tasks";
import { revenueByMonth } from "@/core/analytics";
import { pipelineValueCents } from "@/core/deals";
import { followUpSuggestions } from "@/core/followups";
import { goalProgress, outreachByWeek, weeklyFocus } from "@/core/overview";
import { effectivePriority, STAGE_LABEL } from "@/core/pipeline";
import { db } from "@/lib/db";
import { centsToInput, formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { getMonthlyGoalCents } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { saveMonthlyGoal } from "@/app/goals/actions";

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

function GoalCard({ goalCents, earnedCents, openProposalsCents, now }: { goalCents: number | null; earnedCents: number; openProposalsCents: number; now: Date }) {
  const g = goalCents ? goalProgress(goalCents, earnedCents, openProposalsCents, now) : null;
  return (
    <Card>
      <CardHeader><CardTitle>Meta do mês</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {g && goalCents ? (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <Eyebrow>Fechado no mês</Eyebrow>
                <div className="text-[30px] leading-9 font-semibold tracking-[-0.03em] tabular-nums">{formatBRL(earnedCents)}</div>
                <div className="text-sm text-muted-foreground">de {formatBRL(goalCents)}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums">{Math.round(g.pct * 100)}%</div>
                <div className="text-xs text-muted-foreground">{g.daysLeft} {g.daysLeft === 1 ? "dia restante" : "dias restantes"}</div>
              </div>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(g.pct * 100)} aria-valuemin={0} aria-valuemax={100}>
              {/* projection behind, earned on top */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: `${Math.min(100, g.projectedPct * 100)}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${Math.min(100, g.pct * 100)}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">
              {g.remainingCents > 0 ? (
                <>
                  Faltam <span className="font-medium text-foreground">{formatBRL(g.remainingCents)}</span>.
                  {openProposalsCents > 0 && <> Propostas em aberto somam {formatBRL(openProposalsCents)} (faixa clara).</>}
                </>
              ) : (
                <span className="text-primary">Meta batida! 🎉</span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Defina quanto você quer faturar por mês para acompanhar o progresso aqui.</p>
        )}
        <details className="text-sm" open={!goalCents}>
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{goalCents ? "Alterar meta" : "Definir meta"}</summary>
          <form action={saveMonthlyGoal} className="mt-2 flex gap-2">
            <Input name="goal" inputMode="decimal" placeholder="Ex.: 8.000,00" defaultValue={centsToInput(goalCents)} aria-label="Meta mensal (R$)" />
            <Button type="submit" variant="secondary">Salvar</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}

export default async function OverviewPage() {
  await connection(); // always dynamic (depends on "now")
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 86_400_000);
  const include = { company: { select: { id: true, name: true } } };

  const [byStage, leads, dueTasks, overdueCount, recentActivity, researching, followUpRows, wonDeals, openProposals, outreach, projects, goalCents] =
    await Promise.all([
      db.company.groupBy({ by: ["stage"], _count: true }),
      db.company.findMany({
        where: { stage: { in: [...OPEN_STAGES] } },
        select: {
          id: true,
          name: true,
          stage: true,
          estimatedValueCents: true,
          manualPriority: true,
          generatedScore: true,
          nextActionAt: true,
          deals: { select: { status: true, valueCents: true } },
        },
      }),
      db.task.findMany({ where: { completedAt: null, dueAt: { lt: endOfToday } }, orderBy: { dueAt: "asc" }, take: 15, include }),
      db.task.count({ where: { completedAt: null, dueAt: { lt: now } } }),
      db.activity.findMany({ orderBy: { occurredAt: "desc" }, take: 6, include: { company: { select: { name: true } } } }),
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
      db.deal.findMany({ where: { status: "won", closedAt: { not: null } }, select: { valueCents: true, closedAt: true } }),
      db.deal.findMany({ where: { status: "proposal" }, select: { valueCents: true } }),
      db.activity.findMany({ where: { type: { in: ["message", "email", "call"] }, occurredAt: { gte: eightWeeksAgo } }, select: { occurredAt: true } }),
      db.company.findMany({
        where: { stage: "working" },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          deals: { where: { status: "won" }, orderBy: { closedAt: "desc" }, take: 1, select: { title: true, valueCents: true, closedAt: true } },
          tasks: { where: { completedAt: null }, orderBy: { dueAt: { sort: "asc", nulls: "last" } }, take: 1, select: { title: true, dueAt: true } },
        },
      }),
      getMonthlyGoalCents(),
    ]);

  const count = (s: string) => byStage.find((r) => r.stage === s)?._count ?? 0;
  const activeLeads = OPEN_STAGES.reduce((n, s) => n + count(s), 0);
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
  ).slice(0, 8);
  const focus = weeklyFocus(
    leads.map((l) => ({
      id: l.id,
      name: l.name,
      stage: l.stage,
      priority: effectivePriority(l),
      score: l.generatedScore,
      nextActionAt: l.nextActionAt,
      hasOpenProposal: l.deals.some((d) => d.status === "proposal"),
    })),
    now,
  );
  const months = revenueByMonth(wonDeals, now, 6);
  const earnedThisMonth = wonDeals.filter((d) => d.closedAt! >= monthStart).reduce((n, d) => n + (d.valueCents ?? 0), 0);
  const openProposalsCents = openProposals.reduce((n, d) => n + (d.valueCents ?? 0), 0);
  const weeks = outreachByWeek(outreach.map((a) => a.occurredAt), now, 8);

  return (
    <div className="space-y-8">
      <PageHeader title="Visão geral" description="O que precisa da sua atenção nesta semana, e como está o mês.">
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
        <Stat label="Projetos em andamento" value={count("working")} href="/companies?stage=working" />
        <Stat label="Valor em aberto" value={formatBRL(pipelineValueCents(leads))} />
        <Stat label="Tarefas atrasadas" value={overdueCount} href="/tasks" alert={overdueCount > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <GoalCard goalCents={goalCents} earnedCents={earnedThisMonth} openProposalsCents={openProposalsCents} now={now} />

        <Card>
          <CardHeader><CardTitle>Foco da semana</CardTitle></CardHeader>
          <CardContent>
            {focus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum lead com prioridade ou ação marcada. Pesquise seus leads para ganharem prioridade.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {focus.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/companies/${f.id}`} className="block truncate font-medium hover:text-primary">{f.name}</Link>
                      <div className="text-xs text-muted-foreground">{[STAGE_LABEL[f.stage], ...f.reasons].join(" · ")}</div>
                    </div>
                    {f.priority ? <PriorityBadge priority={f.priority} /> : <Badge variant="outline">Sem prioridade</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Receita por mês</CardTitle></CardHeader>
          <CardContent>
            <BarChart
              ariaLabel="Receita por mês nos últimos 6 meses"
              data={months.map((m) => ({ label: m.label, value: m.cents, display: formatBRL(m.cents) }))}
              reference={goalCents ? { value: goalCents, label: `Meta ${formatBRL(goalCents)}` } : undefined}
              valueHeader="Receita"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Abordagens por semana</CardTitle></CardHeader>
          <CardContent>
            <BarChart
              ariaLabel="Mensagens, e-mails e ligações por semana nas últimas 8 semanas"
              data={weeks.map((w) => ({ label: w.label, value: w.count, display: `${w.count} ${w.count === 1 ? "contato" : "contatos"}` }))}
              valueHeader="Contatos"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Projetos em andamento</CardTitle></CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente em “Trabalhando” agora.</p>
            ) : (
              <ul className="divide-y divide-border">
                {projects.map((p) => {
                  const deal = p.deals[0];
                  const task = p.tasks[0];
                  return (
                    <li key={p.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <Link href={`/companies/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
                        <div className="text-xs text-muted-foreground">
                          {deal ? `${deal.title}${deal.closedAt ? ` · fechado em ${formatDate(deal.closedAt)}` : ""}` : "Sem negócio registrado"}
                        </div>
                        <div className={cn("text-xs", task?.dueAt && task.dueAt < now ? "text-destructive" : "text-dim")}>
                          {task ? `Próximo: ${task.title}${task.dueAt ? ` (${formatDate(task.dueAt)})` : ""}` : "Sem próxima tarefa"}
                        </div>
                      </div>
                      {deal?.valueCents != null && <span className="shrink-0 font-medium tabular-nums">{formatBRL(deal.valueCents)}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <FollowUpSuggestions suggestions={suggestions} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Para hoje</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Atividade recente</CardTitle></CardHeader>
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
      </div>
    </div>
  );
}
