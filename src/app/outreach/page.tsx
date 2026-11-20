import { connection } from "next/server";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { selectCls } from "@/components/badges";
import { Eyebrow, PageHeader } from "@/components/page-header";
import { TEMPLATE_VARS } from "@/core/outreach";
import { db } from "@/lib/db";
import { WEBSITE_LABEL } from "@/lib/format";
import type { MessageTemplate } from "@/generated/prisma/client";
import { createTemplate, deleteTemplate, updateTemplate } from "./actions";

function TemplateFields({ t }: { t?: MessageTemplate }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label className="grid gap-1.5">
          Nome
          <Input name="name" required defaultValue={t?.name} placeholder="Ex.: Sem site, oferecer prévia" />
        </Label>
        <Label className="grid gap-1.5">
          Usar por padrão quando a presença for
          <select name="websiteStatus" defaultValue={t?.websiteStatus ?? ""} className={selectCls}>
            <option value="">Nenhuma (escolha manual)</option>
            {Object.entries(WEBSITE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Label>
      </div>
      <Textarea name="body" required rows={11} defaultValue={t?.body} placeholder="Oi, {nome}, tudo bem?…" aria-label="Texto da mensagem" />
    </div>
  );
}

export default async function OutreachPage() {
  await connection();
  const templates = await db.messageTemplate.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abordagem"
        description="Modelos para o primeiro contato. Na página de cada empresa a mensagem já vem preenchida; você revisa, envia e registra."
      />

      <Card>
        <CardContent className="space-y-3">
          <Eyebrow>Variáveis</Eyebrow>
          <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {TEMPLATE_VARS.map((v) => (
              <li key={v.key}>
                <code className="rounded-md bg-secondary px-1.5 py-0.5 text-primary">{`{${v.key}}`}</code>{" "}
                <span className="text-muted-foreground">{v.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Boas práticas: diga quem você é, cite algo verdadeiro sobre a empresa, peça permissão antes de mandar link e deixe uma saída fácil.
            Só prometa uma prévia pronta se ela já existir.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>{t.name}</CardTitle>
              {t.websiteStatus && <Badge variant="outline">{WEBSITE_LABEL[t.websiteStatus]}</Badge>}
            </CardHeader>
            <CardContent>
              {/* ponytail: <details> as edit mode, no client state */}
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <p className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground group-open:hidden">{t.body}</p>
                  <span className="mt-3 inline-block text-xs font-medium text-primary group-open:hidden">Editar</span>
                </summary>
                <form action={updateTemplate.bind(null, t.id)} className="space-y-3">
                  <TemplateFields t={t} />
                  <div className="flex gap-2">
                    <Button type="submit">Salvar</Button>
                    <Button formAction={deleteTemplate.bind(null, t.id)} variant="ghost" className="text-destructive">
                      <Trash2 /> Excluir
                    </Button>
                  </div>
                </form>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Novo modelo</CardTitle></CardHeader>
        <CardContent>
          <form action={createTemplate} className="space-y-3">
            <TemplateFields />
            <Button type="submit">Criar modelo</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
