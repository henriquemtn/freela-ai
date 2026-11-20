"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ArrowRight, BriefcaseBusiness, Building2, CheckSquare, ChevronRight, Columns3, LayoutDashboard, MessageSquareText, Radar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ponytail: only areas that exist; Settings arrives when there is something to configure in the UI.
const groups = [
  { label: null, items: [{ href: "/", label: "Visão geral", icon: LayoutDashboard }] },
  {
    label: "Prospecção",
    items: [
      { href: "/discovery", label: "Descoberta", icon: Radar },
      { href: "/outreach", label: "Abordagem", icon: MessageSquareText },
      { href: "/pipeline", label: "Pipeline", icon: Columns3 },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { href: "/companies", label: "Empresas", icon: Building2 },
      { href: "/tasks", label: "Tarefas", icon: CheckSquare },
      { href: "/limbo", label: "Limbo", icon: Archive },
    ],
  },
];

const allItems = groups.flatMap((g) => g.items);
const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Nav() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5">
      <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BriefcaseBusiness className="size-5" />
        </span>
        <span className="text-xl font-semibold tracking-[-0.03em]">freela-ai</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5">
        {groups.map((g, i) => (
          <div key={i} className="space-y-1">
            {g.label && <div className="px-2 pb-1 text-[11px] font-semibold text-dim">{g.label}</div>}
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href, path);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground",
                    active && "bg-sidebar-accent font-medium text-foreground",
                  )}
                >
                  <Icon className={cn("size-[18px]", active && "text-primary")} />
                  {label}
                  {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Link href="/discovery" className="group rounded-xl border border-border bg-card p-3 text-xs hover:border-primary/40">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-primary" /> Novos leads
        </div>
        <p className="text-muted-foreground">O Claude busca empresas na web para você revisar.</p>
        <div className="mt-2 flex items-center justify-between font-medium">
          Buscar agora <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </aside>
  );
}

/** Top bar breadcrumb: "Meu CRM › Section". */
export function Breadcrumb() {
  const path = usePathname();
  const current = allItems.find((i) => isActive(i.href, path));
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border px-8 text-sm">
      <span className="text-muted-foreground">Meu CRM</span>
      {current && (
        <>
          <ChevronRight className="mx-2 size-4 text-dim" />
          <span className="font-medium">{current.label}</span>
        </>
      )}
    </header>
  );
}
