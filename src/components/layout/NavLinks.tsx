"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navForRole } from "./navConfig";

export function NavLinks({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = navForRole(role);

  return (
    <>
      {sections.map(({ section, items }) => (
        <div key={section} className="mb-5">
          <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{section}</p>
          <nav className="space-y-1">
            {items.map(({ href, label, icon: Icon }) => {
              // Coincidencia por segmento, no por prefijo: así /admin/exams no
              // se marca activo estando en /admin/exams-algo.
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all hover:translate-x-1",
                    isActive
                      ? "bg-primary/15 border border-primary/30 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
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
