import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { configuredProvider } from "@/discovery/config";
import { PROVIDER_LABEL, RUN_STATUS_LABEL } from "@/discovery/labels";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { startRun } from "./actions";

export default async function DiscoveryPage() {
  await connection(); // reads env and live run status
  const provider = configuredProvider();
  const runs = await db.discoveryRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { _count: { select: { candidates: { where: { status: "pending" } } } } },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Descoberta de leads"
        description="Busque empresas por região e categoria. Os resultados ficam para revisão; nada entra no CRM sem a sua aprovação."
      />

      {provider === "sample" && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <span className="font-medium">Modo de exemplo:</span> com <code>FREELA_DISCOVERY_PROVIDER=sample</code>, as buscas
          retornam dados fictícios marcados com “[Exemplo]”.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Nova busca</CardTitle></CardHeader>
        <CardContent>
          <form action={startRun} className="grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
            <Label className="grid gap-1.5">
              Região
              <Input name="area" required defaultValue="Florianópolis, SC" />
            </Label>
            <Label className="grid gap-1.5">
              Termos (separados por vírgula)
              <Input name="terms" required placeholder="clínica odontológica, barbearia, padaria" />
            </Label>
            <Button type="submit">Buscar</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            O Claude pesquisa na web em segundo plano pelo worker (<code>pnpm worker</code>). Até 15 resultados por termo; cada
            termo leva alguns minutos.
          </p>
        </CardContent>
      </Card>

      {runs.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Busca</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Encontrados</TableHead>
              <TableHead className="text-right">Já no CRM</TableHead>
              <TableHead className="text-right">Para revisar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                <TableCell>
                  <Link href={`/discovery/${r.id}`} className="font-medium hover:text-primary">{r.terms.join(", ")}</Link>
                  <div className="text-xs text-muted-foreground">{r.area}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">{PROVIDER_LABEL[r.provider] ?? r.provider}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "failed" ? "destructive" : r.status === "completed" ? "secondary" : "outline"}>
                    {RUN_STATUS_LABEL[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.foundCount}</TableCell>
                <TableCell className="text-right tabular-nums">{r.duplicateCount}</TableCell>
                <TableCell className="text-right tabular-nums">{r._count.candidates}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
