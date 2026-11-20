import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { selectCls } from "@/components/badges";
import { centsToInput, PRIORITY_LABEL, toDateTimeLocal, WEBSITE_LABEL } from "@/lib/format";
import type { Company } from "@/generated/prisma/client";

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Label className={wide ? "col-span-2 grid gap-1.5" : "grid gap-1.5"}>
      {label}
      {children}
    </Label>
  );
}

export function CompanyForm({
  action,
  company,
  cancelHref,
}: {
  action: (fd: FormData) => Promise<void>;
  company?: Company;
  cancelHref: string;
}) {
  const c = company;
  return (
    <form action={action} className="grid max-w-3xl grid-cols-2 gap-4">
      <Field label="Nome *" wide>
        <Input name="name" required defaultValue={c?.name} autoFocus />
      </Field>
      <Field label="Categoria">
        <Input name="category" defaultValue={c?.category ?? ""} placeholder="Clínica odontológica" />
      </Field>
      <Field label="Telefone">
        <Input name="phone" defaultValue={c?.phone ?? ""} />
      </Field>
      <Field label="Cidade">
        <Input name="city" defaultValue={c?.city ?? "Florianópolis"} />
      </Field>
      <Field label="UF">
        <Input name="state" defaultValue={c?.state ?? "SC"} maxLength={2} />
      </Field>
      <Field label="Endereço" wide>
        <Input name="address" defaultValue={c?.address ?? ""} />
      </Field>
      <Field label="Site">
        <Input name="websiteUrl" type="url" defaultValue={c?.websiteUrl ?? ""} placeholder="https://" />
      </Field>
      <Field label="Presença digital">
        <select name="websiteStatus" defaultValue={c?.websiteStatus ?? "unknown"} className={selectCls}>
          {Object.entries(WEBSITE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Prioridade (manual)">
        <select name="manualPriority" defaultValue={c?.manualPriority ?? ""} className={selectCls}>
          <option value="">Automática</option>
          {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Valor estimado (R$)">
        <Input name="estimatedValue" inputMode="decimal" defaultValue={centsToInput(c?.estimatedValueCents ?? null)} placeholder="1.500,00" />
      </Field>
      <Field label="Próxima ação">
        <Input name="nextActionAt" type="datetime-local" defaultValue={toDateTimeLocal(c?.nextActionAt ?? null)} />
      </Field>
      <Field label="Notas" wide>
        <Textarea name="notes" rows={4} defaultValue={c?.notes ?? ""} />
      </Field>
      <div className="col-span-2 flex gap-2">
        <Button type="submit">Salvar</Button>
        <Button variant="ghost" asChild>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
