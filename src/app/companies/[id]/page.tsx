import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge, selectCls, StageBadge, WebsiteBadge } from "@/components/badges";
import { ACTIVE_STAGES, effectivePriority, REJECTION_LABEL, STAGE_LABEL } from "@/core/pipeline";
import { db } from "@/lib/db";
import { formatBRL, formatDateTime } from "@/lib/format";
import { addActivity, changeStage, reactivate } from "../actions";
import { Contacts } from "./contacts";

const ACTIVITY_LABEL = { note: "Note", call: "Call", message: "Message", email: "Email", meeting: "Meeting", stage_change: "Stage" };

export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  const { id } = await params;
  const c = await db.company.findUnique({
    where: { id },
    include: { contacts: { orderBy: { createdAt: "asc" } }, activities: { orderBy: { occurredAt: "desc" } } },
  });
  if (!c) notFound();

  const inLimbo = c.stage === "rejected";
  const info: [string, React.ReactNode][] = [
    ["Category", c.category],
    ["Location", [c.address, c.city, c.state].filter(Boolean).join(", ")],
    ["Phone", c.phone],
    ["Website", c.websiteUrl && <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{c.websiteUrl}</a>],
    ["Estimated value", c.estimatedValueCents != null && formatBRL(c.estimatedValueCents)],
    ["Next action", c.nextActionAt && formatDateTime(c.nextActionAt)],
    ["Last interaction", c.lastInteractionAt && formatDateTime(c.lastInteractionAt)],
    ["Score", c.generatedScore],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
          <div className="flex flex-wrap gap-1.5">
            <StageBadge stage={c.stage} />
            <WebsiteBadge status={c.websiteStatus} />
            <PriorityBadge priority={effectivePriority(c)} />
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/companies/${id}/edit`}><Pencil /> Edit</Link>
        </Button>
      </div>

      {inLimbo ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="font-medium">In Limbo:</span> {c.rejectionReason && REJECTION_LABEL[c.rejectionReason]}
              {c.rejectionNote && <span className="text-muted-foreground"> — {c.rejectionNote}</span>}
            </div>
            <form action={reactivate.bind(null, id)}>
              <Button type="submit" variant="secondary">Reactivate</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-6">
            <form action={changeStage.bind(null, id)} className="flex items-center gap-2">
              <select name="to" required className={`${selectCls} w-48`} defaultValue="">
                <option value="" disabled>Move to…</option>
                {ACTIVE_STAGES.filter((s) => s !== c.stage).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
              <Button type="submit">Move</Button>
            </form>
            <form action={changeStage.bind(null, id)} className="flex items-center gap-2">
              <input type="hidden" name="to" value="rejected" />
              <select name="reason" required className={`${selectCls} w-44`} defaultValue="">
                <option value="" disabled>Reason…</option>
                {Object.entries(REJECTION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Input name="note" placeholder="Note (optional)" className="w-56" />
              <Button type="submit" variant="destructive">Send to Limbo</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {info.filter(([, v]) => v || v === 0).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              {c.notes && <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm">{c.notes}</p>}
            </CardContent>
          </Card>
          <Contacts companyId={id} contacts={c.contacts} />
        </div>

        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <form action={addActivity.bind(null, id)} className="grid gap-2">
              <div className="flex gap-2">
                <select name="type" className={`${selectCls} w-36`} defaultValue="note">
                  {(["note", "call", "message", "email", "meeting"] as const).map((t) => <option key={t} value={t}>{ACTIVITY_LABEL[t]}</option>)}
                </select>
                <Input name="occurredAt" type="datetime-local" className="w-52" title="When (empty = now)" />
              </div>
              <Textarea name="body" required rows={2} placeholder="What happened?" />
              <Button type="submit" variant="secondary" className="justify-self-start">Log</Button>
            </form>

            <ol className="space-y-4 border-l border-border pl-4">
              {c.activities.map((a) => (
                <li key={a.id} className="relative text-sm">
                  <span className={`absolute -left-[21px] top-1.5 size-2 rounded-full ${a.type === "stage_change" ? "bg-primary" : "bg-muted-foreground"}`} />
                  <div className="text-xs text-muted-foreground">
                    {ACTIVITY_LABEL[a.type]} · {formatDateTime(a.occurredAt)}
                  </div>
                  {a.type === "stage_change" && (
                    <div>{a.fromStage && STAGE_LABEL[a.fromStage]} → <span className="font-medium">{a.toStage && STAGE_LABEL[a.toStage]}</span></div>
                  )}
                  {a.body && <p className="whitespace-pre-wrap">{a.body}</p>}
                </li>
              ))}
              <li className="relative text-xs text-muted-foreground">
                <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-border" />
                Created {formatDateTime(c.createdAt)}
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
