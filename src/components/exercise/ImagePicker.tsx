"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecursoBiblioteca } from "@/lib/recursos";
import { listarImagenesAction, subirImagenAction, usarBibliotecaAction, type ImagenEjercicio } from "@/app/(app)/admin/exercises/media-actions";

/*
  Selector de imagen para un ejercicio: la sube, la toma de la biblioteca de la
  aplicación (alfabeto, cóndor…) o reutiliza una que el paralelo ya tiene. Deja
  el id elegido en un <input hidden name=...>, así funciona dentro de un <form action>.
*/

const mediaSrc = (id: number) => `/api/exercise-media/${id}`;
const kb = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const chip = "h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-medium border border-transparent hover:bg-muted";

export function ImagePicker({
  paraleloId, name, initialId = null, label = "Elegir imagen", onChange,
}: {
  paraleloId: number;
  name: string;
  initialId?: number | null;
  label?: string;
  onChange?: (id: number | null) => void;
}) {
  const [id, setId] = useState<number | null>(initialId);
  const [abierto, setAbierto] = useState(false);
  const [tab, setTab] = useState<"propias" | "biblioteca">("biblioteca");
  const [propias, setPropias] = useState<ImagenEjercicio[]>([]);
  const [biblioteca, setBiblioteca] = useState<RecursoBiblioteca[]>([]);
  const [cargado, setCargado] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  function elegir(nuevo: number | null) {
    setId(nuevo);
    onChange?.(nuevo);
    if (nuevo !== null) setAbierto(false);
  }

  async function abrir() {
    setAbierto((v) => !v);
    if (cargado) return;
    const r = await listarImagenesAction(paraleloId).catch(() => null);
    if (!r || !r.ok) { setError(r && !r.ok ? r.error : "No se pudieron cargar las imágenes."); return; }
    setPropias(r.propias);
    setBiblioteca(r.biblioteca);
    setCargado(true);
    if (r.propias.length) setTab("propias");
  }

  async function subir(file: File) {
    setOcupado("subir");
    setError(null);
    const fd = new FormData();
    fd.set("paralelo_id", String(paraleloId));
    fd.set("file", file);
    const r = await subirImagenAction(fd).catch(() => null);
    setOcupado(null);
    if (!r || !r.ok) { setError(r && !r.ok ? r.error : "No se pudo subir la imagen."); return; }
    setCargado(false);
    elegir(r.id);
  }

  async function usarBiblioteca(b: RecursoBiblioteca) {
    setOcupado(`${b.grupo}/${b.archivo}`);
    setError(null);
    const r = await usarBibliotecaAction(paraleloId, b.grupo, b.archivo).catch(() => null);
    setOcupado(null);
    if (!r || !r.ok) { setError(r && !r.ok ? r.error : "No se pudo usar la imagen."); return; }
    setCargado(false);
    elegir(r.id);
  }

  const q = busca.trim().toLowerCase();
  const lib = biblioteca.filter((b) => !q || b.nombre.toLowerCase().includes(q));
  const mias = propias.filter((p) => !q || p.nombre.toLowerCase().includes(q));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={id ?? ""} />
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
          {id ? (
            // <img> a propósito: /api/exercise-media pide sesión y el optimizador de next/image no manda cookies.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(id)} alt="" className="h-full w-full object-contain" />
          ) : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        </div>
        <button type="button" className={cn(chip, "border-border bg-card")} onClick={abrir} aria-expanded={abierto}>{id ? "Cambiar" : label}</button>
        {id && <button type="button" className={chip} onClick={() => elegir(null)} aria-label="Quitar imagen"><X className="h-4 w-4" /></button>}
      </div>

      {abierto && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-2">
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" className={cn(chip, tab === "propias" && "bg-primary/15 text-primary")} onClick={() => setTab("propias")}>Mis imágenes {cargado ? propias.length : ""}</button>
            <button type="button" className={cn(chip, tab === "biblioteca" && "bg-primary/15 text-primary")} onClick={() => setTab("biblioteca")}>Biblioteca {cargado ? biblioteca.length : ""}</button>
            <label className={cn(chip, "cursor-pointer border-border")}>
              {ocupado === "subir" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Subir imagen
              <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void subir(f); }} />
            </label>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="ml-auto h-8 w-32 rounded-md border border-input bg-background px-2 text-xs" aria-label="Buscar imágenes" />
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          {!cargado && !error && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…</p>}

          {cargado && tab === "propias" && (
            mias.length === 0 ? <p className="text-xs text-muted-foreground">Este paralelo aún no tiene imágenes. Sube una o usa la biblioteca.</p> : (
              <ul className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                {mias.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => elegir(p.id)} className="block w-full overflow-hidden rounded-lg border border-border text-left hover:ring-2 hover:ring-primary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaSrc(p.id)} alt={p.nombre} loading="lazy" className="aspect-square w-full bg-muted/40 object-contain" />
                      <span className="block truncate px-1 py-0.5 text-[10px]" title={p.nombre}>{p.nombre} · {kb(p.sizeBytes)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {cargado && tab === "biblioteca" && (
            <ul className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {lib.map((b) => (
                <li key={`${b.grupo}/${b.archivo}`}>
                  <button type="button" disabled={ocupado !== null} onClick={() => void usarBiblioteca(b)} className="block w-full overflow-hidden rounded-lg border border-border text-left hover:ring-2 hover:ring-primary disabled:opacity-60">
                    <Image src={b.url} alt={b.nombre} width={120} height={120} sizes="120px" loading="lazy" className="aspect-square w-full bg-muted/40 object-contain" />
                    <span className="block truncate px-1 py-0.5 text-[10px]" title={b.nombre}>{ocupado === `${b.grupo}/${b.archivo}` ? "…" : b.nombre}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
