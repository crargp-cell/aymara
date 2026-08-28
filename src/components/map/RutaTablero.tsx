import Link from "next/link";
import { Check, Lock, FileQuestion, BookOpen, Sparkles } from "lucide-react";
import type { BoardNode } from "@/lib/student-board";

/**
 * Ruta de aprendizaje como tablero serpenteante: nodos geométricos gruesos
 * conectados por un camino escalonado.
 *
 * El color comunica estado y nada más:
 *   verde  = completado (con check)
 *   amarillo = nodo actual (ampliado)
 *   coral  = pendiente
 *   piedra = bloqueado
 */

const COLUMNAS = 4;
const CELDA = 150;

/** Serpentina: filas alternas van de izquierda a derecha y de derecha a izquierda. */
function posicion(i: number) {
  const fila = Math.floor(i / COLUMNAS);
  const enFila = i % COLUMNAS;
  const col = fila % 2 === 0 ? enFila : COLUMNAS - 1 - enFila;
  return { fila, col };
}

type Estado = "completado" | "activo" | "pendiente" | "bloqueado";

function estadoDe(n: BoardNode, esActual: boolean): Estado {
  if (n.done) return "completado";
  if (!n.unlocked) return "bloqueado";
  return esActual ? "activo" : "pendiente";
}

const COLOR: Record<Estado, string> = {
  completado: "var(--ruta-completado)",
  activo: "var(--ruta-activo)",
  pendiente: "var(--ruta-futuro)",
  bloqueado: "var(--ruta-bloqueado)",
};

/**
 * Tinta de la cifra/icono dentro del nodo. Sobre el amarillo hace falta tinta
 * oscura: en blanco el contraste queda en 1.9:1 y el número no se lee.
 */
const TINTA: Record<Estado, string> = {
  completado: "#ffffff",
  activo: "#4a3a0c",
  pendiente: "#ffffff",
  bloqueado: "#ffffff",
};

export function RutaTablero({ nodes, mostrarActual = true }: { nodes: BoardNode[]; mostrarActual?: boolean }) {
  const idxActual = mostrarActual ? nodes.findIndex((n) => n.unlocked && !n.done) : -1;
  const filas = Math.ceil(nodes.length / COLUMNAS) || 1;
  const alto = filas * CELDA + 40;

  return (
    <div className="relative w-full" style={{ minHeight: alto }}>
      {/* Camino: tramos rectos entre nodos, verdes donde ya se recorrió */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ height: alto }} aria-hidden="true">
        {nodes.map((n, i) => {
          if (i === 0) return null;
          const a = posicion(i - 1);
          const b = posicion(i);
          const recorrido = nodes[i - 1].done;
          const x = (c: number) => `${(c + 0.5) * (100 / COLUMNAS)}%`;
          const y = (f: number) => f * CELDA + 62;
          const trazo = recorrido ? "var(--ruta-completado)" : "var(--border)";
          const comun = {
            stroke: trazo,
            strokeWidth: 10,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
            fill: "none",
          };
          // Mismo renglón: recta. Cambio de renglón: escalón en L.
          if (a.fila === b.fila) {
            return <line key={n.key} x1={x(a.col)} y1={y(a.fila)} x2={x(b.col)} y2={y(b.fila)} {...comun} />;
          }
          return <polyline key={n.key} points={`${x(a.col)},${y(a.fila)} ${x(a.col)},${y(b.fila)} ${x(b.col)},${y(b.fila)}`} {...comun} />;
        })}
      </svg>

      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${COLUMNAS}, 1fr)` }}>
        {nodes.map((n, i) => {
          const { fila, col } = posicion(i);
          const estado = estadoDe(n, i === idxActual);
          const esExamen = n.type === "exam";
          const color = COLOR[estado];
          const grande = estado === "activo";
          const lado = grande ? 92 : 74;

          const cuerpo = (
            <>
              <div
                className={`relative flex items-center justify-center shrink-0 ${esExamen ? "nodo-rombo" : "nodo-ruta"} ${grande ? "animate-[latido_2.4s_ease-in-out_infinite]" : ""}`}
                style={{
                  width: lado,
                  height: lado,
                  background: color,
                  boxShadow: estado === "bloqueado" ? "none" : "var(--shadow-raised)",
                }}
              >
                {/* Textura textil, sólo en los nodos con superficie suficiente */}
                {estado !== "bloqueado" && (
                  <span
                    className={`absolute inset-0 ${estado === "activo" ? "textil-oscuro" : "textil"} opacity-[0.13]`}
                    aria-hidden="true"
                  />
                )}
                <span className="relative" style={{ color: TINTA[estado] }}>
                  {estado === "completado" ? (
                    <Check className="h-8 w-8" strokeWidth={3.5} />
                  ) : estado === "bloqueado" ? (
                    <Lock className="h-6 w-6" />
                  ) : esExamen ? (
                    n.examType === "ar_exam" ? <Sparkles className="h-7 w-7" /> : <FileQuestion className="h-7 w-7" />
                  ) : (
                    <span className={`font-bold ${grande ? "text-2xl" : "text-xl"}`}>{i + 1}</span>
                  )}
                </span>
              </div>

              <div className="w-[132px] text-center">
                <p className="text-xs font-semibold leading-tight line-clamp-2 flex items-center justify-center gap-1">
                  {!esExamen && <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  {n.title}
                </p>
                {n.nota && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.nota}</p>}
                {estado === "activo" && (
                  <p className="text-[10px] font-semibold mt-1 flex items-center justify-center gap-1">
                    <span className="h-2 w-2 rounded-[1px]" style={{ background: "var(--ruta-activo)" }} aria-hidden="true" />
                    Estás aquí
                  </p>
                )}
              </div>
            </>
          );

          const posStyle = { gridColumn: col + 1, gridRow: fila + 1, height: CELDA };

          if (estado === "bloqueado") {
            return (
              <span key={n.key} className="flex flex-col items-center gap-2 pt-2 cursor-not-allowed" style={posStyle} aria-disabled="true">
                {cuerpo}
                <span className="sr-only">Bloqueado — {n.lockReason}</span>
              </span>
            );
          }
          return (
            <Link
              key={n.key}
              href={esExamen ? `/exams/${n.id}` : `/lessons/${n.id}`}
              className="flex flex-col items-center gap-2 pt-2 transition-transform hover:-translate-y-1"
              style={posStyle}
            >
              {cuerpo}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
