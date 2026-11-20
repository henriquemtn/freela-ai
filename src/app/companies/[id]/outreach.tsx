"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { selectCls } from "@/components/badges";
import { renderTemplate, TEMPLATE_VARS, whatsappUrl, type OutreachVars } from "@/core/outreach";
import type { WebsiteStatus } from "@/generated/prisma/enums";
import { recordOutreach } from "@/app/outreach/actions";

type Template = { id: string; name: string; body: string };

export function OutreachCard({
  companyId,
  templates,
  defaultTemplateId,
  vars,
  phone,
  websiteStatus,
  isPotential,
  optedOut,
}: {
  companyId: string;
  templates: Template[];
  defaultTemplateId?: string;
  vars: OutreachVars;
  phone: string | null;
  websiteStatus: WebsiteStatus;
  isPotential: boolean;
  optedOut: boolean;
}) {
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? templates[0]?.id);
  const [text, setText] = useState(() => {
    const t = templates.find((x) => x.id === templateId);
    return t ? renderTemplate(t.body, vars).text : "";
  });
  const [copied, setCopied] = useState(false);

  function choose(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    setText(t ? renderTemplate(t.body, vars).text : "");
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Abordagem</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhum modelo de mensagem. <Link href="/outreach" className="text-primary hover:underline">Criar um modelo</Link>
        </CardContent>
      </Card>
    );
  }

  const wa = whatsappUrl(phone, text);
  // Checked on the current text, so the warning clears once the user fills the gap by hand.
  const missing = TEMPLATE_VARS.map((v) => v.key).filter((k) => text.includes(`{${k}}`));
  const warnings = [
    optedOut && "Um contato desta empresa pediu para não ser contatado.",
    websiteStatus === "unknown" && "Presença não verificada: confira se a empresa realmente não tem site antes de enviar.",
    text.includes("[seu nome]") && "Troque “[seu nome]” pelo seu nome (dá para fixar no modelo, em Abordagem).",
    missing.length > 0 && `Sem dados para: ${missing.map((m) => `{${m}}`).join(", ")}. Complete o texto antes de enviar.`,
  ].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader><CardTitle>Abordagem</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <select value={templateId} onChange={(e) => choose(e.target.value)} className={selectCls} aria-label="Modelo de mensagem">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Link href="/outreach" className="shrink-0 text-xs text-muted-foreground hover:text-foreground">Editar modelos</Link>
        </div>

        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {warnings.map((w) => (
              <li key={w} className="flex gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {w}</li>
            ))}
          </ul>
        )}

        <form action={recordOutreach.bind(null, companyId)} className="space-y-3">
          <Textarea name="body" value={text} onChange={(e) => setText(e.target.value)} rows={10} aria-label="Mensagem" />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar"}
            </Button>
            {wa && (
              <Button type="button" variant="secondary" asChild>
                <a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> Abrir no WhatsApp</a>
              </Button>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Enviei por</span>
              <select name="channel" defaultValue={websiteStatus === "social_only" && !wa ? "instagram" : "whatsapp"} className={`${selectCls} h-8 w-36`}>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="email">E-mail</option>
                <option value="other">Outro</option>
              </select>
            </div>
            {isPotential && (
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" name="moveStage" defaultChecked /> Mover para “Contato feito”
              </label>
            )}
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" name="followUp" defaultChecked /> Criar follow-up em 3 dias
            </label>
            <Button type="submit" className="w-full">Registrar como enviada</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
