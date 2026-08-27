import { cn } from "@/lib/utils";
import Image from "next/image";

export function Topbar({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <header className={cn("glass rounded-2xl px-6 py-4 flex items-center justify-between", className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full glass overflow-hidden relative shrink-0">
          <Image src="/mascota/mascota_normal.png" alt="Mascota" fill sizes="36px" className="object-cover" />
        </div>
      </div>
    </header>
  );
}
