import { ROLE_LABEL, type Role } from "./navConfig";

/**
 * Cabecera del menú: logo + el rol con el que se está navegando. Cada rol tiene
 * un menú distinto, así que conviene que se vea de entrada con cuál estás.
 */
export function BrandHeader({ role }: { role?: string }) {
  const label = ROLE_LABEL[(role ?? "estudiante") as Role] ?? ROLE_LABEL.estudiante;
  const tono =
    role === "admin"
      ? "bg-amber-400/15 text-amber-300 border-amber-400/25"
      : role === "maestro"
        ? "bg-violet-400/15 text-violet-300 border-violet-400/25"
        : "bg-sky-400/15 text-sky-300 border-sky-400/25";

  return (
    <div className="flex items-center gap-2.5 px-2">
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ background: "var(--gradient-primary)" }}
        aria-hidden="true"
      >
        A
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gradient text-lg leading-tight">Aymara</p>
        <span className={`inline-block mt-0.5 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${tono}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
