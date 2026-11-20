import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVE_STAGES } from "@/core/pipeline";
import { db } from "@/lib/db";
import { Board } from "./board";

export default async function PipelinePage() {
  await connection(); // always dynamic (overdue depends on "now")
  const cards = await db.company.findMany({
    where: { stage: { in: [...ACTIVE_STAGES] } },
    orderBy: [{ nextActionAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      category: true,
      city: true,
      stage: true,
      websiteStatus: true,
      manualPriority: true,
      generatedScore: true,
      estimatedValueCents: true,
      lastInteractionAt: true,
      nextActionAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <Button asChild>
          <Link href="/companies/new"><Plus /> Nova empresa</Link>
        </Button>
      </div>
      <Board cards={cards} now={new Date()} />
    </div>
  );
}
