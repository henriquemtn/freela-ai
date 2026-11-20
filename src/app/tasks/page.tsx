import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTaskForm, TaskItem, type TaskRow } from "@/components/tasks";
import { DUE_LABEL, dueStatus, type DueStatus } from "@/core/tasks";
import { db } from "@/lib/db";

const GROUPS: DueStatus[] = ["overdue", "today", "upcoming", "no_date", "done"];

export default async function TasksPage() {
  await connection(); // always dynamic (grouping depends on "now")
  const now = new Date();
  const include = { company: { select: { id: true, name: true } } };
  const [open, done, companies] = await Promise.all([
    db.task.findMany({ where: { completedAt: null }, orderBy: { dueAt: { sort: "asc", nulls: "last" } }, include }),
    db.task.findMany({ where: { completedAt: { not: null } }, orderBy: { completedAt: "desc" }, take: 20, include }),
    db.company.findMany({ where: { stage: { not: "rejected" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const groups = new Map<DueStatus, TaskRow[]>(GROUPS.map((g) => [g, []]));
  for (const t of [...open, ...done]) groups.get(dueStatus(t, now))!.push(t);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tarefas e follow-ups</h1>

      <Card>
        <CardContent>
          <NewTaskForm companies={companies} />
        </CardContent>
      </Card>

      {open.length + done.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>
      )}

      {GROUPS.filter((g) => groups.get(g)!.length > 0).map((g) => (
        <Card key={g}>
          <CardHeader>
            <CardTitle className={g === "overdue" ? "text-destructive" : undefined}>
              {DUE_LABEL[g]} <span className="font-normal text-muted-foreground">{groups.get(g)!.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {groups.get(g)!.map((t) => (
                <TaskItem key={t.id} task={t} now={now} showCompany companies={companies} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
