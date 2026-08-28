import { cn } from "@/lib/utils";
import Image from "next/image";
import { Guarda } from "@/components/brand/Andino";

export function Topbar({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <header className={cn("panel rounded-lg overflow-hidden", className)}>
      {/* Cenefa superior: greca escalonada continua */}
      <Guarda motivo="escalones" alto={10} opacidad={0.75} />
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="h-10 w-10 rounded-full overflow-hidden relative shrink-0" style={{ background: "var(--muted)" }}>
          <Image src="/mascota/mascota_normal.png" alt="" fill sizes="40px" className="object-cover" />
        </div>
      </div>
    </header>
  );
}
