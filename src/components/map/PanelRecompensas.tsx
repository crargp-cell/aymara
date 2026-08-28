import Link from "next/link";
import { Chakana } from "@/components/brand/Chakana";
import { Guarda } from "@/components/brand/Andino";
import { Trophy, Sparkles } from "lucide-react";

export type Recompensa = { id: number; titulo: string; fecha: string };

/**
 * Columna lateral en azul profundo con lo último conseguido. Las insignias usan
 * la geometría escalonada de la chakana con los colores de la wiphala dentro.
 */
export function PanelRecompensas({
  logros,
  tarjetas,
  totalLogros,
  totalTarjetas,
}: {
  logros: Recompensa[];
  tarjetas: Recompensa[];
  totalLogros: number;
  totalTarjetas: number;
}) {
  const vacio = logros.length === 0 && tarjetas.length === 0;

  return (
    <aside
      className="rounded-lg overflow-hidden self-start sticky top-4"
      style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
    >
      {/* Cenefa de ch'aska sobre el azul, a modo de remate del panel */}
      <Guarda motivo="chaska" alto={12} color="var(--wiphala-amarillo)" opacidad={0.7} />
      <div className="relative px-5 py-4 border-b border-white/15">
        <span className="absolute inset-0 textil opacity-[0.07]" aria-hidden="true" />
        <p className="relative text-sm font-semibold">Tus recompensas</p>
        <p className="relative text-xs opacity-70 mt-0.5">
          {totalLogros} logro(s) · {totalTarjetas} tarjeta(s)
        </p>
      </div>

      <div className="p-5 space-y-5">
        {vacio && (
          <p className="text-xs opacity-70 leading-relaxed">
            Todavía no obtuviste ninguna. Completá el primer nivel de la ruta para desbloquear tu primera insignia.
          </p>
        )}

        {logros.length > 0 && (
          <section>
            <p className="text-[11px] uppercase tracking-wider opacity-60 mb-3 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Logros recientes
            </p>
            <ul className="space-y-3">
              {logros.map((l, i) => (
                <li key={l.id} className="flex items-center gap-3">
                  <Chakana seed={l.id + i} size={40} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight truncate">{l.titulo}</p>
                    <p className="text-[10px] opacity-60">{l.fecha}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tarjetas.length > 0 && (
          <section>
            <p className="text-[11px] uppercase tracking-wider opacity-60 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Tarjetas AR
            </p>
            <ul className="space-y-3">
              {tarjetas.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3">
                  <Chakana seed={t.id + i + 3} size={40} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight truncate">{t.titulo}</p>
                    <p className="text-[10px] opacity-60">{t.fecha}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex gap-2 pt-1">
          <Link href="/logros" className="flex-1">
            <span className="block text-center text-xs font-medium rounded-md py-2 bg-white/10 hover:bg-white/20 transition-colors">
              Ver logros
            </span>
          </Link>
          <Link href="/ar-cards" className="flex-1">
            <span className="block text-center text-xs font-medium rounded-md py-2 bg-white/10 hover:bg-white/20 transition-colors">
              Colección
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
