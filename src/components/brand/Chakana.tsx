/**
 * Insignia con geometría de montaña escalonada (chakana). Los colores internos
 * salen de la wiphala; el `seed` los reparte de forma estable para que una
 * misma insignia se vea siempre igual.
 */
const WIPHALA = [
  "var(--wiphala-rojo)",
  "var(--wiphala-naranja)",
  "var(--wiphala-amarillo)",
  "var(--wiphala-verde)",
  "var(--wiphala-azul)",
  "var(--wiphala-violeta)",
];

export function Chakana({
  seed = 0,
  size = 56,
  apagada = false,
  className,
}: {
  seed?: number;
  size?: number;
  apagada?: boolean;
  className?: string;
}) {
  const c = (i: number) => (apagada ? "#c9c2b2" : WIPHALA[(seed + i) % WIPHALA.length]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className={className}
      role="img"
      aria-hidden="true"
      style={apagada ? { opacity: 0.55 } : undefined}
    >
      {/* Brazos escalonados de la cruz andina */}
      <path d="M22 0h16v10h10v12h12v16H48v12H38v10H22V50H12V38H0V22h12V10h10z" fill={c(0)} />
      <path d="M22 8h16v10h10v10h-10v10H22V28H12V18h10z" fill={c(2)} opacity="0.9" />
      {/* Escalones del centro, en el otro acento */}
      <path d="M26 18h8v6h6v6h-6v6h-8v-6h-6v-6h6z" fill={c(4)} />
      <rect x="27" y="27" width="6" height="6" fill={apagada ? "#e6e0d2" : "var(--wiphala-blanco)"} />
    </svg>
  );
}

/**
 * Remate decorativo: bloques escalonados en los tres acentos, referencia
 * abstracta a la wiphala. Pensado para las esquinas del lienzo.
 */
export function WiphalaCorner({
  lado = "izquierda",
  className,
}: {
  lado?: "izquierda" | "derecha";
  className?: string;
}) {
  const bloques = [
    { c: "var(--ruta-futuro)", n: 3 },
    { c: "var(--ruta-activo)", n: 2 },
    { c: "var(--ruta-completado)", n: 1 },
  ];
  return (
    <div
      className={`flex items-end gap-1 pointer-events-none select-none ${lado === "derecha" ? "flex-row-reverse" : ""} ${className ?? ""}`}
      aria-hidden="true"
    >
      {bloques.map((b, i) => (
        <div key={i} className="flex flex-col gap-1">
          {Array.from({ length: b.n }).map((_, j) => (
            <span key={j} className="block h-2.5 w-2.5 rounded-[2px]" style={{ background: b.c, opacity: 0.35 + j * 0.15 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
