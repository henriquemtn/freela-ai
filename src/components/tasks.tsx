import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectCls } from "@/components/badges";
import { dueStatus } from "@/core/tasks";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Task } from "@/generated/prisma/client";
import { createTask, deleteTask, toggleTask, updateTask } from "@/app/tasks/actions";

type CompanyOption = { id: string; name: string };
export type TaskRow = Task & { company: CompanyOption | null };

/**
 * Task fields. With `companies`, the user picks the company; otherwise the task
 * stays bound to `companyId` via a hidden input (always sent, so updates never unlink it).
 */
function TaskFields({ task, companyId, companies }: { task?: TaskRow; companyId?: string; companies?: CompanyOption[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Input name="title" required placeholder="O que precisa ser feito?" defaultValue={task?.title} className="sm:col-span-2" />
      <Input name="dueAt" type="datetime-local" defaultValue={toDateTimeLocal(task?.dueAt ?? null)} />
      {companies ? (
        <select name="companyId" defaultValue={task?.companyId ?? companyId ?? ""} className={selectCls}>
          <option value="">Sem empresa</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      ) : (
        <input type="hidden" name="companyId" value={task?.companyId ?? companyId ?? ""} />
      )}
      <Input name="notes" placeholder="Notas (opcional)" defaultValue={task?.notes ?? ""} className={companies ? "sm:col-span-2" : ""} />
    </div>
  );
}

export function NewTaskForm({ companyId, companies }: { companyId?: string; companies?: CompanyOption[] }) {
  return (
    <form action={createTask} className="space-y-2">
      <TaskFields companyId={companyId} companies={companies} />
      <Button type="submit" variant="secondary" size="sm">Adicionar tarefa</Button>
    </form>
  );
}

const DUE_CLS = { overdue: "text-destructive font-medium", today: "text-primary font-medium", upcoming: "", no_date: "", done: "" };

export function TaskItem({ task, now, showCompany, companies }: { task: TaskRow; now: Date; showCompany?: boolean; companies?: CompanyOption[] }) {
  const status = dueStatus(task, now);
  const done = status === "done";
  return (
    <li className="flex items-start gap-3 py-2 text-sm">
      <form action={toggleTask.bind(null, task.id)}>
        <button
          type="submit"
          aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
          className={cn(
            "mt-0.5 flex size-4 items-center justify-center rounded border border-input hover:border-primary",
            done && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {done && <Check className="size-3" />}
        </button>
      </form>
      {/* ponytail: <details> as edit mode, no client state */}
      <details className="group min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2">
          <span className={cn(done && "text-muted-foreground line-through")}>{task.title}</span>
          {task.dueAt && <span className={cn("text-xs text-muted-foreground", DUE_CLS[status])}>{formatDateTime(task.dueAt)}</span>}
          {showCompany && task.company && (
            <Link href={`/companies/${task.company.id}`} className="text-xs text-muted-foreground hover:text-primary">
              {task.company.name}
            </Link>
          )}
          {task.notes && <span className="w-full text-xs text-muted-foreground group-open:hidden">{task.notes}</span>}
        </summary>
        <form action={updateTask.bind(null, task.id)} className="mt-2 space-y-2">
          <TaskFields task={task} companies={companies} />
          <div className="flex gap-2">
            <Button type="submit" size="sm">Salvar</Button>
            <Button formAction={deleteTask.bind(null, task.id)} size="sm" variant="ghost" className="text-destructive">
              <Trash2 /> Remover
            </Button>
          </div>
        </form>
      </details>
    </li>
  );
}
