import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Suggestion } from "@/core/followups";
import { changeStage } from "@/app/companies/actions";
import { createFollowUp } from "@/app/tasks/actions";

const TASK_TITLE: Record<Suggestion["kind"], string> = {
  no_reply: "Follow-up",
  stalled: "Retomar negociação",
  proposal: "Follow-up da proposta",
  check_in: "Check-in com cliente",
  give_up: "Último contato",
};

export function FollowUpSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Sugestões de follow-up</CardTitle></CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém esperando um próximo passo.</p>
        ) : (
          <ul className="divide-y divide-border">
            {suggestions.map((s) => (
              <li key={s.companyId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/companies/${s.companyId}`} className="font-medium hover:text-primary">{s.name}</Link>
                  <div className={s.kind === "give_up" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{s.message}</div>
                </div>
                {s.kind === "give_up" ? (
                  <form action={changeStage.bind(null, s.companyId)}>
                    <input type="hidden" name="to" value="rejected" />
                    <input type="hidden" name="reason" value="no_response" />
                    <Button type="submit" size="sm" variant="ghost">Mandar pro Limbo</Button>
                  </form>
                ) : (
                  <form action={createFollowUp.bind(null, s.companyId, `${TASK_TITLE[s.kind]}: ${s.name}`)}>
                    <Button type="submit" size="sm" variant="secondary">Criar follow-up p/ amanhã</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
