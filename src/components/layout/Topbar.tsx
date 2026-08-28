import { cn } from "@/lib/utils";
import Image from "next/image";

export function Topbar({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <header className={cn("panel rounded-lg px-6 py-4 flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        {/* Filete de acento: ancla visual con la paleta de la ruta */}
        <div className="flex items-center gap-2 mb-1.5" aria-hidden="true">
          <span className="h-1 w-6 rounded-full" style={{ background: "var(--ruta-futuro)" }} />
          <span className="h-1 w-3 rounded-full" style={{ background: "var(--ruta-activo)" }} />
          <span className="h-1 w-1.5 rounded-full" style={{ background: "var(--ruta-completado)" }} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-10 w-10 rounded-full overflow-hidden relative shrink-0" style={{ background: "var(--muted)" }}>
        <Image src="/mascota/mascota_normal.png" alt="" fill sizes="40px" className="object-cover" />
      </div>
    </header>
  );
}
