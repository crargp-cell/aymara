"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navForRole } from "./navConfig";

export function NavLinks({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navForRole(role);
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.section] ??= [] as unknown as typeof items).push(item as never);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <>
      {Object.entries(grouped).map(([section, sectionItems]) => (
        <div key={section} className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{section}</p>
          <nav className="space-y-1">
            {sectionItems.map(({ href, label, icon: Icon }) => {
              // Coincidencia por segmento: evita que /admin/paralelo se marque
              // activo estando en /admin/paralelos (y viceversa).
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href + label}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:translate-x-1",
                    isActive ? "bg-primary/15 border border-primary/30 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </>
  );
}
