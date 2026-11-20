"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { PriorityBadge, WebsiteBadge } from "@/components/badges";
import { ACTIVE_STAGES, effectivePriority, STAGE_LABEL } from "@/core/pipeline";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Company } from "@/generated/prisma/client";
import { moveCompany } from "../companies/actions";

export type BoardCard = Pick<
  Company,
  | "id"
  | "name"
  | "category"
  | "city"
  | "stage"
  | "websiteStatus"
  | "manualPriority"
  | "generatedScore"
  | "estimatedValueCents"
  | "lastInteractionAt"
  | "nextActionAt"
>;

type Stage = (typeof ACTIVE_STAGES)[number];

// ponytail: native HTML5 drag-and-drop (desktop-first per spec); keyboard users move stages on the company page.
export function Board({ cards, now }: { cards: BoardCard[]; now: Date }) {
  const [optimistic, move] = useOptimistic(cards, (state, { id, to }: { id: string; to: Stage }) =>
    state.map((c) => (c.id === id ? { ...c, stage: to } : c)),
  );
  const [, startTransition] = useTransition();
  const [over, setOver] = useState<Stage | null>(null);

  function drop(to: Stage, id: string) {
    setOver(null);
    const card = optimistic.find((c) => c.id === id);
    if (!card || card.stage === to) return;
    startTransition(async () => {
      move({ id, to });
      await moveCompany(id, to);
    });
  }

  return (
    <div className="grid min-h-[70vh] auto-cols-[minmax(13rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
      {ACTIVE_STAGES.map((stage) => {
        const column = optimistic.filter((c) => c.stage === stage);
        const total = column.reduce((sum, c) => sum + (c.estimatedValueCents ?? 0), 0);
        return (
          <section
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(stage);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
            }}
            onDrop={(e) => drop(stage, e.dataTransfer.getData("text/plain"))}
            className={cn(
              "flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-2 transition-colors",
              over === stage && "border-primary/60 bg-primary/5",
            )}
          >
            <header className="px-1 pt-1">
              <h2 className="text-sm font-medium">
                {STAGE_LABEL[stage]} <span className="text-muted-foreground">{column.length}</span>
              </h2>
              <div className="h-4 text-xs tabular-nums text-muted-foreground">{total > 0 && formatBRL(total)}</div>
            </header>
            {column.map((c) => (
              <Card key={c.id} card={c} now={now} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Card({ card: c, now }: { card: BoardCard; now: Date }) {
  const overdue = c.nextActionAt != null && c.nextActionAt < now;
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", c.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab space-y-2 rounded-lg border border-border bg-card p-3 text-sm shadow-xs active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/companies/${c.id}`} className="font-medium leading-tight hover:text-primary">
          {c.name}
        </Link>
        {overdue && <AlertCircle className="size-4 shrink-0 text-destructive" aria-label="Ação atrasada" />}
      </div>
      {(c.category || c.city) && (
        <div className="text-xs text-muted-foreground">{[c.category, c.city].filter(Boolean).join(" · ")}</div>
      )}
      <div className="flex flex-wrap items-center gap-1 [&>*]:max-w-full">
        <WebsiteBadge status={c.websiteStatus} />
        <PriorityBadge priority={effectivePriority(c)} />
        {c.generatedScore != null && <span className="text-xs text-muted-foreground">score {c.generatedScore}</span>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs text-muted-foreground">
        {c.estimatedValueCents != null && (
          <>
            <dt>Valor</dt>
            <dd className="text-right tabular-nums text-foreground">{formatBRL(c.estimatedValueCents)}</dd>
          </>
        )}
        {c.lastInteractionAt && (
          <>
            <dt>Último contato</dt>
            <dd className="text-right">{formatDate(c.lastInteractionAt)}</dd>
          </>
        )}
        {c.nextActionAt && (
          <>
            <dt>Próxima ação</dt>
            <dd className={cn("text-right", overdue && "font-medium text-destructive")}>{formatDate(c.nextActionAt)}</dd>
          </>
        )}
      </dl>
    </article>
  );
}
