"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Press_Start_2P } from "next/font/google";
import { Music, Music2, RotateCcw, Type, Volume2, VolumeX } from "lucide-react";
import { comprobarGrupoAction, finalizarWordMatchAction, iniciarWordMatchAction } from "@/app/(app)/exams/[id]/actions";
import { Chiptune } from "@/lib/chiptune";
import { MallkuJuego } from "@/components/mascota/MallkuJuego";
import type { EstadoJuego } from "@/lib/mascota/guion";
import { GRUPO, PENALTY_PER_ERROR, wordMatchPct } from "@/lib/exams/word-match-score";
import s from "./arcade.module.css";
import { useModoLegible } from "@/lib/hooks/useModoLegible";

/*
  Examen de unir palabras con estética arcade de 8 bits.

  Reglas: el alumno elige GRUPO (4) cartas. Si las cuatro son de la misma
  categoría se van solas a su cofre; si no, es un error: se rompe la racha, se
  restan puntos y baja la nota (ver PENALTY_PER_ERROR). Los grupos acertados
  seguidos suben el multiplicador. El servidor vuelve a calificar con lo que el
  alumno colocó; el puntaje que se ve aquí es sólo el del juego.

  Con `preview` (modo prueba del maestro) nada se guarda y hay ayudas para
  revisar el examen: ver las respuestas, quitar el límite de tiempo y reiniciar.
*/

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

/** `category` sólo llega en el modo prueba del maestro: al alumno nunca se le manda. */
type Word = { id: number; text: string; category?: string };
type Categoria = { nombre: string; total: number };
type Result = { passed: boolean; percentage: number; arCardId: number | null };
type Phase = "intro" | "playing" | "done";
type Game = { placed: Record<number, string>; selected: number[]; shake: number[]; errors: number; streak: number; best: number; score: number; msg: string; ultimo: "acierto" | "fallo" | null };
type Floater = { id: number; x: number; y: number; text: string; color: string };

/** Colores de las categorías (sólo se ven en los cofres, nunca en las cartas: así no delatan la respuesta). */
const PALETA = ["#3ddc84", "#4cc9f0", "#ffd23f", "#ff7b54", "#c77dff", "#ff6b9d", "#80ed99", "#f9a03f"];

const NUEVO: Game = { placed: {}, selected: [], shake: [], errors: 0, streak: 0, best: 0, score: 0, msg: "", ultimo: null };
/** x1 el primer grupo, x2 tras uno seguido, … hasta x4. */
const multiplicador = (racha: number) => Math.min(4, 1 + racha);
const PUNTOS_GRUPO = 40;

export function WordMatchGame({
  examId, timeLimitSeconds, words, categorias, minScore, preview = false,
}: { examId: number; timeLimitSeconds: number; words: Word[]; categorias: Categoria[]; minScore: number; preview?: boolean }) {
  const [run, setRun] = useState(0);
  const [verRespuestas, setVerRespuestas] = useState(false);
  const [sinLimite, setSinLimite] = useState(false);

  if (words.length < GRUPO * 2) {
    return <p className="text-sm text-muted-foreground">No hay suficientes palabras del diccionario para armar este examen todavía (se necesitan al menos {GRUPO} palabras en dos categorías).</p>;
  }

  return (
    <div className="space-y-3">
      {preview && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-400/50 bg-amber-100/60 px-4 py-2.5 text-sm text-amber-950" role="note">
          <strong>Modo prueba</strong>
          <span>Así lo ve el alumno, pero nada se guarda.</span>
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={verRespuestas} onChange={(e) => setVerRespuestas(e.target.checked)} /> Mostrar respuestas</label>
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={sinLimite} onChange={(e) => setSinLimite(e.target.checked)} /> Sin límite de tiempo</label>
          <button type="button" onClick={() => setRun((r) => r + 1)} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-amber-500/60 bg-white/70 px-3 py-1 font-medium hover:bg-white">
            <RotateCcw className="h-4 w-4" /> Reiniciar
          </button>
        </div>
      )}
      <Game key={run} examId={examId} timeLimitSeconds={timeLimitSeconds} words={words} categorias={categorias} minScore={minScore} preview={preview} verRespuestas={verRespuestas} sinLimite={sinLimite} onReiniciar={() => setRun((r) => r + 1)} />
    </div>
  );
}

function BotonSonido({ activo, onClick, on, off, etiqueta }: { activo: boolean; onClick: () => void; on: React.ReactNode; off: React.ReactNode; etiqueta: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo} aria-label={etiqueta} title={etiqueta} className={`${s.btn} ${s.px} ${activo ? s.btnOn : s.btnAlt} !p-2`}>{activo ? on : off}</button>
  );
}

function Game({
  examId, timeLimitSeconds, words, categorias, minScore, preview, verRespuestas, sinLimite, onReiniciar,
}: { examId: number; timeLimitSeconds: number; words: Word[]; categorias: Categoria[]; minScore: number; preview: boolean; verRespuestas: boolean; sinLimite: boolean; onReiniciar: () => void }) {
  const router = useRouter();
  const [legible, alternarLegible] = useModoLegible();
  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const categories = useMemo(() => new Map(categorias.map((c) => [c.nombre, c.total])), [categorias]);
  // Categorías que el servidor revela al terminar (para «Te faltaron»); en el modo prueba ya vienen en las palabras.
  const [reveladas, setReveladas] = useState<Record<number, string>>({});
  const categoriaDe = (id: number) => wordsById.get(id)?.category ?? reveladas[id];
  const colorDe = useMemo(() => new Map([...categories.keys()].map((c, i) => [c, PALETA[i % PALETA.length]])), [categories]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [game, setGame] = useState<Game>(NUEVO);
  const [left, setLeft] = useState(timeLimitSeconds);
  const [result, setResult] = useState<Result | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  const gameRef = useRef<Game>(NUEVO);
  const phaseRef = useRef<Phase>("intro");
  const startRef = useRef(0);
  /** Momento (reloj del navegador) en que se acaba el tiempo según el servidor. */
  const limiteRef = useRef(0);
  const audio = useRef<Chiptune | null>(null);
  const floaterId = useRef(0);
  const ultimoTick = useRef(-1);
  /** Mientras se resuelve un grupo (acierto o error) no se aceptan más clics. */
  const evaluando = useRef(false);

  const upd = useCallback((fn: (g: Game) => Game) => {
    const n = fn(gameRef.current);
    gameRef.current = n;
    setGame(n);
  }, []);

  useEffect(() => {
    const a = new Chiptune();
    audio.current = a;
    // Los ajustes guardados sólo se conocen en el navegador: se leen tras montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMusicOn(a.musicOn);
    setSfxOn(a.sfxOn);
    return () => a.dispose();
  }, []);

  /* ───────────── fin de la partida ───────────── */

  const finish = useCallback(async (completo: boolean) => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "done";
    const a = audio.current;
    a?.stopMusic();
    a?.sfx(completo ? "win" : "lose");
    const g = gameRef.current;
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    if (completo) upd((x) => ({ ...x, score: x.score + Math.max(0, Math.floor(timeLimitSeconds - timeSpent)) }));
    setPhase("done");

    if (preview) {
      const pct = wordMatchPct(words.length, Object.keys(g.placed).length, g.errors);
      setResult({ passed: pct >= minScore, percentage: pct, arCardId: null });
      return;
    }
    // El servidor cierra el intento con lo que él validó y el tiempo que él midió.
    setEnviando(true);
    const r = await finalizarWordMatchAction(examId).catch(() => null);
    setEnviando(false);
    if (r?.faltantes) setReveladas(Object.fromEntries(r.faltantes.map((f) => [f.id, f.categoria])));
    setResult(r ?? { passed: false, percentage: 0, arCardId: null });
  }, [examId, minScore, preview, timeLimitSeconds, upd, words.length]);

  /* ───────────── reloj ───────────── */

  useEffect(() => {
    if (phase !== "playing" || sinLimite) return;
    const id = setInterval(() => {
      const restante = Math.ceil((limiteRef.current - Date.now()) / 1000);
      setLeft(restante);
      audio.current?.setHurry(restante <= timeLimitSeconds * 0.25);
      if (restante > 0 && restante <= 10 && restante !== ultimoTick.current) {
        ultimoTick.current = restante;
        audio.current?.sfx("tick");
      }
      if (restante <= 0) { clearInterval(id); void finish(false); }
    }, 250);
    return () => clearInterval(id);
  }, [phase, sinLimite, timeLimitSeconds, finish]);

  const [arrancando, setArrancando] = useState(false);
  const [errorInicio, setErrorInicio] = useState<string | null>(null);

  async function empezar() {
    if (arrancando) return;
    const a = audio.current;
    a?.unlock();
    // El tiempo y lo ya avanzado los fija el servidor: recargar la página no da otra oportunidad.
    let restante = timeLimitSeconds;
    let previo: Game = NUEVO;
    if (!preview) {
      setArrancando(true);
      setErrorInicio(null);
      const r = await iniciarWordMatchAction(examId).catch(() => null);
      setArrancando(false);
      if (!r || !r.ok) { setErrorInicio(r && !r.ok ? r.error : "No se pudo empezar. Inténtalo de nuevo."); return; }
      restante = r.restante;
      previo = { ...NUEVO, placed: Object.fromEntries(Object.entries(r.colocadas).map(([id, c]) => [Number(id), c])), errors: r.errores };
    }
    a?.startMusic();
    a?.sfx("start");
    startRef.current = Date.now();
    limiteRef.current = Date.now() + restante * 1000;
    phaseRef.current = "playing";
    upd(() => ({ ...previo, msg: `Elige ${GRUPO} cartas de la misma categoría.` }));
    setLeft(restante);
    setPhase("playing");
    if (!preview && restante <= 0) void finish(false);
  }

  /* ───────────── jugadas ───────────── */

  const flotar = useCallback((cat: string | null, text: string, color: string) => {
    // Sin categoría (error) el aviso sale del centro del tablero.
    const el = [...document.querySelectorAll<HTMLElement>("[data-cat], [data-tablero]")].find((e) => (cat ? e.dataset.cat === cat : e.dataset.tablero !== undefined) && e.offsetParent !== null);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const id = ++floaterId.current;
    setFloaters((f) => [...f, { id, x: r.left + r.width / 2, y: r.top + r.height / 2, text, color }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 950);
  }, []);

  /** Resuelve un grupo completo: las GRUPO cartas son de una misma categoría (acierto) o no (error). */
  const resolver = useCallback(async (ids: number[]) => {
    const g = gameRef.current;
    const a = audio.current;

    // Modo prueba: se comprueba aquí (el maestro ya ve las categorías). Alumno: lo decide el servidor.
    let categoria: string | null;
    if (preview) {
      const cats = new Set(ids.map((id) => wordsById.get(id)?.category));
      categoria = cats.size === 1 ? ([...cats][0] ?? null) : null;
    } else {
      const r = await comprobarGrupoAction(examId, ids).catch(() => null);
      if (!r || !r.ok) {
        upd((x) => ({ ...x, selected: [], msg: r && !r.ok ? r.error : "Sin conexión con el servidor. Inténtalo de nuevo." }));
        evaluando.current = false;
        if (r && !r.ok && /tiempo/i.test(r.error)) void finish(false);
        return;
      }
      categoria = r.categoria;
    }

    if (categoria) {
      const cat = categoria;
      const mult = multiplicador(g.streak);
      const ganado = PUNTOS_GRUPO * mult;
      const placed = { ...g.placed };
      ids.forEach((id) => { placed[id] = cat; });
      const streak = g.streak + 1;
      a?.sfx(streak >= 2 ? "combo" : "correct", Math.min(streak, 6));
      flotar(cat, `+${ganado}${mult > 1 ? ` x${mult}` : ""}`, colorDe.get(cat) ?? "#ffd23f");
      upd((x) => ({
        ...x, placed, streak, best: Math.max(x.best, streak), score: x.score + ganado, selected: [], shake: [], ultimo: "acierto",
        msg: streak >= 2 ? `¡${streak} grupos seguidos! Puntos x${multiplicador(streak)}` : `¡Bien! Eran de «${cat}».`,
      }));
      evaluando.current = false;
      if (Object.keys(placed).length === words.length) setTimeout(() => void finish(true), 600);
      return;
    }

    a?.sfx("wrong");
    navigator.vibrate?.(150);
    flotar(null, "-5", "#ff4d6d");
    upd((x) => ({ ...x, shake: ids, errors: x.errors + 1, streak: 0, ultimo: "fallo", score: Math.max(0, x.score - 5), msg: "¡No son de la misma categoría! Pierdes la racha." }));
    setTimeout(() => {
      upd((x) => ({ ...x, shake: [], selected: [] }));
      evaluando.current = false;
    }, 700);
  }, [colorDe, examId, finish, flotar, preview, upd, wordsById, words.length]);

  const alternar = useCallback((id: number) => {
    if (phaseRef.current !== "playing" || evaluando.current || id in gameRef.current.placed) return;
    const g = gameRef.current;
    const ya = g.selected.includes(id);
    if (!ya && g.selected.length >= GRUPO) return;
    const selected = ya ? g.selected.filter((x) => x !== id) : [...g.selected, id];
    audio.current?.sfx("select");
    upd((x) => ({ ...x, selected, msg: selected.length ? `${selected.length}/${GRUPO} elegidas…` : `Elige ${GRUPO} cartas de la misma categoría.` }));
    if (selected.length === GRUPO) {
      evaluando.current = true;
      // Una pausa corta para que se vea la cuarta carta elegida antes de resolver.
      setTimeout(() => void resolver(selected), 350);
    }
  }, [resolver, upd]);

  /* ───────────── derivados ───────────── */

  const pool = words.filter((w) => !(w.id in game.placed));
  const colocadas = words.length - pool.length;
  const pct = sinLimite ? 100 : Math.max(0, Math.min(100, (left / timeLimitSeconds) * 100));
  const apurado = !sinLimite && pct <= 25;
  const mm = Math.floor(Math.max(0, left) / 60);
  const ss = Math.max(0, left) % 60;
  const mult = multiplicador(game.streak);

  const canastas = [...categories.entries()].map(([cat, total]) => ({
    cat, total, color: colorDe.get(cat)!,
    dentro: Object.entries(game.placed).filter(([, c]) => c === cat).map(([id]) => ({ id: Number(id), text: wordsById.get(Number(id))!.text })),
  }));

  const canasta = (c: (typeof canastas)[number], compacta: boolean) => (
    <div
      key={c.cat}
      data-cat={c.cat}
      role="group"
      aria-label={`${c.cat}: ${c.dentro.length} de ${c.total}`}
      className={`${s.basket} ${s.px} ${c.dentro.length === c.total ? s.basketDone : ""} ${compacta ? "shrink-0 w-28 !p-2" : ""}`}
      style={{ ["--c" as string]: c.dentro.length === c.total ? c.color : "#000", cursor: "default" }}
    >
      <span className="flex items-center gap-2 text-[12px] leading-tight" style={{ color: c.color }}>
        <span className="inline-block h-3 w-3 shrink-0" style={{ background: c.color }} />
        <span className={compacta ? "line-clamp-1" : ""}>{c.cat}</span>
      </span>
      <span className="mt-2 flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: c.total }).map((_, i) => <span key={i} className={`${s.pip} ${i < c.dentro.length ? s.pipOn : ""}`} style={{ ["--k" as string]: c.color }} />)}
      </span>
      {!compacta && c.dentro.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1 text-[10px] leading-tight text-[#e8ecff]/80">
          {c.dentro.map((d) => <span key={d.id} className="bg-black/30 px-1.5 py-1">{d.text}</span>)}
        </span>
      )}
    </div>
  );

  const alternarMusica = () => { const a = audio.current; if (!a) return; a.unlock(); a.setMusic(!a.musicOn); setMusicOn(a.musicOn); };
  const alternarSfx = () => { const a = audio.current; if (!a) return; a.unlock(); a.setSfx(!a.sfxOn); setSfxOn(a.sfxOn); };

  const faltantes = words.filter((w) => !(w.id in game.placed));
  const estadoMallku: EstadoJuego =
    phase === "intro"
      ? { tipo: "intro", juego: "examen" }
      : phase === "done"
        ? { tipo: "resultado", aprobado: !!result?.passed }
        : game.ultimo === "acierto"
          ? { tipo: "acierto", racha: game.streak }
          : game.ultimo === "fallo"
            ? { tipo: "fallo" }
            : { tipo: "pensando" };

  return (
    <div className={`${s.screen} ${pixel.className} ${legible ? s.legible : ""} text-[12px] leading-relaxed pb-28 md:pb-4`}>
      {/* HUD */}
      <div className="relative z-10 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div>
          <p className="text-[10px] text-[#e8ecff]/60">PUNTOS</p>
          <p className="text-sm text-[#ffd23f]">{String(game.score).padStart(5, "0")}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#e8ecff]/60">RACHA</p>
          <p className="text-sm" style={{ color: mult > 1 ? "#3ddc84" : "#e8ecff" }}>x{mult}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#e8ecff]/60">ERRORES</p>
          <p className="text-sm text-[#ff6b9d]">{game.errors}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#e8ecff]/60">CARTAS</p>
          <p className="text-sm">{colocadas}/{words.length}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#e8ecff]/60">ELEGIDAS</p>
          <p className="text-sm text-[#ffd23f]">{game.selected.length}/{GRUPO}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="min-w-[8.5rem]">
            <p className={`text-[10px] ${apurado ? s.hurry : "text-[#e8ecff]/60"}`}>TIEMPO</p>
            <p className={`text-sm ${apurado ? s.hurry : ""}`}>{sinLimite ? "∞" : `${mm}:${String(ss).padStart(2, "0")}`}</p>
            <div className="mt-1 h-2 w-full bg-[#2a3a8c]" aria-hidden>
              <div className="h-full" style={{ width: `${pct}%`, background: apurado ? "#ff4d6d" : "#4cc9f0", transition: "width .25s steps(4)" }} />
            </div>
          </div>
          <BotonSonido activo={musicOn} onClick={alternarMusica} on={<Music />} off={<Music2 />} etiqueta={musicOn ? "Silenciar música" : "Activar música"} />
          <BotonSonido activo={sfxOn} onClick={alternarSfx} on={<Volume2 />} off={<VolumeX />} etiqueta={sfxOn ? "Silenciar efectos" : "Activar efectos"} />
          <BotonSonido activo={legible} onClick={alternarLegible} on={<Type />} off={<Type />} etiqueta={legible ? "Volver al estilo arcade" : "Texto normal (más legible)"} />
        </div>
      </div>

      {/* Mallku acompaña el examen y reacciona a cada grupo */}
      <MallkuJuego estado={estadoMallku} semilla={game.errors + colocadas} size={64} oscuro className="relative z-10 mb-4" />

      {/* Tablero */}
      <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_270px]">
        <div className={`${s.panel} ${s.px} p-4`} data-tablero>
          <div className="grid min-h-[200px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pool.map((w) => {
              const sel = game.selected.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={phase !== "playing"}
                  onClick={() => alternar(w.id)}
                  aria-pressed={sel}
                  className={`${s.card} ${s.px} text-[13px] ${sel ? s.cardSel : ""} ${game.shake.includes(w.id) ? s.cardShake : ""}`}
                >
                  <span className="break-words">{w.text}</span>
                  {verRespuestas && <span className="bg-[#1a1030] px-1.5 py-0.5 text-[9px] text-[#3ddc84]">{w.category}</span>}
                </button>
              );
            })}
            {pool.length === 0 && <p className="col-span-full self-center text-center text-[#3ddc84]">¡TODAS LAS CARTAS COLOCADAS!</p>}
          </div>
          <p className="mt-4 min-h-[1.5em] text-[11px] text-[#ffd23f]" role="status">{game.msg}</p>
        </div>

        <aside className="hidden flex-col gap-4 md:flex" aria-label="Categorías">
          {canastas.map((c) => canasta(c, false))}
        </aside>
      </div>

      {/* Cofres en móvil: barra fija abajo */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-[#2a3a8c] bg-[#0b1020] p-2 md:hidden" aria-label="Categorías">
        <div className="flex gap-3 overflow-x-auto px-1 py-2">{canastas.map((c) => canasta(c, true))}</div>
      </div>

      {floaters.map((f) => <span key={f.id} className={`${s.floater} ${pixel.className}`} style={{ left: f.x, top: f.y, ["--k" as string]: f.color }}>{f.text}</span>)}

      {/* Pantalla de inicio */}
      {phase === "intro" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1020]/95 p-4">
          <div className={`${s.panel} ${s.px} w-full max-w-lg space-y-5 p-6 text-center`}>
            <h2 className="text-lg leading-snug text-[#ffd23f]">UNIR PALABRAS</h2>
            <ul className="space-y-3 text-left text-[11px] leading-relaxed">
              <li>▸ Elige {GRUPO} cartas que sean de la misma categoría.</li>
              <li>▸ Si las {GRUPO} coinciden, se van solas a su cofre. Si no, es un error.</li>
              <li>▸ Los grupos acertados seguidos suben tus puntos: x2, x3… hasta x4.</li>
              <li>▸ Cada error rompe la racha y resta nota ({PENALTY_PER_ERROR} carta). ¡Piénsalo antes de elegir la cuarta!</li>
              <li>▸ {words.length} cartas · {categories.size} categorías · {sinLimite ? "sin límite de tiempo" : `${Math.round(timeLimitSeconds / 60)} min`} · mínimo {minScore}% para aprobar.</li>
            </ul>
            <div className="flex items-center justify-center gap-3">
              <BotonSonido activo={musicOn} onClick={alternarMusica} on={<Music />} off={<Music2 />} etiqueta={musicOn ? "Silenciar música" : "Activar música"} />
              <BotonSonido activo={sfxOn} onClick={alternarSfx} on={<Volume2 />} off={<VolumeX />} etiqueta={sfxOn ? "Silenciar efectos" : "Activar efectos"} />
          <BotonSonido activo={legible} onClick={alternarLegible} on={<Type />} off={<Type />} etiqueta={legible ? "Volver al estilo arcade" : "Texto normal (más legible)"} />
              <button type="button" onClick={() => void empezar()} disabled={arrancando} className={`${s.btn} ${s.px} text-xs`}>{arrancando ? "…" : "▶ Jugar"}</button>
            </div>
            {errorInicio && <p role="alert" className="text-[11px] text-[#ff6b9d]">{errorInicio}</p>}
            {preview && <p className="text-[10px] text-[#3ddc84]">MODO PRUEBA · NO SE GUARDA</p>}
            <p className={`text-[10px] text-[#e8ecff]/50 ${s.blink}`}>PRESIONA JUGAR</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {phase === "done" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className={`${s.panel} ${s.px} ${pixel.className} max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto p-6 text-center text-[12px] leading-relaxed text-[#e8ecff]`}>
            {enviando || !result ? (
              <p className={s.blink}>GUARDANDO RESULTADO…</p>
            ) : (
              <>
                <h2 className="text-base leading-snug" style={{ color: result.passed ? "#3ddc84" : "#ff6b9d" }}>{result.passed ? "¡APROBADO!" : colocadas === words.length ? "COMPLETADO" : "FIN DEL JUEGO"}</h2>
                <p className="text-3xl text-[#ffd23f]">{result.percentage}%</p>
                <div className="grid grid-cols-2 gap-2 text-left text-[11px]">
                  <span>Puntos</span><span className="text-right text-[#ffd23f]">{game.score}</span>
                  <span>Cartas</span><span className="text-right">{colocadas}/{words.length}</span>
                  <span>Errores</span><span className="text-right text-[#ff6b9d]">{game.errors}</span>
                  <span>Mejor racha</span><span className="text-right text-[#3ddc84]">{game.best}</span>
                  <span>Mínimo</span><span className="text-right">{minScore}%</span>
                </div>
                {result.arCardId && <p className="text-[#ffd23f]">★ ¡DESBLOQUEASTE UNA TARJETA AR! ★</p>}
                {preview && <p className="text-[#3ddc84]">MODO PRUEBA: NO SE GUARDÓ.</p>}

                {faltantes.length > 0 && (
                  <div className="space-y-2 text-left">
                    <p className="text-[#e8ecff]/70">Te faltaron:</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px]">
                      {faltantes.map((w) => (
                        <li key={w.id} className="flex justify-between gap-3 bg-black/30 px-2 py-1.5"><span>{w.text}</span><span style={{ color: colorDe.get(categoriaDe(w.id) ?? "") }}>{categoriaDe(w.id)}</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {preview ? (
                    <button type="button" className={`${s.btn} ${s.px}`} onClick={onReiniciar}>Jugar otra vez</button>
                  ) : (
                    <>
                      <button type="button" className={`${s.btn} ${s.px}`} onClick={() => router.push("/map")}>Mapa</button>
                      <button type="button" className={`${s.btn} ${s.btnAlt} ${s.px}`} onClick={() => router.push("/exams")}>Exámenes</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
