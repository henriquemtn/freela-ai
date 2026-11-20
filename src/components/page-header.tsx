import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Standard page header: title, optional subtitle and actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  back,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode; // extra content under the title (badges, meta)
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-3.5" /> {back.label}
          </Link>
        )}
        <h1 className="text-[30px] leading-9 font-semibold tracking-[-0.03em]">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small uppercase label used above stats and inside cards. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold tracking-wider text-dim uppercase">{children}</div>;
}
