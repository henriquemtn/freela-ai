import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { selectCls } from "@/components/badges";
import { REJECTION_LABEL } from "@/core/pipeline";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { RejectionReason } from "@/generated/prisma/enums";
import { reactivate } from "../companies/actions";

export default async function LimboPage({ searchParams }: PageProps<"/limbo">) {
  const { reason } = await searchParams;
  const r = typeof reason === "string" && reason in RejectionReason ? (reason as RejectionReason) : undefined;
  const companies = await db.company.findMany({
    where: { stage: "rejected", ...(r && { rejectionReason: r }) },
    orderBy: { closedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Limbo</h1>
        <p className="text-sm text-muted-foreground">Rejected, lost or discarded leads. Their history is preserved.</p>
      </div>

      <form className="flex gap-2">
        <select name="reason" defaultValue={r ?? ""} className={`${selectCls} w-56`}>
          <option value="">All reasons</option>
          {Object.entries(REJECTION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {companies.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Limbo is empty.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Since</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/companies/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                  <div className="text-xs text-muted-foreground">{[c.category, c.city].filter(Boolean).join(" · ")}</div>
                </TableCell>
                <TableCell>
                  {c.rejectionReason && REJECTION_LABEL[c.rejectionReason]}
                  {c.rejectionNote && <div className="text-xs text-muted-foreground">{c.rejectionNote}</div>}
                </TableCell>
                <TableCell>{c.closedAt && formatDate(c.closedAt)}</TableCell>
                <TableCell className="text-right">
                  <form action={reactivate.bind(null, c.id)}>
                    <Button type="submit" size="sm" variant="secondary">Reactivate</Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
