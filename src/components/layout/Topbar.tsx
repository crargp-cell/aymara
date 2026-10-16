import { cn } from "@/lib/utils";
import { Guarda } from "@/components/brand/Andino";
import { MallkuMarca } from "@/components/mascota/MallkuMarca";

export function Topbar({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <header className={cn("panel rounded-lg overflow-hidden", className)}>
      {/* Cenefa superior: greca escalonada continua */}
      <Guarda motivo="escalones" alto={10} opacidad={0.75} />
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {/* Mallku, con la pose de la sección en la que estás */}
        <MallkuMarca size={60} />
      </div>
    </header>
  );
}
