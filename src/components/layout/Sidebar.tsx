import { NavLinks } from "./NavLinks";
import { LogoutButton } from "./LogoutButton";
import { BrandHeader } from "./BrandHeader";
import { Guarda } from "@/components/brand/Andino";

export function Sidebar({ role }: { role?: string }) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col panel rounded-lg m-4 sticky top-4 h-[calc(100vh-2rem)] overflow-hidden">
      {/* Cenefa de remate: ata la barra al lenguaje del resto del sistema */}
      <Guarda motivo="escalones" alto={8} opacidad={0.55} />
      <div className="flex flex-col flex-1 p-4 overflow-y-auto">
        <div className="mb-6">
          <BrandHeader role={role} />
        </div>
        <NavLinks role={role} />
        <div className="mt-auto pt-4 border-t border-border">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
