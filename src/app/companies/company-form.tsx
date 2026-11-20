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
      <Field label="Name *" wide>
        <Input name="name" required defaultValue={c?.name} autoFocus />
      </Field>
      <Field label="Category">
        <Input name="category" defaultValue={c?.category ?? ""} placeholder="Dental clinic" />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={c?.phone ?? ""} />
      </Field>
      <Field label="City">
        <Input name="city" defaultValue={c?.city ?? "Florianópolis"} />
      </Field>
      <Field label="State">
        <Input name="state" defaultValue={c?.state ?? "SC"} maxLength={2} />
      </Field>
      <Field label="Address" wide>
        <Input name="address" defaultValue={c?.address ?? ""} />
      </Field>
      <Field label="Website">
        <Input name="websiteUrl" type="url" defaultValue={c?.websiteUrl ?? ""} placeholder="https://" />
      </Field>
      <Field label="Digital presence">
        <select name="websiteStatus" defaultValue={c?.websiteStatus ?? "unknown"} className={selectCls}>
          {Object.entries(WEBSITE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Priority (manual)">
        <select name="manualPriority" defaultValue={c?.manualPriority ?? ""} className={selectCls}>
          <option value="">Automatic</option>
          {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Estimated value (R$)">
        <Input name="estimatedValue" inputMode="decimal" defaultValue={centsToInput(c?.estimatedValueCents ?? null)} placeholder="1.500,00" />
      </Field>
      <Field label="Next action">
        <Input name="nextActionAt" type="datetime-local" defaultValue={toDateTimeLocal(c?.nextActionAt ?? null)} />
      </Field>
      <Field label="Notes" wide>
        <Textarea name="notes" rows={4} defaultValue={c?.notes ?? ""} />
      </Field>
      <div className="col-span-2 flex gap-2">
        <Button type="submit">Save</Button>
        <Button variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
