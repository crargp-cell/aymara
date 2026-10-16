import { ROLE_LABEL, type Role } from "./navConfig";

/**
 * Cabecera del menú: marca + el rol con el que se navega. Cada rol tiene un
 * menú distinto, así que conviene que se vea de entrada con cuál estás.
 * El logotipo usa la geometría escalonada de la chakana en miniatura.
 */
export function BrandHeader({ role }: { role?: string }) {
  const rol = (role ?? "estudiante") as Role;
  const label = ROLE_LABEL[rol] ?? ROLE_LABEL.estudiante;
  const acento =
    rol === "admin" ? "var(--ruta-activo)" : rol === "maestro" ? "var(--wiphala-violeta)" : "var(--ruta-completado)";

  return (
    <div className="flex items-center gap-3 px-1">
      <div
        className="h-10 w-10 escalonado flex items-center justify-center shrink-0"
        style={{ background: "var(--primary)" }}
        aria-hidden="true"
      >
        <span className="text-[13px] font-bold" style={{ color: "var(--primary-foreground)" }}>A</span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-base leading-tight" style={{ color: "var(--primary)" }}>Aymara</p>
        <span className="inline-flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 rounded-[1px]" style={{ background: acento }} />
          {label}
        </span>
      </div>
    </div>
  );
}
