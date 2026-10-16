"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Headphones, ImageIcon, Library, Loader2, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/slide-canvas";
import type { RecursoBiblioteca } from "@/lib/recursos";
import { listarRecursosAction, usarRecursoAction, type OrigenRecurso, type RecursoMedia } from "@/app/(app)/admin/topics/[id]/slide-actions";

/*
  Panel de recursos del editor: todo lo que ya está cargado en el servidor y se
  puede reutilizar sin volver a subirlo — las imágenes y audios de los temas del
  maestro y la biblioteca que trae la aplicación (alfabeto, cóndor, portadas).

  Al elegir un recurso, el servidor lo deja disponible en este tema (copiándolo
  si viene de otro) y el editor recibe su id para colocarlo.
*/

type Tab = "imagenes" | "audios" | "biblioteca";

const kb = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const boton = "h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium border border-transparent hover:bg-muted [&_svg]:size-4 disabled:opacity-40";
const activo = "bg-primary/15 text-primary border-primary/30";

export function RecursosPanel({
  topicId, hayBotonSonido, onImagen, onFondo, onAudioDiapositiva, onAudioBoton, onCerrar,
}: {
  topicId: number;
  /** Hay un botón de sonido seleccionado al que asignarle una grabación. */
  hayBotonSonido: boolean;
  onImagen: (mediaId: number) => void;
  onFondo: (mediaId: number) => void;
  onAudioDiapositiva: (mediaId: number) => void;
  onAudioBoton: (mediaId: number) => void;
  onCerrar: () => void;
}) {
  const [tab, setTab] = useState<Tab>("imagenes");
  const [medios, setMedios] = useState<RecursoMedia[] | null>(null);
  const [biblioteca, setBiblioteca] = useState<RecursoBiblioteca[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [busca, setBusca] = useState("");
  const [soloEste, setSoloEste] = useState(false);
  const [grupo, setGrupo] = useState("todos");
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    const r = await listarRecursosAction(topicId).catch(() => null);
    setCargando(false);
    if (!r || !r.ok) { setError(r && !r.ok ? r.error : "No se pudieron cargar los recursos."); return; }
    setMedios(r.medios);
    setBiblioteca(r.biblioteca);
  }
  useEffect(() => {
    // Carga inicial al abrir el panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const q = busca.trim().toLowerCase();
  const coincide = (t: string) => !q || t.toLowerCase().includes(q);
  const imagenes = useMemo(() => (medios ?? []).filter((m) => m.kind === "image" && coincide(m.nombre) && (!soloEste || m.enEsteTema)), [medios, q, soloEste]); // eslint-disable-line react-hooks/exhaustive-deps
  const audios = useMemo(() => (medios ?? []).filter((m) => m.kind === "audio" && coincide(m.nombre) && (!soloEste || m.enEsteTema)), [medios, q, soloEste]); // eslint-disable-line react-hooks/exhaustive-deps
  const grupos = useMemo(() => [...new Map(biblioteca.map((b) => [b.grupo, b.grupoTitulo])).entries()], [biblioteca]);
  const lib = useMemo(() => biblioteca.filter((b) => (grupo === "todos" || b.grupo === grupo) && coincide(b.nombre)), [biblioteca, grupo, q]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Deja el recurso en este tema y avisa al editor con el id definitivo. */
  async function usar(origen: OrigenRecurso, clave: string, alTerminar: (id: number) => void) {
    setOcupado(clave);
    setError(null);
    const r = await usarRecursoAction(topicId, origen).catch(() => null);
    setOcupado(null);
    if (!r || !r.ok) { setError(r && !r.ok ? r.error : "No se pudo usar el recurso."); return; }
    alTerminar(r.id);
  }

  const tabs: { id: Tab; label: string; icono: React.ReactNode; n: number }[] = [
    { id: "imagenes", label: "Imágenes", icono: <ImageIcon />, n: (medios ?? []).filter((m) => m.kind === "image").length },
    { id: "audios", label: "Audios", icono: <Headphones />, n: (medios ?? []).filter((m) => m.kind === "audio").length },
    { id: "biblioteca", label: "Biblioteca", icono: <Library />, n: biblioteca.length },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3" aria-label="Recursos">
      <div className="flex flex-wrap items-center gap-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={cn(boton, tab === t.id && activo)} onClick={() => setTab(t.id)}>
            {t.icono} {t.label} <span className="text-muted-foreground">{t.n}</span>
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1 rounded-md border border-input bg-background px-2 text-xs">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="h-8 w-40 bg-transparent outline-none" aria-label="Buscar recursos" />
        </label>
        {tab !== "biblioteca" && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" checked={soloEste} onChange={(e) => setSoloEste(e.target.checked)} /> Sólo de este tema</label>
        )}
        {tab === "biblioteca" && (
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="h-8 rounded-md border border-input bg-card px-2 text-xs" aria-label="Colección">
            <option value="todos">Todas las colecciones</option>
            {grupos.map(([g, t]) => <option key={g} value={g}>{t}</option>)}
          </select>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={boton} onClick={cargar} disabled={cargando} aria-label="Actualizar"><RefreshCw className={cargando ? "animate-spin" : ""} /></button>
          <button type="button" className={boton} onClick={onCerrar} aria-label="Cerrar panel de recursos"><X /></button>
        </div>
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {medios === null && cargando && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando recursos…</p>}

      {tab === "imagenes" && medios !== null && (
        imagenes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay imágenes{q || soloEste ? " con ese filtro" : " subidas todavía"}. Sube una con el botón «Imagen» o usa la biblioteca.</p>
        ) : (
          <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {imagenes.map((m) => (
              <li key={m.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted/40">
                {/* <img> a propósito: /api/topic-media pide sesión y el optimizador de next/image no manda cookies. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(m.id)} alt={m.nombre} loading="lazy" decoding="async" className="aspect-square w-full object-contain" />
                <div className="px-1.5 py-1 text-[10px] leading-tight">
                  <p className="truncate font-medium" title={m.nombre}>{m.nombre}</p>
                  <p className="truncate text-muted-foreground" title={m.tema}>{m.enEsteTema ? "Este tema" : m.tema} · {kb(m.sizeBytes)}</p>
                </div>
                <div className="absolute inset-x-0 top-0 flex justify-center gap-1 bg-gradient-to-b from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button type="button" disabled={ocupado !== null} onClick={() => usar({ tipo: "media", id: m.id }, `m${m.id}`, onImagen)} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-black">{ocupado === `m${m.id}` ? "…" : "Insertar"}</button>
                  <button type="button" disabled={ocupado !== null} onClick={() => usar({ tipo: "media", id: m.id }, `f${m.id}`, onFondo)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-black">Fondo</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "audios" && medios !== null && (
        audios.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay audios{q || soloEste ? " con ese filtro" : " subidos todavía"}. Sube uno desde «Audio de esta diapositiva» o desde un botón de sonido.</p>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {audios.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs">
                <Headphones className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium" title={m.nombre}>{m.nombre}</span>
                  <span className="block truncate text-muted-foreground">{m.enEsteTema ? "Este tema" : m.tema} · {kb(m.sizeBytes)}</span>
                </span>
                <audio controls preload="none" src={mediaUrl(m.id)} className="h-8 w-44" />
                <button type="button" disabled={ocupado !== null} className={cn(boton, "border-border")} onClick={() => usar({ tipo: "media", id: m.id }, `a${m.id}`, onAudioDiapositiva)}>{ocupado === `a${m.id}` ? "…" : "A la diapositiva"}</button>
                <button type="button" disabled={ocupado !== null || !hayBotonSonido} title={hayBotonSonido ? "Asignar al botón de sonido seleccionado" : "Selecciona antes un botón de sonido"} className={cn(boton, "border-border")} onClick={() => usar({ tipo: "media", id: m.id }, `b${m.id}`, onAudioBoton)}>{ocupado === `b${m.id}` ? "…" : "Al botón de sonido"}</button>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "biblioteca" && (
        lib.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {lib.map((b) => {
              const clave = `${b.grupo}/${b.archivo}`;
              return (
                <li key={clave} className="group relative overflow-hidden rounded-lg border border-border bg-muted/40">
                  <Image src={b.url} alt={b.nombre} width={160} height={160} sizes="160px" loading="lazy" className="aspect-square w-full object-contain" />
                  <div className="px-1.5 py-1 text-[10px] leading-tight">
                    <p className="truncate font-medium" title={b.nombre}>{b.nombre}</p>
                    <p className="truncate text-muted-foreground">{b.grupoTitulo}</p>
                  </div>
                  <div className="absolute inset-x-0 top-0 flex justify-center gap-1 bg-gradient-to-b from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button type="button" disabled={ocupado !== null} onClick={() => usar({ tipo: "biblioteca", grupo: b.grupo, archivo: b.archivo }, `i${clave}`, onImagen)} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-black">{ocupado === `i${clave}` ? "…" : "Insertar"}</button>
                    <button type="button" disabled={ocupado !== null} onClick={() => usar({ tipo: "biblioteca", grupo: b.grupo, archivo: b.archivo }, `g${clave}`, onFondo)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-black">Fondo</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
