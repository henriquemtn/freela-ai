import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriorityBadge, selectCls, StageBadge, WebsiteBadge } from "@/components/badges";
import { ACTIVE_STAGES, effectivePriority, STAGE_LABEL } from "@/core/pipeline";
import { db } from "@/lib/db";
import { formatBRL, formatDate, WEBSITE_LABEL } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import { Stage, WebsiteStatus } from "@/generated/prisma/enums";

const pick = <T extends string>(v: unknown, allowed: Record<string, T>) =>
  typeof v === "string" && v in allowed ? (v as T) : undefined;

export default async function CompaniesPage({ searchParams }: PageProps<"/companies">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const stage = pick(sp.stage, Stage);
  const website = pick(sp.website, WebsiteStatus);

  const where: Prisma.CompanyWhereInput = {
    stage: stage ?? { not: "rejected" }, // Limbo has its own page
    ...(website && { websiteStatus: website }),
    ...(city && { city }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [companies, cities] = await Promise.all([
    db.company.findMany({ where, orderBy: [{ nextActionAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }], take: 200 }),
    db.company.findMany({ where: { city: { not: null } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Empresas"
        description="Todos os leads e clientes ativos. Os do Limbo ficam na página própria."
        actions={
          <Button asChild>
            <Link href="/companies/new"><Plus /> Nova empresa</Link>
          </Button>
        }
      />

      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Buscar nome, categoria, notas…" className="w-72" />
        <select name="stage" defaultValue={stage ?? ""} className={`${selectCls} w-44`}>
          <option value="">Todos os estágios</option>
          {ACTIVE_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
        <select name="website" defaultValue={website ?? ""} className={`${selectCls} w-44`}>
          <option value="">Qualquer presença</option>
          {Object.entries(WEBSITE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="city" defaultValue={city} className={`${selectCls} w-44`}>
          <option value="">Todas as cidades</option>
          {cities.map((c) => <option key={c.city} value={c.city!}>{c.city}</option>)}
        </select>
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>

      {companies.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma empresa encontrada. <Link href="/companies/new" className="text-primary hover:underline">Cadastrar a primeira</Link>
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Presença</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Próxima ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/companies/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                  <div className="text-xs text-muted-foreground">{[c.category, c.city].filter(Boolean).join(" · ")}</div>
                </TableCell>
                <TableCell><StageBadge stage={c.stage} /></TableCell>
                <TableCell><WebsiteBadge status={c.websiteStatus} /></TableCell>
                <TableCell><PriorityBadge priority={effectivePriority(c)} /></TableCell>
                <TableCell className="text-right tabular-nums">{c.estimatedValueCents != null && formatBRL(c.estimatedValueCents)}</TableCell>
                <TableCell className={c.nextActionAt && c.nextActionAt < new Date() ? "text-destructive" : ""}>
                  {c.nextActionAt && formatDate(c.nextActionAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
