import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { Contact } from "@/generated/prisma/client";
import { addContact, deleteContact, updateContact } from "../actions";

function ContactFields({ c }: { c?: Contact }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input name="name" placeholder="Nome" defaultValue={c?.name ?? ""} />
      <Input name="role" placeholder="Cargo" defaultValue={c?.role ?? ""} />
      <Input name="email" type="email" placeholder="E-mail" defaultValue={c?.email ?? ""} />
      <Input name="phone" placeholder="Telefone / WhatsApp" defaultValue={c?.phone ?? ""} />
      <Input name="source" placeholder="Fonte (ex.: Instagram, site)" defaultValue={c?.source ?? ""} />
      <Input name="notes" placeholder="Notas" defaultValue={c?.notes ?? ""} />
      <label className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="optedOut" defaultChecked={c?.optedOut} /> Pediu para não ser contatado
      </label>
    </div>
  );
}

export function Contacts({ companyId, contacts }: { companyId: string; contacts: Contact[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Contatos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {contacts.map((c) => (
          // ponytail: <details> as edit mode, no client state
          <details key={c.id} className="group rounded-lg border border-border p-3 text-sm">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-2">
              <div>
                <div className="font-medium">
                  {c.name || "Sem nome"} {c.role && <span className="font-normal text-muted-foreground">· {c.role}</span>}
                  {c.optedOut && <Badge variant="destructive" className="ml-2">Não contatar</Badge>}
                </div>
                <div className="text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
                {(c.source || c.collectedAt) && (
                  <div className="text-xs text-muted-foreground">
                    Fonte: {c.source ?? "—"}{c.collectedAt && `, coletado em ${formatDate(c.collectedAt)}`}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground group-open:hidden">editar</span>
            </summary>
            <form action={updateContact.bind(null, c.id)} className="mt-3 space-y-2">
              <ContactFields c={c} />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Salvar</Button>
                <Button formAction={deleteContact.bind(null, c.id)} size="sm" variant="ghost" className="text-destructive">
                  <Trash2 /> Remover
                </Button>
              </div>
            </form>
          </details>
        ))}

        <details className="rounded-lg border border-dashed border-border p-3 text-sm" open={contacts.length === 0}>
          <summary className="cursor-pointer text-muted-foreground">Adicionar contato</summary>
          <form action={addContact.bind(null, companyId)} className="mt-3 space-y-2">
            <ContactFields />
            <Button type="submit" size="sm">Adicionar</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
