"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./NavLinks";
import { LogoutButton } from "./LogoutButton";

export function MobileNav({ role }: { role?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-40"
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative glass-strong w-72 max-w-[80vw] h-full p-4 flex flex-col overflow-y-auto">
            <div className="mb-6 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--gradient-primary)" }}>
                  A
                </div>
                <span className="font-semibold text-gradient text-lg">Aymara</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
            <div className="mt-auto pt-4 border-t border-white/10">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
