import { NavLinks } from "./NavLinks";
import { LogoutButton } from "./LogoutButton";

export function Sidebar({ role }: { role?: string }) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col glass rounded-2xl m-4 p-4 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--gradient-primary)" }}>
          A
        </div>
        <span className="font-semibold text-gradient text-lg">Aymara</span>
      </div>
      <NavLinks role={role} />
      <div className="mt-auto pt-4 border-t border-white/10">
        <LogoutButton />
      </div>
    </aside>
  );
}
