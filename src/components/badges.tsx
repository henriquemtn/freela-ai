import { Badge } from "@/components/ui/badge";
import { STAGE_LABEL } from "@/core/pipeline";
import { PRIORITY_LABEL, WEBSITE_LABEL } from "@/lib/format";
import type { Priority, Stage, WebsiteStatus } from "@/generated/prisma/enums";

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge variant={stage === "rejected" ? "destructive" : "secondary"}>{STAGE_LABEL[stage]}</Badge>;
}

export function WebsiteBadge({ status }: { status: WebsiteStatus }) {
  const hot = status === "not_found" || status === "social_only" || status === "outdated";
  return <Badge variant={hot ? "default" : "outline"}>{WEBSITE_LABEL[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return null;
  return <Badge variant={priority === "high" ? "default" : "outline"}>{PRIORITY_LABEL[priority]}</Badge>;
}

/** Class for a native <select> matching the Input look. */
export const selectCls =
  "h-10 w-full rounded-[10px] border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-background/50 [&>option]:bg-popover";
