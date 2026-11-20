"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Building2, CheckSquare, Columns3, Flame, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

// ponytail: only areas that exist; Discovery and Settings arrive with their phases.
const items = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/limbo", label: "Limbo", icon: Archive },
];

export function Nav() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-1 border-r border-border p-4">
      <div className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
        <Flame className="size-5 text-primary" /> FENIX
      </div>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </aside>
  );
}
