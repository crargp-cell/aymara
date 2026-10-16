import Link from "next/link";
import { setParaleloSeleccionado } from "@/lib/paralelo-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParaleloResumen } from "@/lib/paralelo";

/**
 * Barra de contexto de las páginas de autoría: muestra el paralelo con el que
 * se está trabajando y permite cambiarlo sin salir de la pestaña. El contenido
 * siempre pertenece a un paralelo (Negocio.md §5, §31).
 */
export function ParaleloSwitcher({
  actual,
  opciones,
  back,
}: {
  actual: ParaleloResumen | null;
  opciones: ParaleloResumen[];
  back: string;
}) {
  if (!actual) {
    return (
      <div className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">No hay ningún paralelo seleccionado.</span>
        <Link href={`/dashboard?next=${encodeURIComponent(back)}`}>
          <Button size="sm" variant="gradient">Elegir paralelo</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="panel rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trabajando en</span>
      <Badge variant="secondary">{actual.gestion}</Badge>
      <b className="text-sm">{actual.nombre}</b>
      {!actual.es_actual && <Badge variant="warning">gestión no vigente</Badge>}

      {opciones.length > 1 && (
        <form action={setParaleloSeleccionado} className="flex items-center gap-2 ml-auto">
          <input type="hidden" name="back" value={back} />
          <select
            name="paralelo_id"
            defaultValue={actual.id}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm min-w-[220px]"
          >
            {opciones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.gestion} · {p.nombre}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" type="submit">Cambiar</Button>
        </form>
      )}
    </div>
  );
}
