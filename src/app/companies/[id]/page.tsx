import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
import { NewTaskForm, TaskItem } from "@/components/tasks";

const ACTIVITY_LABEL = { note: "Nota", call: "Ligação", message: "Mensagem", email: "E-mail", meeting: "Reunião", stage_change: "Estágio" };

export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  const { id } = await params;
  await connection(); // task due status depends on "now"
  const now = new Date();
  const c = await db.company.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      activities: { orderBy: { occurredAt: "desc" } },
      // open tasks first (completedAt null sorts first), then by due date
      tasks: { orderBy: [{ completedAt: { sort: "desc", nulls: "first" } }, { dueAt: { sort: "asc", nulls: "last" } }] },
    },
  });
  if (!c) notFound();

  const inLimbo = c.stage === "rejected";
  const info: [string, React.ReactNode][] = [
    ["Categoria", c.category],
    ["Local", [c.address, c.city, c.state].filter(Boolean).join(", ")],
    ["Telefone", c.phone],
    ["Site", c.websiteUrl && <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{c.websiteUrl}</a>],
    ["Valor estimado", c.estimatedValueCents != null && formatBRL(c.estimatedValueCents)],
    ["Próxima ação", c.nextActionAt && formatDateTime(c.nextActionAt)],
    ["Última interação", c.lastInteractionAt && formatDateTime(c.lastInteractionAt)],
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
          <Link href={`/companies/${id}/edit`}><Pencil /> Editar</Link>
        </Button>
      </div>

      {inLimbo ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="font-medium">No Limbo:</span> {c.rejectionReason && REJECTION_LABEL[c.rejectionReason]}
              {c.rejectionNote && <span className="text-muted-foreground"> — {c.rejectionNote}</span>}
            </div>
            <form action={reactivate.bind(null, id)}>
              <Button type="submit" variant="secondary">Reativar</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-6">
            <form action={changeStage.bind(null, id)} className="flex items-center gap-2">
              <select name="to" required className={`${selectCls} w-48`} defaultValue="">
                <option value="" disabled>Mover para…</option>
                {ACTIVE_STAGES.filter((s) => s !== c.stage).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
              <Button type="submit">Mover</Button>
            </form>
            <form action={changeStage.bind(null, id)} className="flex items-center gap-2">
              <input type="hidden" name="to" value="rejected" />
              <select name="reason" required className={`${selectCls} w-44`} defaultValue="">
                <option value="" disabled>Motivo…</option>
                {Object.entries(REJECTION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Input name="note" placeholder="Observação (opcional)" className="w-56" />
              <Button type="submit" variant="destructive">Mandar pro Limbo</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Perfil</CardTitle></CardHeader>
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
          <Card>
            <CardHeader><CardTitle>Tarefas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {c.tasks.length > 0 && (
                <ul className="divide-y divide-border">
                  {c.tasks.map((t) => <TaskItem key={t.id} task={{ ...t, company: null }} now={now} />)}
                </ul>
              )}
              <NewTaskForm companyId={id} />
            </CardContent>
          </Card>
          <Contacts companyId={id} contacts={c.contacts} />
        </div>

        <Card>
          <CardHeader><CardTitle>Linha do tempo</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <form action={addActivity.bind(null, id)} className="grid gap-2">
              <div className="flex gap-2">
                <select name="type" className={`${selectCls} w-36`} defaultValue="note">
                  {(["note", "call", "message", "email", "meeting"] as const).map((t) => <option key={t} value={t}>{ACTIVITY_LABEL[t]}</option>)}
                </select>
                <Input name="occurredAt" type="datetime-local" className="w-52" title="Quando (vazio = agora)" />
              </div>
              <Textarea name="body" required rows={2} placeholder="O que aconteceu?" />
              <Button type="submit" variant="secondary" className="justify-self-start">Registrar</Button>
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
                Cadastrada em {formatDateTime(c.createdAt)}
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
