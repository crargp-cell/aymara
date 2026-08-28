import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getStudentBoard, getPreviewBoard, type BoardNode } from "@/lib/student-board";
import { getParaleloSeleccionado, type ParaleloResumen } from "@/lib/paralelo";
import { Topbar } from "@/components/layout/Topbar";
import { SinParalelo } from "@/components/layout/SinParalelo";
import { ParaleloSwitcher } from "@/components/layout/ParaleloSwitcher";
import { RutaTablero } from "@/components/map/RutaTablero";
import { PanelRecompensas, type Recompensa } from "@/components/map/PanelRecompensas";
import { WiphalaCorner } from "@/components/brand/Chakana";
import { Guarda, TocapuBanda } from "@/components/brand/Andino";
import { Eye } from "lucide-react";

const fecha = (d: Date) => d.toLocaleDateString("es", { day: "numeric", month: "short" });

export default async function MapPage() {
  const user = await requireUser();
  const esDocente = user.role !== "estudiante";

  let nodes: BoardNode[] = [];
  let paralelo: ParaleloResumen | null = null;
  let opciones: ParaleloResumen[] = [];
  let done = 0;

  if (esDocente) {
    // El docente revisa la ruta del paralelo que eligió: sin uno seleccionado no
    // hay nada que mostrar, porque el contenido pertenece a un paralelo.
    const sel = await getParaleloSeleccionado(user.role, user.id);
    paralelo = sel.actual;
    opciones = sel.opciones;
    if (paralelo) nodes = await getPreviewBoard(paralelo.id);
  } else {
    const board = await getStudentBoard(user.id);
    paralelo = board.paralelo;
    nodes = board.nodes;
    done = board.totalDone;
  }

  if (!paralelo) {
    return (
      <div className="space-y-6">
        <Topbar title="Ruta de aprendizaje" />
        <SinParalelo esDocente={esDocente} volverA="/map" />
      </div>
    );
  }

  // Recompensas del alumno para la columna lateral.
  let logros: Recompensa[] = [];
  let tarjetas: Recompensa[] = [];
  let totalLogros = 0;
  let totalTarjetas = 0;
  if (!esDocente) {
    const [ls, ts, nl, nt] = await Promise.all([
      prisma.logroAlumno.findMany({ where: { alumno_id: user.id }, orderBy: { unlocked_at: "desc" }, take: 3, include: { logro: true } }),
      prisma.userArCard.findMany({ where: { alumno_id: user.id, revocado: false }, orderBy: { unlocked_at: "desc" }, take: 3, include: { ar_card: true } }),
      prisma.logroAlumno.count({ where: { alumno_id: user.id } }),
      prisma.userArCard.count({ where: { alumno_id: user.id, revocado: false } }),
    ]);
    logros = ls.map((l) => ({ id: l.id, titulo: l.logro.nombre, fecha: fecha(l.unlocked_at) }));
    tarjetas = ts.map((t) => ({ id: t.id, titulo: t.ar_card.title ?? t.ar_card.card_code, fecha: fecha(t.unlocked_at) }));
    totalLogros = nl;
    totalTarjetas = nt;
  }

  const total = nodes.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Topbar
        title="Ruta de aprendizaje"
        subtitle={esDocente ? `${paralelo.nombre} · ${total} nodos` : `${paralelo.nombre} · ${done} de ${total} completados`}
      />

      {esDocente && (
        <>
          <ParaleloSwitcher actual={paralelo} opciones={opciones} back="/map" />
          <div className="panel rounded-lg px-4 py-3 flex items-center gap-2 text-sm" style={{ borderColor: "var(--ruta-activo)" }}>
            <Eye className="h-4 w-4 shrink-0" style={{ color: "var(--ruta-activo)" }} />
            <span className="text-muted-foreground">
              Vista de revisión: ves la ruta tal como la armaste, con todo desbloqueado. Tu avance no se registra.
            </span>
          </div>
        </>
      )}

      <div className={esDocente ? "" : "grid lg:grid-cols-[1fr_260px] gap-6 items-start"}>
        <div className="relative panel rounded-lg overflow-hidden">
          {!esDocente && (
            <div className="px-6 pt-5 pb-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tu progreso</span>
                <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--ruta-completado)" }} />
              </div>
            </div>
          )}

          <div className="px-4 py-6 sm:px-8">
            {total === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Este paralelo todavía no tiene lecciones ni exámenes en la ruta.
              </p>
            ) : (
              <RutaTablero nodes={nodes} mostrarActual={!esDocente} />
            )}
          </div>

          {/* Pie del lienzo: serie de tocapus entre remates de wiphala */}
          <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-1">
            <WiphalaCorner lado="izquierda" />
            <TocapuBanda n={5} size={22} className="opacity-30 hidden sm:flex" />
            <WiphalaCorner lado="derecha" />
          </div>
          <Guarda motivo="rombos" alto={10} color="var(--primary)" opacidad={0.35} />
        </div>

        {!esDocente && (
          <PanelRecompensas logros={logros} tarjetas={tarjetas} totalLogros={totalLogros} totalTarjetas={totalTarjetas} />
        )}
      </div>
    </div>
  );
}
