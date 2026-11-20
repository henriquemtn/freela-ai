import Link from "next/link";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "@/components/tasks";
import { ACTIVE_STAGES, STAGE_LABEL } from "@/core/pipeline";
import { db } from "@/lib/db";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Stages where the deal is still open (not yet hired).
const OPEN_STAGES = ["potential", "contacted", "in_progress"] as const;

function Stat({ label, value, href, alert }: { label: string; value: React.ReactNode; href?: string; alert?: boolean }) {
  const body = (
    <Card className={cn("gap-1 py-4", href && "hover:border-primary/50", alert && "border-destructive/50")}>
      <CardContent className="px-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-2xl font-semibold tabular-nums", alert && "text-destructive")}>{value}</div>
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

  const [byStage, openValue, dueTasks, overdueCount, recentActivity, recentCompanies] = await Promise.all([
    db.company.groupBy({ by: ["stage"], _count: true }),
    db.company.aggregate({ where: { stage: { in: [...OPEN_STAGES] } }, _sum: { estimatedValueCents: true } }),
    db.task.findMany({ where: { completedAt: null, dueAt: { lt: endOfToday } }, orderBy: { dueAt: "asc" }, take: 15, include }),
    db.task.count({ where: { completedAt: null, dueAt: { lt: now } } }),
    db.activity.findMany({ orderBy: { occurredAt: "desc" }, take: 8, include: { company: { select: { name: true } } } }),
    db.company.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, city: true, createdAt: true } }),
  ]);
  const count = (s: string) => byStage.find((r) => r.stage === s)?._count ?? 0;
  const activeLeads = OPEN_STAGES.reduce((n, s) => n + count(s), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Leads ativos" value={activeLeads} href="/pipeline" />
        <Stat label="Em negociação" value={count("in_progress")} href="/companies?stage=in_progress" />
        <Stat label="Clientes ativos" value={count("working")} href="/companies?stage=working" />
        <Stat label="Valor em aberto (estimado)" value={formatBRL(openValue._sum.estimatedValueCents ?? 0)} />
        <Stat label="Tarefas atrasadas" value={overdueCount} href="/tasks" alert={overdueCount > 0} />
      </div>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {[...ACTIVE_STAGES, "rejected" as const].map((s) => (
          <Link
            key={s}
            href={s === "rejected" ? "/limbo" : `/companies?stage=${s}`}
            className="rounded-lg border border-border px-3 py-2 text-xs hover:border-primary/50"
          >
            <div className="text-muted-foreground">{STAGE_LABEL[s]}</div>
            <div className="text-base font-medium tabular-nums">{count(s)}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
