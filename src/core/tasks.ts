type TaskLike = { dueAt: Date | null; completedAt: Date | null };

export type DueStatus = "done" | "overdue" | "today" | "upcoming" | "no_date";

export const DUE_LABEL: Record<DueStatus, string> = {
  overdue: "Atrasadas",
  today: "Hoje",
  upcoming: "Próximas",
  no_date: "Sem data",
  done: "Concluídas",
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// ponytail: "today" uses the server's local timezone; fine while the app runs locally.
export function dueStatus(task: TaskLike, now = new Date()): DueStatus {
  if (task.completedAt) return "done";
  if (!task.dueAt) return "no_date";
  if (task.dueAt < now) return "overdue";
  return sameDay(task.dueAt, now) ? "today" : "upcoming";
}

/** Company.nextActionAt cache: earliest due date among open tasks. */
export function nextActionFrom(tasks: TaskLike[]): Date | null {
  let min: Date | null = null;
  for (const t of tasks) if (!t.completedAt && t.dueAt && (!min || t.dueAt < min)) min = t.dueAt;
  return min;
}
