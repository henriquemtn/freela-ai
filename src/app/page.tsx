import Link from "next/link";
import { connection } from "next/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVE_STAGES, STAGE_LABEL } from "@/core/pipeline";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

// ponytail: minimal overview from real data; full widgets arrive in Phase 2.
export default async function OverviewPage() {
  await connection(); // always dynamic (depends on "now")
  const now = new Date();
  const [byStage, overdue, recent] = await Promise.all([
    db.company.groupBy({ by: ["stage"], _count: true }),
    db.company.findMany({
      where: { stage: { not: "rejected" }, nextActionAt: { lt: now } },
      orderBy: { nextActionAt: "asc" },
      take: 10,
    }),
    db.activity.findMany({ orderBy: { occurredAt: "desc" }, take: 10, include: { company: { select: { name: true } } } }),
  ]);
  const count = (s: string) => byStage.find((r) => r.stage === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[...ACTIVE_STAGES, "rejected" as const].map((s) => (
          <Link key={s} href={s === "rejected" ? "/limbo" : `/companies?stage=${s}`}>
            <Card className="gap-1 py-4 hover:border-primary/50">
              <CardContent className="px-4">
                <div className="text-xs text-muted-foreground">{STAGE_LABEL[s]}</div>
                <div className="text-2xl font-semibold tabular-nums">{count(s)}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Overdue actions</CardTitle></CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing overdue.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {overdue.map((c) => (
                  <li key={c.id} className="flex justify-between gap-4">
                    <Link href={`/companies/${c.id}`} className="hover:text-primary">{c.name}</Link>
                    <span className="text-destructive">{formatDateTime(c.nextActionAt!)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recent.map((a) => (
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
