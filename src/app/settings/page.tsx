import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow, PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/settings";
import { saveProfile } from "./actions";

export default async function SettingsPage() {
  await connection();
  const p = await getProfile();
  const preview = `Oi, Ana, tudo bem? Aqui é o ${p.name || "{meu_nome}"}, sou ${p.profession || "{minha_profissao}"} aqui de Florianópolis.`;

  return (
    <div className="space-y-8">
      <PageHeader title="Perfil" description="Seus dados para as mensagens de abordagem. Ficam só aqui no seu freela-ai." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Seus dados</CardTitle></CardHeader>
          <CardContent>
            <form action={saveProfile} className="space-y-4">
              <Label className="grid gap-1.5">
                Nome
                <Input name="name" defaultValue={p.name} placeholder="Como você se apresenta, ex.: Henrique" autoComplete="given-name" />
              </Label>
              <Label className="grid gap-1.5">
                Profissão
                <Input name="profession" defaultValue={p.profession} placeholder="Ex.: desenvolvedor web" />
              </Label>
              <Label className="grid gap-1.5">
                Portfólio (opcional)
                <Input name="portfolioUrl" defaultValue={p.portfolioUrl} placeholder="Ex.: seusite.com.br" inputMode="url" />
              </Label>
              <Button type="submit">Salvar</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Como aparece</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="rounded-xl border border-border bg-background/50 p-3 leading-relaxed">{preview}</p>
            <div className="space-y-2">
              <Eyebrow>Variáveis nos modelos</Eyebrow>
              <ul className="space-y-1 text-muted-foreground">
                <li><code className="rounded-md bg-secondary px-1.5 py-0.5 text-primary">{"{meu_nome}"}</code> seu nome</li>
                <li><code className="rounded-md bg-secondary px-1.5 py-0.5 text-primary">{"{minha_profissao}"}</code> sua profissão</li>
                <li><code className="rounded-md bg-secondary px-1.5 py-0.5 text-primary">{"{meu_portfolio}"}</code> link do portfólio</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
