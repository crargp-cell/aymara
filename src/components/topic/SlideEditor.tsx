"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalSpaceBetween,
  AlignLeft, AlignRight, AlignStartHorizontal, AlignStartVertical, AlignVerticalSpaceBetween, Bold, BringToFront,
  Check, Copy, Headphones, ImageIcon, FolderOpen, Italic, Loader2, Lock, Play, Plus, Redo2,
  SendToBack, Shapes, Trash2, Type, Underline, Undo2, Unlock, Volume2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CANVAS_H, CANVAS_W, BG_KEYS, FONTS, canvasBackgroundStyle, elementBounds, mediaUrl, newId,
  type CanvasElement, type FontKey, type ShapeKind, type SlideCanvas } from "@/lib/slide-canvas";
import { createSlideAction, deleteSlideAction, reorderSlidesAction, saveSlideAction, uploadMediaAction } from "@/app/(app)/admin/topics/[id]/slide-actions";
import { ElementBox, SlideView, StageFrame, textStyle } from "./SlideStage";
import { FondoPanel } from "./FondoPanel";
import { HANDLE_POS, SNAP_PX, ZOOMS, FIGURAS } from "./editor/constantes";
import { PLANTILLAS, t } from "./editor/plantillas";
import { clamp, clone, redimensionar, prepararImagen } from "./editor/geometria";
import { activo, Colores, Deslizador, tb } from "./editor/Barra";
import { Miniatura } from "./editor/Miniatura";
import type { Draft, Handle, Historial, Slide } from "./editor/tipos";
import { RecursosPanel } from "./RecursosPanel";

/*
  Editor de diapositivas tipo Canva: lienzo libre 16:9 donde el maestro coloca,
  gira y redimensiona textos, imágenes y figuras. Se guarda solo y todo cambio
  del lienzo se puede deshacer.

  Rendimiento: mientras dura un arrastre los cambios viven en `draft` (estado
  local del lienzo); sólo al soltar se escriben en `slides`, se apilan en el
  historial y se programa el guardado. Así un arrastre no vuelve a dibujar las
  miniaturas ni dispara guardados intermedios.
*/

export type EditorSlide = {
  id: number;
  canvas: SlideCanvas;
  audioId: number | null;
  /** `updated_at` de la diapositiva al cargarla: el servidor lo compara para detectar que otra persona la cambió. */
  version: string;
};

export function SlideEditor({ topicId, initial }: { topicId: number; initial: EditorSlide[] }) {
  const [slides, setSlides] = useState<Slide[]>(() =>
    initial.map((s) => ({ id: s.id, audioId: s.audioId, version: s.version, canvas: s.canvas })),
  );
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [estado, setEstado] = useState<"guardado" | "pendiente" | "guardando" | "error">("guardado");
  const [aviso, setAviso] = useState<string | null>(null);
  const [presentando, setPresentando] = useState(false);
  const [pIndex, setPIndex] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [menu, setMenu] = useState<"nueva" | "figuras" | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [panelFondo, setPanelFondo] = useState(false);
  /** Diapositivas que otra persona modificó mientras se editaban: no se guardan hasta decidir. */
  const [conflictos, setConflictos] = useState<number[]>([]);
  const [panelRecursos, setPanelRecursos] = useState(false);

  const slide = slides[index];
  const canvas = slide?.canvas;
  // Sólo los elementos arrastrados cambian de objeto: el resto conserva identidad y no se redibuja.
  const elementos = canvas ? (draft ? canvas.elements.map((e) => (draft[e.id] ? { ...e, ...draft[e.id] } : e)) : canvas.elements) : [];
  const seleccion = elementos.filter((e) => sel.includes(e.id));
  const unico = seleccion.length === 1 ? seleccion[0] : null;
  const textos = seleccion.filter((e) => e.type === "text");
  const figuras = seleccion.filter((e) => e.type === "shape");
  const imagenes = seleccion.filter((e) => e.type === "image");

  const slidesRef = useRef(slides);
  const indexRef = useRef(index);
  const selRef = useRef(sel);
  const editingRef = useRef(editing);
  useEffect(() => { indexRef.current = index; selRef.current = sel; editingRef.current = editing; });

  const dirty = useRef(new Set<number>());
  const cola = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undo = useRef<Historial[]>([]);
  const redo = useRef<Historial[]>([]);
  const ultimoPush = useRef<{ clave: string; t: number } | null>(null);
  const portapapeles = useRef<CanvasElement[]>([]);
  const seleccionarTodo = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileImg = useRef<HTMLInputElement>(null);
  const fileAudio = useRef<HTMLInputElement>(null);
  const fileSonido = useRef<HTMLInputElement>(null);

  /* ───────────── guardado automático ───────────── */

  const guardarPendientes = useCallback((forzar: number[] = []) => {
    const ids = [...dirty.current];
    dirty.current.clear();
    if (!ids.length) return;
    setEstado("guardando");
    cola.current = cola.current.then(async () => {
      let fallo: string | null = null;
      const choques: number[] = [];
      for (const id of ids) {
        const s = slidesRef.current.find((x) => x.id === id);
        if (!s) continue;
        const r = await saveSlideAction(id, s.canvas, s.audioId, s.version, forzar.includes(id)).catch(() => ({ ok: false as const, error: "Sin conexión con el servidor.", conflicto: false }));
        if (r.ok) {
          // Sólo cambia la versión (no el lienzo): el siguiente guardado ya parte de lo que hay en la base.
          slidesRef.current = slidesRef.current.map((x) => (x.id === id ? { ...x, version: r.version } : x));
          setSlides(slidesRef.current);
        } else if (r.conflicto) choques.push(id);
        else fallo = r.error;
      }
      if (choques.length) setConflictos((c) => [...new Set([...c, ...choques])]);
      if (fallo) { setAviso(fallo); setEstado("error"); }
      else if (choques.length) setEstado("error");
      else if (!dirty.current.size) setEstado("guardado");
    });
  }, []);

  const programar = useCallback((id: number) => {
    dirty.current.add(id);
    setEstado("pendiente");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(guardarPendientes, 900);
  }, [guardarPendientes]);

  useEffect(() => {
    const salir = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) { guardarPendientes(); e.preventDefault(); }
    };
    window.addEventListener("beforeunload", salir);
    return () => window.removeEventListener("beforeunload", salir);
  }, [guardarPendientes]);

  /* ───────────── estado de las diapositivas ───────────── */

  /** Escribe la lista de diapositivas a la vez en la ref (lecturas inmediatas) y en el estado. */
  const aplicar = useCallback((fn: (prev: Slide[]) => Slide[]) => {
    const n = fn(slidesRef.current);
    slidesRef.current = n;
    setSlides(n);
  }, []);

  /**
   * Cambia el lienzo de la diapositiva actual. Apila el estado previo para
   * deshacer; con `clave`, los cambios seguidos de la misma clave (un slider, el
   * tecleo) cuentan como uno solo.
   */
  const cambiar = useCallback((fn: (c: SlideCanvas) => SlideCanvas, clave?: string) => {
    const i = indexRef.current;
    const actual = slidesRef.current[i];
    if (!actual) return;
    const ahora = Date.now();
    const seguido = clave && ultimoPush.current?.clave === clave && ahora - ultimoPush.current.t < 900;
    if (!seguido) {
      undo.current.push({ id: actual.id, canvas: clone(actual.canvas) });
      if (undo.current.length > 100) undo.current.shift();
      redo.current = [];
    }
    ultimoPush.current = clave ? { clave, t: ahora } : null;
    aplicar((prev) => prev.map((s, j) => (j === i ? { ...s, canvas: fn(s.canvas) } : s)));
    programar(actual.id);
  }, [aplicar, programar]);

  /** Igual que `cambiar` pero sin historial: ajustes automáticos como la altura del texto. */
  const ajustar = useCallback((fn: (c: SlideCanvas) => SlideCanvas) => {
    const i = indexRef.current;
    const actual = slidesRef.current[i];
    if (!actual) return;
    aplicar((prev) => prev.map((s, j) => (j === i ? { ...s, canvas: fn(s.canvas) } : s)));
    programar(actual.id);
  }, [aplicar, programar]);

  const patchSel = useCallback((patch: Partial<CanvasElement>, tipo?: CanvasElement["type"], clave?: string) => {
    const ids = selRef.current;
    const cambiaBloqueo = "locked" in patch;
    cambiar(
      (c) => ({ ...c, elements: c.elements.map((e) => (ids.includes(e.id) && (!tipo || e.type === tipo) && (cambiaBloqueo || !e.locked) ? { ...e, ...patch } : e)) }),
      clave ?? `p-${Object.keys(patch).join(",")}`,
    );
  }, [cambiar]);

  const agregar = useCallback((nuevos: CanvasElement[]) => {
    cambiar((c) => ({ ...c, elements: [...c.elements, ...nuevos] }));
    setSel(nuevos.map((n) => n.id));
  }, [cambiar]);

  const aplicarHistorial = useCallback((desde: React.RefObject<Historial[]>, hacia: React.RefObject<Historial[]>) => {
    const paso = desde.current.pop();
    if (!paso) return;
    const i = slidesRef.current.findIndex((s) => s.id === paso.id);
    if (i < 0) return;
    hacia.current.push({ id: paso.id, canvas: clone(slidesRef.current[i].canvas) });
    ultimoPush.current = null;
    aplicar((prev) => prev.map((s) => (s.id === paso.id ? { ...s, canvas: paso.canvas } : s)));
    setIndex(i);
    setSel([]);
    setEditing(null);
    programar(paso.id);
  }, [aplicar, programar]);

  const eliminar = useCallback(() => {
    const ids = selRef.current;
    if (!ids.length) return;
    cambiar((c) => ({ ...c, elements: c.elements.filter((e) => !ids.includes(e.id) || e.locked) }));
    setSel([]);
  }, [cambiar]);

  const copiar = useCallback(() => {
    const cv = slidesRef.current[indexRef.current]?.canvas;
    if (!cv) return false;
    portapapeles.current = clone(cv.elements.filter((e) => selRef.current.includes(e.id)));
    return portapapeles.current.length > 0;
  }, []);

  const pegar = useCallback(() => {
    if (!portapapeles.current.length) return;
    // Cada pegado se desplaza un poco más para no apilar las copias exactamente encima.
    portapapeles.current = portapapeles.current.map((e) => ({ ...e, x: e.x + 20, y: e.y + 20 }));
    agregar(clone(portapapeles.current).map((e) => ({ ...e, id: newId(), locked: false })));
  }, [agregar]);

  const duplicar = useCallback(() => { if (copiar()) pegar(); }, [copiar, pegar]);

  const orden = useCallback((alFrente: boolean) => {
    const ids = selRef.current;
    cambiar((c) => {
      const marcados = c.elements.filter((e) => ids.includes(e.id));
      const resto = c.elements.filter((e) => !ids.includes(e.id));
      return { ...c, elements: alFrente ? [...resto, ...marcados] : [...marcados, ...resto] };
    });
  }, [cambiar]);

  /** Alinea la selección: con un solo elemento, respecto del lienzo; con varios, respecto de su conjunto. */
  const alinear = useCallback((eje: "x" | "y", donde: "ini" | "med" | "fin") => {
    const ids = selRef.current;
    cambiar((c) => {
      const objetivo = c.elements.filter((e) => ids.includes(e.id) && !e.locked);
      if (!objetivo.length) return c;
      const cajas = objetivo.map(elementBounds);
      const ref = ids.length === 1
        ? { x1: 0, y1: 0, x2: CANVAS_W, y2: CANVAS_H }
        : { x1: Math.min(...cajas.map((b) => b.x1)), y1: Math.min(...cajas.map((b) => b.y1)), x2: Math.max(...cajas.map((b) => b.x2)), y2: Math.max(...cajas.map((b) => b.y2)) };
      const [a, b] = eje === "x" ? [ref.x1, ref.x2] : [ref.y1, ref.y2];
      return {
        ...c,
        elements: c.elements.map((e) => {
          const i = objetivo.indexOf(e);
          if (i < 0) return e;
          const bb = cajas[i];
          const [e1, e2] = eje === "x" ? [bb.x1, bb.x2] : [bb.y1, bb.y2];
          const d = donde === "ini" ? a - e1 : donde === "fin" ? b - e2 : (a + b) / 2 - (e1 + e2) / 2;
          return { ...e, [eje]: Math.round(e[eje] + d) };
        }) };
    });
  }, [cambiar]);

  const distribuir = useCallback((eje: "x" | "y") => {
    const ids = selRef.current;
    cambiar((c) => {
      const objetivo = c.elements.filter((e) => ids.includes(e.id) && !e.locked);
      if (objetivo.length < 3) return c;
      const [k1, k2] = eje === "x" ? (["x1", "x2"] as const) : (["y1", "y2"] as const);
      const lista = objetivo.map((e) => ({ e, b: elementBounds(e) })).sort((p, q) => p.b[k1] - q.b[k1]);
      const total = lista[lista.length - 1].b[k2] - lista[0].b[k1];
      const ocupado = lista.reduce((s, p) => s + (p.b[k2] - p.b[k1]), 0);
      const hueco = (total - ocupado) / (lista.length - 1);
      const nuevo = new Map<string, number>();
      let cursor = lista[0].b[k1];
      for (const p of lista) {
        nuevo.set(p.e.id, Math.round(p.e[eje] + (cursor - p.b[k1])));
        cursor += p.b[k2] - p.b[k1] + hueco;
      }
      return { ...c, elements: c.elements.map((e) => (nuevo.has(e.id) ? { ...e, [eje]: nuevo.get(e.id)! } : e)) };
    });
  }, [cambiar]);

  /* ───────────── fondo ───────────── */

  const fondo = useCallback((patch: Partial<SlideCanvas>, clave?: string) => {
    cambiar((c) => ({ ...c, ...patch }), clave ? `bg-${clave}` : undefined);
  }, [cambiar]);

  const restablecerFondo = useCallback(() => {
    const limpio = Object.fromEntries(BG_KEYS.map((k) => [k, undefined])) as Partial<SlideCanvas>;
    cambiar((c) => ({ ...c, ...limpio, background: "#ffffff" }));
  }, [cambiar]);

  /** Copia el fondo de la diapositiva actual a todas las demás (un paso de deshacer por diapositiva). */
  const fondoATodas = useCallback(() => {
    const origen = slidesRef.current[indexRef.current]?.canvas;
    if (!origen) return;
    const fondoActual = Object.fromEntries(BG_KEYS.map((k) => [k, origen[k]])) as Partial<SlideCanvas>;
    for (const s of slidesRef.current) {
      if (s.id === slidesRef.current[indexRef.current].id) continue;
      undo.current.push({ id: s.id, canvas: clone(s.canvas) });
      programar(s.id);
    }
    redo.current = [];
    ultimoPush.current = null;
    aplicar((prev) => prev.map((s, i) => (i === indexRef.current ? s : { ...s, canvas: { ...s.canvas, ...fondoActual } })));
  }, [aplicar, programar]);

  /* ───────────── altura automática de los textos ───────────── */

  // Un cuadro de texto siempre mide lo que ocupa su contenido (como en Canva).
  useEffect(() => {
    if (draft || !stageRef.current || !canvas) return;
    const cambios = new Map<string, number>();
    for (const e of canvas.elements) {
      if (e.type !== "text") continue;
      const caja = stageRef.current.querySelector<HTMLElement>(`[data-id="${e.id}"]`);
      const nodo = caja?.firstElementChild as HTMLElement | null;
      if (!nodo) continue;
      let alto: number;
      if (nodo instanceof HTMLTextAreaElement) {
        const previo = nodo.style.height;
        nodo.style.height = "0px";
        alto = nodo.scrollHeight;
        nodo.style.height = previo;
      } else alto = nodo.offsetHeight;
      if (alto > 0 && Math.abs(alto - e.h) >= 1) cambios.set(e.id, Math.ceil(alto));
    }
    if (cambios.size) ajustar((c) => ({ ...c, elements: c.elements.map((e) => (cambios.has(e.id) ? { ...e, h: cambios.get(e.id)! } : e)) }));
  }, [canvas, editing, draft, ajustar]);

  /* ───────────── imágenes y audio ───────────── */

  const subir = useCallback(async (file: File, kind: "image" | "audio") => {
    setSubiendo(true);
    setAviso(null);
    const fd = new FormData();
    fd.set("topic_id", String(topicId));
    fd.set("kind", kind);
    fd.set("file", file);
    const r = await uploadMediaAction(fd).catch(() => ({ ok: false as const, error: "No se pudo subir el archivo." }));
    setSubiendo(false);
    if (!r.ok) { setAviso(r.error); return null; }
    return r.id;
  }, [topicId]);

  const insertarImagen = useCallback(async (original: File) => {
    setSubiendo(true);
    const { file, w: nw, h: nh } = await prepararImagen(original);
    const id = await subir(file, "image");
    if (id === null) return;
    const k = Math.min(520 / nw, 380 / nh, 1.5);
    const w = Math.round(nw * k), h = Math.round(nh * k);
    agregar([{ id: newId(), type: "image", x: Math.round((CANVAS_W - w) / 2), y: Math.round((CANVAS_H - h) / 2), w, h, mediaId: id, fit: "contain" }]);
  }, [subir, agregar]);

  const subirFondo = useCallback(async (original: File) => {
    setSubiendo(true);
    const { file } = await prepararImagen(original);
    const id = await subir(file, "image");
    if (id === null) return;
    cambiar((c) => ({ ...c, bgMediaId: id, bgOverlay: c.bgOverlay ?? "#000000", bgOverlayOpacity: c.bgOverlayOpacity ?? 0.25 }));
  }, [subir, cambiar]);

  /** Coloca en el lienzo una imagen que ya está en el tema (viene del panel de recursos). */
  const insertarImagenPorId = useCallback(async (mediaId: number) => {
    const dims = await new Promise<{ w: number; h: number }>((ok) => {
      const im = new window.Image();
      im.onload = () => ok({ w: im.naturalWidth || 400, h: im.naturalHeight || 300 });
      im.onerror = () => ok({ w: 400, h: 300 });
      im.src = mediaUrl(mediaId);
    });
    const k = Math.min(520 / dims.w, 380 / dims.h, 1.5);
    const w = Math.round(dims.w * k), h = Math.round(dims.h * k);
    agregar([{ id: newId(), type: "image", x: Math.round((CANVAS_W - w) / 2), y: Math.round((CANVAS_H - h) / 2), w, h, mediaId, fit: "contain" }]);
  }, [agregar]);

  const fondoPorId = useCallback((mediaId: number) => {
    cambiar((c) => ({ ...c, bgMediaId: mediaId, bgOverlay: c.bgOverlay ?? "#000000", bgOverlayOpacity: c.bgOverlayOpacity ?? 0.25 }));
  }, [cambiar]);

  const audioDiapositivaPorId = useCallback((mediaId: number) => {
    const i = indexRef.current;
    const actual = slidesRef.current[i];
    if (!actual) return;
    aplicar((prev) => prev.map((x, j) => (j === i ? { ...x, audioId: mediaId } : x)));
    programar(actual.id);
  }, [aplicar, programar]);

  const audioBotonPorId = useCallback((mediaId: number) => patchSel({ mediaId }, "sound", "audio-boton"), [patchSel]);

  async function elegirAudioBoton(file: File) {
    const id = await subir(file, "audio");
    if (id !== null) audioBotonPorId(id);
  }

  async function elegirAudio(file: File) {
    const id = await subir(file, "audio");
    if (id === null || !slide) return;
    aplicar((prev) => prev.map((s, i) => (i === index ? { ...s, audioId: id } : s)));
    programar(slide.id);
  }

  function quitarAudio() {
    if (!slide) return;
    aplicar((prev) => prev.map((s, i) => (i === index ? { ...s, audioId: null } : s)));
    programar(slide.id);
  }

  /* ───────────── diapositivas ───────────── */

  async function nuevaDiapositiva(cv: SlideCanvas) {
    setMenu(null);
    const r = await createSlideAction(topicId, cv).catch(() => ({ ok: false as const, error: "Sin conexión con el servidor." }));
    if (!r.ok) { setAviso(r.error); return; }
    aplicar((prev) => [...prev, { id: r.id, canvas: cv, audioId: null, version: r.version }]);
    setIndex(slidesRef.current.length - 1);
    setSel([]);
  }

  async function duplicarDiapositiva() {
    if (!slide) return;
    const copia = clone(slide.canvas);
    const r = await createSlideAction(topicId, copia).catch(() => ({ ok: false as const, error: "Sin conexión con el servidor." }));
    if (!r.ok) { setAviso(r.error); return; }
    const pos = index + 1;
    aplicar((prev) => [...prev.slice(0, pos), { id: r.id, canvas: copia, audioId: slide.audioId, version: r.version }, ...prev.slice(pos)]);
    setIndex(pos);
    reorderSlidesAction(topicId, slidesRef.current.map((s) => s.id));
    if (slide.audioId) programar(r.id);
  }

  async function borrarDiapositiva() {
    if (!slide || !confirm("¿Eliminar esta diapositiva?")) return;
    const id = slide.id;
    dirty.current.delete(id);
    const r = await deleteSlideAction(id).catch(() => ({ ok: false as const, error: "Sin conexión con el servidor." }));
    if (!r.ok) { setAviso(r.error); return; }
    undo.current = undo.current.filter((p) => p.id !== id);
    redo.current = redo.current.filter((p) => p.id !== id);
    aplicar((prev) => prev.filter((s) => s.id !== id));
    setIndex((i) => Math.max(0, Math.min(i, slidesRef.current.length - 1)));
    setSel([]);
  }

  const elegirDiapositiva = useCallback((i: number) => { setIndex(i); setSel([]); setEditing(null); }, []);
  const soltarEn = useCallback((destino: number) => {
    setDragIdx((origen) => {
      if (origen === null || origen === destino) return null;
      const lista = [...slidesRef.current];
      const [movida] = lista.splice(origen, 1);
      lista.splice(destino, 0, movida);
      slidesRef.current = lista;
      setSlides(lista);
      setIndex(destino);
      reorderSlidesAction(topicId, lista.map((s) => s.id)).then((r) => { if (!r.ok) setAviso(r.error); });
      return null;
    });
  }, [topicId]);

  /* ───────────── ratón: mover, redimensionar, girar, marquesina ───────────── */

  /** Rectángulo del lienzo en pantalla; de él salen la escala real y las coordenadas. */
  const medida = useCallback(() => {
    const r = stageRef.current!.firstElementChild!.getBoundingClientRect();
    return { r, k: r.width / CANVAS_W };
  }, []);

  /** Registra un arrastre: llama a `mover` con el desplazamiento y confirma el borrador al soltar. */
  const arrastrar = useCallback((e: React.PointerEvent, mover: (dx: number, dy: number, ev: PointerEvent, k: number) => Draft | null) => {
    const sx = e.clientX, sy = e.clientY;
    const { k } = medida();
    let ultimo: Draft | null = null;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / k, dy = (ev.clientY - sy) / k;
      if (!ultimo && Math.abs(dx) + Math.abs(dy) < 3 / k) return;
      const d = mover(dx, dy, ev, k);
      if (d) { ultimo = d; setDraft(d); }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setGuides({ v: [], h: [] });
      if (ultimo) {
        const fin = ultimo;
        cambiar((c) => ({ ...c, elements: c.elements.map((el) => (fin[el.id] ? { ...el, ...fin[el.id] } : el)) }));
      }
      setDraft(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [medida, cambiar]);

  // Estable entre renders: así ElementBox (memo) no se redibuja al arrastrar otro elemento.
  const alPulsarElemento = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const id = e.currentTarget.dataset.id!;
    if (editingRef.current === id) return;
    e.stopPropagation();
    e.preventDefault();
    const cv = slidesRef.current[indexRef.current].canvas;
    const el = cv.elements.find((x) => x.id === id);
    if (!el) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      return;
    }
    const grupo = selRef.current.includes(id) ? selRef.current : [id];
    setSel(grupo);
    setEditing(null);

    const mover = cv.elements.filter((x) => grupo.includes(x.id) && !x.locked);
    if (!mover.length) return;
    const origen = new Map(mover.map((x) => [x.id, { x: x.x, y: x.y }]));
    const caja = mover.map(elementBounds);
    const g = { x1: Math.min(...caja.map((b) => b.x1)), y1: Math.min(...caja.map((b) => b.y1)), x2: Math.max(...caja.map((b) => b.x2)), y2: Math.max(...caja.map((b) => b.y2)) };
    const otros = cv.elements.filter((x) => !grupo.includes(x.id)).map(elementBounds);
    const lineasX = [0, CANVAS_W / 2, CANVAS_W, ...otros.flatMap((b) => [b.x1, (b.x1 + b.x2) / 2, b.x2])];
    const lineasY = [0, CANVAS_H / 2, CANVAS_H, ...otros.flatMap((b) => [b.y1, (b.y1 + b.y2) / 2, b.y2])];

    arrastrar(e, (dx, dy, ev, k) => {
      const umbral = SNAP_PX / k;
      let gv: number[] = [], gh: number[] = [];
      if (!ev.altKey) {
        const mejor = (pos: number[], lineas: number[]) => {
          let m: { d: number; l: number } | null = null;
          for (const p of pos) for (const l of lineas) {
            const d = l - p;
            if (Math.abs(d) < umbral && (!m || Math.abs(d) < Math.abs(m.d))) m = { d, l };
          }
          return m;
        };
        const mx = mejor([g.x1 + dx, (g.x1 + g.x2) / 2 + dx, g.x2 + dx], lineasX);
        const my = mejor([g.y1 + dy, (g.y1 + g.y2) / 2 + dy, g.y2 + dy], lineasY);
        if (mx) { dx += mx.d; gv = [mx.l]; }
        if (my) { dy += my.d; gh = [my.l]; }
      }
      setGuides({ v: gv, h: gh });
      const d: Draft = {};
      origen.forEach((o, id2) => { d[id2] = { x: Math.round(o.x + dx), y: Math.round(o.y + dy) }; });
      return d;
    });
  }, [arrastrar]);

  const alDobleClic = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const id = e.currentTarget.dataset.id!;
    const el = slidesRef.current[indexRef.current].canvas.elements.find((x) => x.id === id);
    if (el?.type === "text" && !el.locked) { setSel([id]); setEditing(id); }
  }, []);

  function alPulsarAsa(e: React.PointerEvent, el: CanvasElement, handle: Handle) {
    e.stopPropagation();
    e.preventDefault();
    arrastrar(e, (dx, dy, ev) => ({ [el.id]: redimensionar(el, handle, dx, dy, ev.shiftKey) }));
  }

  function alPulsarGiro(e: React.PointerEvent, el: CanvasElement) {
    e.stopPropagation();
    e.preventDefault();
    const { r, k } = medida();
    const cx = r.left + (el.x + el.w / 2) * k, cy = r.top + (el.y + el.h / 2) * k;
    arrastrar(e, (_dx, _dy, ev) => {
      let a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      a = ((a + 540) % 360) - 180;
      if (ev.shiftKey) a = Math.round(a / 15) * 15;
      else for (const m of [-180, -135, -90, -45, 0, 45, 90, 135, 180]) if (Math.abs(a - m) < 3) a = m;
      return { [el.id]: { rotation: Math.round(a) } };
    });
  }

  function alPulsarFondo(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const { r, k } = medida();
    const aCanvas = (ev: { clientX: number; clientY: number }) => ({ x: (ev.clientX - r.left) / k, y: (ev.clientY - r.top) / k });
    const inicio = aCanvas(e);
    const base = e.shiftKey ? selRef.current : [];
    let movido = false;
    setEditing(null);
    const onMove = (ev: PointerEvent) => {
      const p = aCanvas(ev);
      if (!movido && Math.hypot(p.x - inicio.x, p.y - inicio.y) * k < 4) return;
      movido = true;
      const caja = { x1: Math.min(inicio.x, p.x), y1: Math.min(inicio.y, p.y), x2: Math.max(inicio.x, p.x), y2: Math.max(inicio.y, p.y) };
      setMarquee(caja);
      const cv = slidesRef.current[indexRef.current].canvas;
      const dentro = cv.elements.filter((x) => { const b = elementBounds(x); return b.x2 > caja.x1 && b.x1 < caja.x2 && b.y2 > caja.y1 && b.y1 < caja.y2; }).map((x) => x.id);
      setSel([...new Set([...base, ...dentro])]);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setMarquee(null);
      if (!movido && !e.shiftKey) setSel([]);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  /* ───────────── teclado y portapapeles ───────────── */

  useEffect(() => {
    if (presentando) return;
    function tecla(e: KeyboardEvent) {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" || tg.isContentEditable)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && k === "z") { e.preventDefault(); if (e.shiftKey) aplicarHistorial(redo, undo); else aplicarHistorial(undo, redo); return; }
      if (ctrl && k === "y") { e.preventDefault(); aplicarHistorial(redo, undo); return; }
      if (ctrl && k === "a") { e.preventDefault(); setSel(slidesRef.current[indexRef.current].canvas.elements.map((x) => x.id)); return; }
      if (ctrl && k === "c") { copiar(); return; }
      if (ctrl && k === "d") { e.preventDefault(); duplicar(); return; }
      if (!selRef.current.length) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); eliminar(); }
      else if (e.key === "Escape") setSel([]);
      else if (e.key === "Enter" && selRef.current.length === 1) {
        const el = slidesRef.current[indexRef.current].canvas.elements.find((x) => x.id === selRef.current[0]);
        if (el?.type === "text" && !el.locked) { e.preventDefault(); setEditing(el.id); }
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const paso = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowRight" ? paso : e.key === "ArrowLeft" ? -paso : 0;
        const dy = e.key === "ArrowDown" ? paso : e.key === "ArrowUp" ? -paso : 0;
        const ids = selRef.current;
        cambiar((c) => ({ ...c, elements: c.elements.map((x) => (ids.includes(x.id) && !x.locked ? { ...x, x: x.x + dx, y: x.y + dy } : x)) }), "flechas");
      }
    }
    function alPegar(e: ClipboardEvent) {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA")) return;
      const img = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (img) { e.preventDefault(); insertarImagen(img); }
      else if (portapapeles.current.length) { e.preventDefault(); pegar(); }
    }
    window.addEventListener("keydown", tecla);
    window.addEventListener("paste", alPegar);
    return () => { window.removeEventListener("keydown", tecla); window.removeEventListener("paste", alPegar); };
  }, [presentando, aplicarHistorial, copiar, duplicar, eliminar, pegar, cambiar, insertarImagen]);

  useEffect(() => {
    if (!presentando) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setPresentando(false);
      if (e.key === "ArrowRight" || e.key === " ") setPIndex((i) => Math.min(i + 1, slidesRef.current.length - 1));
      if (e.key === "ArrowLeft") setPIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [presentando]);

  /* ───────────── inserción de elementos ───────────── */

  function agregarTexto(preset: "titulo" | "subtitulo" | "cuerpo") {
    const p = {
      titulo: { fontSize: 56, bold: true, font: "display" as FontKey, text: "Título" },
      subtitulo: { fontSize: 36, bold: true, font: "sans" as FontKey, text: "Subtítulo" },
      cuerpo: { fontSize: 24, bold: false, font: "sans" as FontKey, text: "Escribe tu texto" } }[preset];
    const id = newId();
    agregar([t(id, 80, 200, 560, p.text, p.fontSize, { bold: p.bold, font: p.font })]);
    seleccionarTodo.current = true;
    setEditing(id);
  }

  function agregarSonido() {
    agregar([{ id: newId(), type: "sound", x: 456, y: 240, w: 56, h: 56, text: "palabra", color: "#4338ca" }]);
  }

  function agregarFigura(shape: ShapeKind) {
    setMenu(null);
    const lineal = shape === "line" || shape === "arrow";
    agregar([{
      id: newId(), type: "shape", shape,
      x: lineal ? 330 : 360, y: lineal ? 260 : 170, w: lineal ? 300 : 240, h: lineal ? 24 : shape === "ellipse" || shape === "star" || shape === "triangle" ? 240 : 200,
      fill: lineal ? "#1e3a8a" : "#3b82f6", strokeWidth: 0, radius: 24 }]);
  }

  /* ───────────── presentación visual ───────────── */

  const sep = <span className="mx-1 h-5 w-px bg-border" />;

  if (!slide || !canvas) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Este tema aún no tiene diapositivas.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {PLANTILLAS.map((p) => <Button key={p.nombre} variant="outline" onClick={() => nuevaDiapositiva(p.crear())}><Plus /> {p.nombre}</Button>)}
        </div>
        {aviso && <p role="alert" className="text-sm text-destructive">{aviso}</p>}
      </div>
    );
  }

  const primerTexto = textos[0];
  const primerSonido = seleccion.find((e) => e.type === "sound");
  const primeraFigura = figuras[0];
  const primeraImagen = imagenes[0];
  const todoBloqueado = seleccion.length > 0 && seleccion.every((e) => e.locked);
  const esLinea = primeraFigura?.shape === "line" || primeraFigura?.shape === "arrow";

  return (
    <div className="space-y-2">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5">
        <button type="button" className={tb} onClick={() => agregarTexto("titulo")} title="Agregar título"><Type /> Título</button>
        <button type="button" className={tb} onClick={() => agregarTexto("subtitulo")} title="Agregar subtítulo"><Type className="!size-3.5" /> Subtítulo</button>
        <button type="button" className={tb} onClick={() => agregarTexto("cuerpo")} title="Agregar texto"><Type className="!size-3" /> Texto</button>
        {sep}
        <button type="button" className={tb} onClick={() => fileImg.current?.click()} disabled={subiendo} title="Subir imagen (o pégala con Ctrl+V)">
          {subiendo ? <Loader2 className="animate-spin" /> : <ImageIcon />} Imagen
        </button>
        <button type="button" className={tb} onClick={agregarSonido} title="Agregar botón de sonido (pronunciación)"><Volume2 /> Sonido</button>
        <button type="button" className={cn(tb, panelRecursos && activo)} onClick={() => setPanelRecursos((v) => !v)} aria-expanded={panelRecursos} title="Reutilizar imágenes y audios ya cargados en el servidor"><FolderOpen /> Recursos</button>
        <div className="relative">
          <button type="button" className={cn(tb, menu === "figuras" && activo)} onClick={() => setMenu(menu === "figuras" ? null : "figuras")} aria-expanded={menu === "figuras"}><Shapes /> Figuras</button>
          {menu === "figuras" && (
            <div className="absolute left-0 top-full z-30 mt-1 grid w-44 grid-cols-4 gap-1 rounded-lg border border-border bg-card p-1.5 shadow-lg">
              {FIGURAS.map((f) => <button key={f.shape} type="button" className={cn(tb, "h-9")} onClick={() => agregarFigura(f.shape)} title={f.label} aria-label={f.label}>{f.icon}</button>)}
            </div>
          )}
        </div>
        {sep}
        <button type="button" className={tb} onClick={() => aplicarHistorial(undo, redo)} title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><Undo2 /></button>
        <button type="button" className={tb} onClick={() => aplicarHistorial(redo, undo)} title="Rehacer (Ctrl+Y)" aria-label="Rehacer"><Redo2 /></button>
        {sep}
        <button type="button" className={tb} onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)])} disabled={zoom === ZOOMS[0]} aria-label="Alejar"><ZoomOut /></button>
        <button type="button" className={cn(tb, "w-12 tabular-nums")} onClick={() => setZoom(100)} title="Ajustar al ancho">{zoom}%</button>
        <button type="button" className={tb} onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)])} disabled={zoom === ZOOMS[ZOOMS.length - 1]} aria-label="Acercar"><ZoomIn /></button>

        <div className="ml-auto flex items-center gap-2 pr-1 text-xs text-muted-foreground" role="status">
          {estado === "guardado" && <><Check className="h-3.5 w-3.5 text-green-600" /> Guardado</>}
          {(estado === "pendiente" || estado === "guardando") && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>}
          {estado === "error" && <button type="button" className="text-destructive underline" onClick={() => { setAviso(null); slidesRef.current.forEach((s) => { if (!conflictos.includes(s.id)) dirty.current.add(s.id); }); guardarPendientes(); }}>Error: reintentar</button>}
          <Button size="sm" type="button" onClick={() => { setPIndex(index); setPresentando(true); }}><Play /> Presentar</Button>
        </div>
      </div>

      {/* Propiedades de la selección */}
      <div className="flex min-h-11 flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5" aria-label="Propiedades">
        {!seleccion.length && (
          <>
            <span className="px-2 text-xs text-muted-foreground">Fondo</span>
            {["#ffffff", "#fef3c7", "#dbeafe", "#dcfce7", "#fbcfe8", "#1e3a8a", "#1a1a2e"].map((c) => (
              <button key={c} type="button" aria-label={`Fondo ${c}`} onClick={() => fondo({ background: c, background2: undefined, bgMediaId: undefined })} className={cn("h-6 w-6 rounded-full border", canvas.background === c && !canvas.background2 && !canvas.bgMediaId ? "ring-2 ring-primary ring-offset-1" : "border-border")} style={{ background: c }} />
            ))}
            {sep}
            <button type="button" className={cn(tb, panelFondo && activo)} onClick={() => setPanelFondo((v) => !v)} aria-expanded={panelFondo}>Degradados, patrones e imagen {panelFondo ? "▴" : "▾"}</button>
            <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">Arrastra en el fondo para elegir varios elementos · Mayús suma</span>
          </>
        )}

        {primerTexto && (
          <>
            <select value={primerTexto.font ?? "sans"} onChange={(e) => patchSel({ font: e.target.value as FontKey }, "text")} className="h-8 rounded-md border border-input bg-card px-2 text-xs" aria-label="Fuente">
              {(Object.keys(FONTS) as FontKey[]).map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
            </select>
            <button type="button" className={tb} onClick={() => patchSel({ fontSize: Math.max(8, (primerTexto.fontSize ?? 32) - 2) }, "text", "tam")} aria-label="Reducir tamaño">−</button>
            <input type="number" min={8} max={200} value={primerTexto.fontSize ?? 32} onChange={(e) => patchSel({ fontSize: clamp(Number(e.target.value) || 32, 8, 200) }, "text", "tam")} className="h-8 w-14 rounded-md border border-input bg-card px-1 text-center text-xs" aria-label="Tamaño de letra" />
            <button type="button" className={tb} onClick={() => patchSel({ fontSize: Math.min(200, (primerTexto.fontSize ?? 32) + 2) }, "text", "tam")} aria-label="Aumentar tamaño">+</button>
            {sep}
            <button type="button" className={cn(tb, primerTexto.bold && activo)} onClick={() => patchSel({ bold: !primerTexto.bold }, "text")} aria-pressed={!!primerTexto.bold} aria-label="Negrita"><Bold /></button>
            <button type="button" className={cn(tb, primerTexto.italic && activo)} onClick={() => patchSel({ italic: !primerTexto.italic }, "text")} aria-pressed={!!primerTexto.italic} aria-label="Cursiva"><Italic /></button>
            <button type="button" className={cn(tb, primerTexto.underline && activo)} onClick={() => patchSel({ underline: !primerTexto.underline }, "text")} aria-pressed={!!primerTexto.underline} aria-label="Subrayado"><Underline /></button>
            {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Icon]) => (
              <button key={a} type="button" className={cn(tb, (primerTexto.align ?? "left") === a && activo)} onClick={() => patchSel({ align: a }, "text")} aria-label={`Alinear texto ${a}`}><Icon /></button>
            ))}
            <select value={String(primerTexto.lineHeight ?? 1.25)} onChange={(e) => patchSel({ lineHeight: Number(e.target.value) }, "text")} className="h-8 rounded-md border border-input bg-card px-1 text-xs" aria-label="Interlineado">
              {[1, 1.15, 1.25, 1.5, 1.75, 2].map((v) => <option key={v} value={v}>↕ {v}</option>)}
            </select>
            <input type="color" aria-label="Color del texto" value={primerTexto.color ?? "#1a1a2e"} onChange={(e) => patchSel({ color: e.target.value }, "text", "color")} className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent p-0" />
            {sep}
          </>
        )}

        {primeraFigura && (
          <>
            <span className="px-1 text-xs text-muted-foreground">{esLinea ? "Color" : "Relleno"}</span>
            <Colores valor={primeraFigura.fill} onPick={(c) => patchSel({ fill: c }, "shape", "relleno")} etiqueta="Relleno" quitable={!esLinea} />
            {!esLinea && (
              <>
                {sep}
                <span className="text-xs text-muted-foreground">Borde</span>
                <input type="color" aria-label="Color del borde" value={primeraFigura.stroke ?? "#1e3a8a"} onChange={(e) => patchSel({ stroke: e.target.value }, "shape", "borde")} className="h-6 w-7 cursor-pointer rounded border border-border bg-transparent p-0" />
                <Deslizador etiqueta="Grosor" valor={primeraFigura.strokeWidth ?? 0} min={0} max={24} onChange={(v) => patchSel({ strokeWidth: v }, "shape", "grosor")} />
              </>
            )}
            {primeraFigura.shape === "rounded" && <Deslizador etiqueta="Esquinas" valor={primeraFigura.radius ?? 24} min={0} max={120} onChange={(v) => patchSel({ radius: v }, "shape", "esq")} />}
            {esLinea && <Deslizador etiqueta="Grosor" valor={Math.max(primeraFigura.strokeWidth ?? 0, 4)} min={4} max={24} onChange={(v) => patchSel({ strokeWidth: v }, "shape", "grosor")} />}
            {sep}
          </>
        )}

        {primerSonido && (
          <>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              Dice
              <input value={primerSonido.text ?? ""} maxLength={200} onChange={(e) => patchSel({ text: e.target.value }, "sound", "sonido-texto")} className="h-8 w-44 rounded-md border border-input bg-card px-2 text-xs text-foreground" aria-label="Texto que dice el botón" />
            </label>
            <input type="color" aria-label="Color del botón" value={primerSonido.color ?? "#4338ca"} onChange={(e) => patchSel({ color: e.target.value }, "sound", "sonido-color")} className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent p-0" />
            {primerSonido.mediaId ? (
              <>
                <audio controls preload="none" src={mediaUrl(primerSonido.mediaId)} className="h-8 w-40" />
                <button type="button" className={tb} onClick={() => patchSel({ mediaId: undefined }, "sound")}>Quitar grabación</button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground" title="Sin grabación se lee con una voz sintética: pronunciación aproximada">≈ voz sintética</span>
            )}
            <button type="button" className={tb} onClick={() => fileSonido.current?.click()} disabled={subiendo}>Subir grabación</button>
            <button type="button" className={cn(tb, panelRecursos && activo)} onClick={() => setPanelRecursos(true)}>Elegir de recursos</button>
            {sep}
          </>
        )}

        {primeraImagen && (
          <>
            <button type="button" className={cn(tb, (primeraImagen.fit ?? "contain") === "contain" && activo)} onClick={() => patchSel({ fit: "contain" }, "image")}>Ajustar</button>
            <button type="button" className={cn(tb, primeraImagen.fit === "cover" && activo)} onClick={() => patchSel({ fit: "cover" }, "image")}>Rellenar</button>
            <Deslizador etiqueta="Esquinas" valor={primeraImagen.radius ?? 0} min={0} max={200} onChange={(v) => patchSel({ radius: v }, "image", "esq")} />
            {sep}
          </>
        )}

        {seleccion.length > 0 && (
          <>
            <Deslizador etiqueta="Opacidad" valor={Math.round((seleccion[0].opacity ?? 1) * 100)} min={5} max={100} onChange={(v) => patchSel({ opacity: v / 100 }, undefined, "op")} />
            {unico && (
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Giro
                <input type="number" min={-360} max={360} value={Math.round(unico.rotation ?? 0)} onChange={(e) => patchSel({ rotation: clamp(Number(e.target.value) || 0, -360, 360) }, undefined, "giro")} className="h-8 w-14 rounded-md border border-input bg-card px-1 text-center text-xs" aria-label="Giro en grados" />°
              </label>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-0.5">
              <button type="button" className={tb} onClick={() => alinear("x", "ini")} title="Alinear a la izquierda" aria-label="Alinear a la izquierda"><AlignStartVertical /></button>
              <button type="button" className={tb} onClick={() => alinear("x", "med")} title="Centrar horizontalmente" aria-label="Centrar horizontalmente"><AlignCenterVertical /></button>
              <button type="button" className={tb} onClick={() => alinear("x", "fin")} title="Alinear a la derecha" aria-label="Alinear a la derecha"><AlignEndVertical /></button>
              <button type="button" className={tb} onClick={() => alinear("y", "ini")} title="Alinear arriba" aria-label="Alinear arriba"><AlignStartHorizontal /></button>
              <button type="button" className={tb} onClick={() => alinear("y", "med")} title="Centrar verticalmente" aria-label="Centrar verticalmente"><AlignCenterHorizontal /></button>
              <button type="button" className={tb} onClick={() => alinear("y", "fin")} title="Alinear abajo" aria-label="Alinear abajo"><AlignEndHorizontal /></button>
              {seleccion.length >= 3 && (
                <>
                  <button type="button" className={tb} onClick={() => distribuir("x")} title="Distribuir horizontalmente" aria-label="Distribuir horizontalmente"><AlignHorizontalSpaceBetween /></button>
                  <button type="button" className={tb} onClick={() => distribuir("y")} title="Distribuir verticalmente" aria-label="Distribuir verticalmente"><AlignVerticalSpaceBetween /></button>
                </>
              )}
              {sep}
              <button type="button" className={tb} onClick={() => orden(true)} title="Traer al frente" aria-label="Traer al frente"><BringToFront /></button>
              <button type="button" className={tb} onClick={() => orden(false)} title="Enviar al fondo" aria-label="Enviar al fondo"><SendToBack /></button>
              <button type="button" className={cn(tb, todoBloqueado && activo)} onClick={() => patchSel({ locked: !todoBloqueado })} title={todoBloqueado ? "Desbloquear" : "Bloquear posición"} aria-label={todoBloqueado ? "Desbloquear" : "Bloquear"} aria-pressed={todoBloqueado}>{todoBloqueado ? <Lock /> : <Unlock />}</button>
              <button type="button" className={tb} onClick={duplicar} title="Duplicar (Ctrl+D)" aria-label="Duplicar"><Copy /></button>
              <button type="button" className={cn(tb, "text-destructive")} onClick={eliminar} title="Eliminar (Supr)" aria-label="Eliminar"><Trash2 /></button>
            </div>
          </>
        )}
      </div>

      {panelRecursos && (
        <RecursosPanel
          topicId={topicId}
          hayBotonSonido={!!primerSonido}
          onImagen={insertarImagenPorId}
          onFondo={fondoPorId}
          onAudioDiapositiva={audioDiapositivaPorId}
          onAudioBoton={audioBotonPorId}
          onCerrar={() => setPanelRecursos(false)}
        />
      )}

      {panelFondo && !seleccion.length && (
        <FondoPanel canvas={canvas} onPatch={fondo} onReset={restablecerFondo} onApplyAll={fondoATodas} onUpload={subirFondo} subiendo={subiendo} totalDiapositivas={slides.length} />
      )}

      {conflictos.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/60 bg-amber-100/70 px-3 py-2 text-sm text-amber-950">
          <span className="flex-1">
            Otra persona modificó {conflictos.length === 1 ? "una diapositiva" : `${conflictos.length} diapositivas`} mientras las editabas. Tus cambios aún no se guardaron.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>Ver la versión guardada</Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => { const ids = conflictos; setConflictos([]); ids.forEach((id) => dirty.current.add(id)); guardarPendientes(ids); }}
          >
            Sobrescribir con la mía
          </Button>
        </div>
      )}

      {aviso && (
        <p role="alert" className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><X className="h-4 w-4" /></button>
        </p>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        {/* Miniaturas */}
        <div className="md:w-40 md:shrink-0 space-y-2">
          <div className="flex gap-2 overflow-x-auto md:max-h-[34rem] md:flex-col md:overflow-y-auto md:overflow-x-hidden pb-1 pr-1">
            {slides.map((s, i) => (
              <Miniatura key={s.id} slide={s} i={i} activa={i === index} arrastrando={dragIdx === i} onElegir={elegirDiapositiva} onDragStart={setDragIdx} onDrop={soltarEn} onDragEnd={() => setDragIdx(null)} />
            ))}
          </div>
          <div className="relative">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setMenu(menu === "nueva" ? null : "nueva")} aria-expanded={menu === "nueva"}><Plus /> Diapositiva</Button>
            {menu === "nueva" && (
              <div className="absolute bottom-full left-0 z-30 mb-1 w-full min-w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
                {PLANTILLAS.map((p) => (
                  <button key={p.nombre} type="button" className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => nuevaDiapositiva(p.crear())}>{p.nombre}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={duplicarDiapositiva} aria-label="Duplicar diapositiva" title="Duplicar diapositiva"><Copy /></Button>
            <Button type="button" variant="outline" size="sm" className="flex-1 text-destructive" onClick={borrarDiapositiva} aria-label="Eliminar diapositiva" title="Eliminar diapositiva"><Trash2 /></Button>
          </div>
        </div>

        {/* Lienzo */}
        <div className="min-w-0 flex-1 space-y-2">
          <div
            className="max-h-[75vh] overflow-auto rounded-md border border-border shadow-sm bg-[repeating-conic-gradient(#e5e7eb_0_25%,#f9fafb_0_50%)] bg-[length:16px_16px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const f = e.dataTransfer.files?.[0];
              if (f && f.type.startsWith("image/")) { e.preventDefault(); insertarImagen(f); }
            }}
          >
            <div ref={stageRef} style={{ width: `${zoom}%` }} onPointerDown={alPulsarFondo}>
              <StageFrame bg={canvasBackgroundStyle(canvas)} className="select-none touch-none">
                {(scale) => (
                  <>
                    {elementos.map((it) => (
                      <ElementBox
                        key={it.id}
                        el={it}
                        data-id={it.id}
                        cursor={editing === it.id ? "text" : it.locked ? "default" : "move"}
                        onPointerDown={alPulsarElemento}
                        onDoubleClick={alDobleClic}
                      >
                        {it.type === "text" && editing === it.id ? (
                          <textarea
                            autoFocus
                            value={it.text ?? ""}
                            onFocus={(e) => {
                              const n = e.currentTarget.value.length;
                              e.currentTarget.setSelectionRange(seleccionarTodo.current ? 0 : n, n);
                              seleccionarTodo.current = false;
                            }}
                            onChange={(e) => patchSel({ text: e.target.value }, "text", `txt-${it.id}`)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onBlur={() => setEditing(null)}
                            onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); e.stopPropagation(); }}
                            style={{ ...textStyle(it), display: "block", width: "100%", height: "100%", resize: "none", border: 0, outline: "none", background: "transparent", padding: 0, margin: 0, overflow: "hidden" }}
                          />
                        ) : undefined}
                      </ElementBox>
                    ))}

                    {/* Guías de imán */}
                    {guides.v.map((x) => <div key={`v${x}`} style={{ position: "absolute", left: x, top: 0, width: 1 / scale, height: CANVAS_H, background: "#ec4899", pointerEvents: "none" }} />)}
                    {guides.h.map((y) => <div key={`h${y}`} style={{ position: "absolute", top: y, left: 0, height: 1 / scale, width: CANVAS_W, background: "#ec4899", pointerEvents: "none" }} />)}

                    {/* Selección: un marco por elemento (con su giro); asas sólo si hay uno solo */}
                    {seleccion.map((s) => {
                      const solo = seleccion.length === 1 && !s.locked && editing !== s.id;
                      const asas: Handle[] = s.type === "sound" ? ["nw", "ne", "se", "sw"] : s.type === "text" ? ["nw", "ne", "se", "sw", "e", "w"] : s.shape === "line" || s.shape === "arrow" ? ["e", "w"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
                      return (
                        <div key={s.id} style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined, outline: `${2 / scale}px ${s.locked || editing === s.id ? "dashed" : "solid"} ${s.locked ? "#94a3b8" : "#3b82f6"}`, pointerEvents: "none" }}>
                          {solo && asas.map((h) => (
                            <div key={h} onPointerDown={(e) => alPulsarAsa(e, s, h)} style={{ position: "absolute", left: HANDLE_POS[h].left, top: HANDLE_POS[h].top, cursor: HANDLE_POS[h].cursor, pointerEvents: "auto", width: 12 / scale, height: 12 / scale, marginLeft: -6 / scale, marginTop: -6 / scale, background: "#fff", border: `${2 / scale}px solid #3b82f6`, borderRadius: 2 / scale }} />
                          ))}
                          {solo && (
                            <>
                              <div style={{ position: "absolute", left: "50%", top: -26 / scale, width: 2 / scale, height: 26 / scale, marginLeft: -1 / scale, background: "#3b82f6" }} />
                              <div onPointerDown={(e) => alPulsarGiro(e, s)} title="Girar (Mayús: de 15° en 15°)" style={{ position: "absolute", left: "50%", top: -26 / scale, cursor: "grab", pointerEvents: "auto", width: 14 / scale, height: 14 / scale, marginLeft: -7 / scale, marginTop: -14 / scale, background: "#fff", border: `${2 / scale}px solid #3b82f6`, borderRadius: "50%" }} />
                            </>
                          )}
                        </div>
                      );
                    })}

                    {marquee && <div style={{ position: "absolute", left: marquee.x1, top: marquee.y1, width: marquee.x2 - marquee.x1, height: marquee.y2 - marquee.y1, background: "rgba(59,130,246,.12)", border: `${1 / scale}px solid #3b82f6`, pointerEvents: "none" }} />}
                  </>
                )}
              </StageFrame>
            </div>
          </div>

          {/* Audio de la diapositiva */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <Headphones className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Audio de esta diapositiva:</span>
            {slide.audioId ? (
              <>
                <audio controls preload="none" src={mediaUrl(slide.audioId)} className="h-8 max-w-56" />
                <button type="button" className="text-xs text-destructive underline" onClick={quitarAudio}>Quitar</button>
              </>
            ) : (
              <button type="button" className="text-xs text-primary underline" onClick={() => fileAudio.current?.click()} disabled={subiendo}>Subir audio (MP3, WAV, OGG, M4A · máx. 10 MB)</button>
            )}
          </div>
        </div>
      </div>

      <input ref={fileImg} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) insertarImagen(f); }} />
      <input ref={fileSonido} type="file" hidden accept="audio/*,.mp3,.wav,.ogg,.m4a" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void elegirAudioBoton(f); }} />
      <input ref={fileAudio} type="file" hidden accept="audio/*,.mp3,.wav,.ogg,.m4a" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) elegirAudio(f); }} />

      {/* Presentación a pantalla completa */}
      {presentando && slides[pIndex] && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black" role="dialog" aria-label="Presentación">
          <button type="button" onClick={() => setPresentando(false)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Cerrar presentación"><X className="h-5 w-5" /></button>
          <div className="w-full" style={{ maxWidth: "min(100vw, calc(100vh * 16 / 9))" }}>
            <SlideView canvas={slides[pIndex].canvas} interactivo />
          </div>
          <div className="absolute bottom-3 flex items-center gap-3 text-sm text-white/80">
            <button type="button" onClick={() => setPIndex((i) => Math.max(0, i - 1))} disabled={pIndex === 0} className="rounded px-3 py-1 hover:bg-white/15 disabled:opacity-30">‹ Anterior</button>
            {pIndex + 1} / {slides.length}
            <button type="button" onClick={() => setPIndex((i) => Math.min(slides.length - 1, i + 1))} disabled={pIndex === slides.length - 1} className="rounded px-3 py-1 hover:bg-white/15 disabled:opacity-30">Siguiente ›</button>
          </div>
        </div>
      )}
    </div>
  );
}
