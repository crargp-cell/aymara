import { NavLinks } from "./NavLinks";
import { LogoutButton } from "./LogoutButton";
import { BrandHeader } from "./BrandHeader";

export function Sidebar({ role }: { role?: string }) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col panel rounded-lg m-4 p-4 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="mb-6">
        <BrandHeader role={role} />
      </div>
      <NavLinks role={role} />
      <div className="mt-auto pt-4 border-t border-border">
        <LogoutButton />
      </div>
    </aside>
  );
}
