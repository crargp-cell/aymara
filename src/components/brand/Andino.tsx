/**
 * Motivos geométricos andinos usados como decoración del sistema.
 *
 *  · Tocapu  — bloque cuadrado con un motivo abstracto dentro (rombo, cruz
 *              concéntrica, escalones). En los textiles funcionaban como
 *              lenguaje visual, no como simple adorno; por eso aquí se usan en
 *              series variadas y no repitiendo siempre el mismo.
 *  · Ch'aska — rombo de bordes escalonados con una cruz al centro: la estrella
 *              del alba. Es el motivo de relleno más habitual.
 *  · Guarda  — franja longitudinal donde un motivo se repite de forma continua.
 *              Encaja como divisor de secciones o cinta superior.
 *
 * Todo es SVG plano y sin dependencias, para que escale y se tiña con la paleta.
 */

const ACENTOS = ["var(--ruta-futuro)", "var(--ruta-activo)", "var(--ruta-completado)", "var(--primary)"];

/* ------------------------------------------------------------------ Ch'aska */

/** Rombo escalonado con cruz central. `relleno` lo dibuja sólido; si no, a trazo. */
export function Chaska({
  size = 24,
  color = "currentColor",
  relleno = true,
  className,
}: {
  size?: number;
  color?: string;
  relleno?: boolean;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      {/* Rombo con los bordes en escalera */}
      <path
        d="M16 1 L20 5 L24 5 L24 9 L27 12 L31 16 L27 20 L24 23 L24 27 L20 27 L16 31 L12 27 L8 27 L8 23 L5 20 L1 16 L5 12 L8 9 L8 5 L12 5 Z"
        fill={relleno ? color : "none"}
        stroke={color}
        strokeWidth={relleno ? 0 : 1.5}
        strokeLinejoin="miter"
      />
      {/* Cruz al centro, calada sobre el rombo */}
      <path
        d="M14.5 9h3v5h5v3h-5v5h-3v-5h-5v-3h5z"
        fill={relleno ? "var(--card)" : color}
        opacity={relleno ? 0.9 : 1}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------- Tocapu */

/** Los cuatro motivos internos del bloque, en el orden en que se alternan. */
function motivoTocapu(v: number, color: string) {
  switch (v % 4) {
    case 0: // rombo inscrito
      return <path d="M16 6 L26 16 L16 26 L6 16 Z" fill={color} />;
    case 1: // cruz concéntrica
      return (
        <>
          <path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill={color} />
          <rect x="14.5" y="14.5" width="3" height="3" fill="var(--card)" />
        </>
      );
    case 2: // escalones opuestos (deconstrucción de la chakana)
      return (
        <>
          <path d="M6 6h10v5h-5v5H6z" fill={color} />
          <path d="M26 26H16v-5h5v-5h5z" fill={color} />
        </>
      );
    default: // rombo hueco con núcleo
      return (
        <>
          <path d="M16 5 L27 16 L16 27 L5 16 Z" fill="none" stroke={color} strokeWidth="3" />
          <rect x="13" y="13" width="6" height="6" fill={color} />
        </>
      );
  }
}

/** Bloque tocapu suelto. `variante` elige el motivo interno. */
export function Tocapu({
  variante = 0,
  size = 32,
  color,
  className,
}: {
  variante?: number;
  size?: number;
  color?: string;
  className?: string;
}) {
  const tinta = color ?? ACENTOS[variante % ACENTOS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="0.75" y="0.75" width="30.5" height="30.5" fill="none" stroke={tinta} strokeWidth="1.5" opacity="0.55" />
      {motivoTocapu(variante, tinta)}
    </svg>
  );
}

/** Serie horizontal de tocapus, cada uno con motivo y color distintos. */
export function TocapuBanda({ n = 6, size = 28, className }: { n?: number; size?: number; className?: string }) {
  return (
    <div className={`flex gap-1.5 ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <Tocapu key={i} variante={i} size={size} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- Guarda */

type MotivoGuarda = "escalones" | "rombos" | "chaska";

/**
 * Cenefa: franja con un motivo que se repite a lo ancho. Se dibuja con un
 * `<pattern>` para que ocupe cualquier ancho sin deformarse.
 */
export function Guarda({
  motivo = "escalones",
  alto = 14,
  color = "var(--primary)",
  opacidad = 0.9,
  className,
}: {
  motivo?: MotivoGuarda;
  alto?: number;
  color?: string;
  opacidad?: number;
  className?: string;
}) {
  const id = `guarda-${motivo}-${alto}-${String(color).replace(/[^a-z0-9]/gi, "")}`;
  const ancho = motivo === "chaska" ? 24 : 16;

  return (
    <svg
      width="100%"
      height={alto}
      className={className}
      style={{ display: "block", opacity: opacidad }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={ancho} height={16} patternUnits="userSpaceOnUse" viewBox="0 0 24 16">
          {motivo === "escalones" && (
            // Greca escalonada continua
            <path d="M0 12h4V8h4V4h4v4h4v4h4v4H0z" fill={color} />
          )}
          {motivo === "rombos" && (
            <>
              <path d="M8 2 L14 8 L8 14 L2 8 Z" fill={color} />
              <path d="M20 4 L24 8 L20 12 L16 8 Z" fill={color} opacity="0.5" />
            </>
          )}
          {motivo === "chaska" && (
            <>
              <path d="M12 1 L15 5 L19 5 L19 9 L23 12 L19 15 L15 15 L12 15 L9 15 L5 15 L1 12 L5 9 L5 5 L9 5 Z" fill={color} opacity="0.85" />
              <rect x="11" y="6" width="2" height="5" fill="var(--background)" />
              <rect x="9.5" y="7.5" width="5" height="2" fill="var(--background)" />
            </>
          )}
        </pattern>
      </defs>
      <rect width="100%" height={alto} fill={`url(#${id})`} />
    </svg>
  );
}
