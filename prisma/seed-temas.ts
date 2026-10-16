/**
 * Crea como diapositivas los cuatro temas base del curso (alfabeto, personas
 * gramaticales, sufijos básicos y léxico temático): explicaciones, tablas,
 * vocabulario y ejemplos, con un botón de sonido en cada palabra.
 *
 * Los datos salen de prisma/temas-data.json y las imágenes de public/alphabet.
 *
 *   npx tsx prisma/seed-temas.ts                 # sólo temas que no tienen diapositivas
 *   npx tsx prisma/seed-temas.ts --reemplazar    # borra las diapositivas actuales de esos temas
 *
 * Los temas se reconocen por su título (alfabeto / personas gramaticales / sufijos /
 * léxico temático). Los botones de sonido leen la palabra con una voz sintética
 * (aproximada) hasta que se les asigne una grabación desde el editor.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import data from "./temas-data.json";
import { canvasTitle, newId, sanitizeCanvas, type CanvasElement, type SlideCanvas } from "../src/lib/slide-canvas";
import { leerBiblioteca } from "../src/lib/recursos";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const REEMPLAZAR = process.argv.includes("--reemplazar");

/* ───────────── paleta (índigo y esmeralda) ───────────── */

const INDIGO = "#4338ca", INDIGO_D = "#312e81", INDIGO_L = "#eef2ff", INDIGO_B = "#c7d2fe";
const ESMERALDA = "#10b981", ESMERALDA_L = "#ecfdf5";
const AMBAR_L = "#fffbeb", AMBAR_B = "#fcd34d";
const TINTA = "#1e293b", GRIS = "#475569", GRIS_L = "#94a3b8";

/* ───────────── piezas ───────────── */

type Op = Partial<CanvasElement>;
const lineas = (texto: string, ancho: number, size: number) =>
  texto.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil((l.length * size * 0.52) / ancho)), 0);

function texto(x: number, y: number, w: number, t: string, size: number, op: Op = {}): CanvasElement {
  const lh = op.lineHeight ?? 1.25;
  return { id: newId(), type: "text", x, y, w, h: Math.ceil(lineas(t, w, size) * size * lh), text: t, fontSize: size, font: "sans", align: "left", color: TINTA, lineHeight: lh, ...op };
}
const titulo = (x: number, y: number, w: number, t: string, size: number, op: Op = {}) => texto(x, y, w, t, size, { font: "display", bold: true, color: INDIGO_D, ...op });

function caja(x: number, y: number, w: number, h: number, relleno: string, op: Op = {}): CanvasElement {
  return { id: newId(), type: "shape", shape: "rounded", x, y, w, h, fill: relleno, radius: 14, strokeWidth: 0, ...op };
}
/** Tarjeta blanca con borde. */
const tarjeta = (x: number, y: number, w: number, h: number, op: Op = {}) => caja(x, y, w, h, "#ffffff", { stroke: INDIGO_B, strokeWidth: 2, ...op });

const sonido = (x: number, y: number, lado: number, dice: string, color = INDIGO): CanvasElement =>
  ({ id: newId(), type: "sound", x, y, w: lado, h: lado, text: dice.slice(0, 200), color });

function imagen(x: number, y: number, w: number, h: number, mediaId: number, op: Op = {}): CanvasElement {
  return { id: newId(), type: "image", x, y, w, h, mediaId, fit: "contain", ...op };
}

/** Fondo claro de los temas (degradado suave índigo→esmeralda). */
const fondoClaro = (elements: CanvasElement[]): SlideCanvas => ({ background: INDIGO_L, background2: ESMERALDA_L, gradType: "linear", gradAngle: 135, elements });

/** Cabecera común: título, rayita esmeralda y pie con el nombre del tema. */
function cabecera(t: string, tema: string, subt?: string): CanvasElement[] {
  return [
    titulo(48, 26, 864, t, 32),
    caja(48, 74, 96, 6, ESMERALDA, { radius: 3 }),
    ...(subt ? [texto(160, 64, 752, subt, 15, { color: GRIS, italic: true })] : []),
    texto(48, 508, 600, `Ch'aska Aymara · ${tema}`, 11, { color: GRIS_L }),
  ];
}

function portada(t: string, subt: string, tema: string, mediaId?: number): SlideCanvas {
  return {
    background: INDIGO_D, background2: INDIGO, gradType: "linear", gradAngle: 135,
    pattern: "escalera", patternColor: "#ffffff", patternOpacity: 0.1, patternSize: 56,
    elements: [
      caja(60, 150, 8, 150, ESMERALDA, { radius: 4 }),
      titulo(90, 140, mediaId ? 520 : 780, t, 46, { color: "#ffffff" }),
      texto(90, 300, mediaId ? 500 : 760, subt, 20, { color: INDIGO_B }),
      texto(90, 470, 600, `Ch'aska Aymara · ${tema}`, 13, { color: INDIGO_B }),
      ...(mediaId ? [imagen(640, 110, 280, 320, mediaId)] : []),
    ],
  };
}

function nota(x: number, y: number, w: number, h: number, t: string, size = 17): CanvasElement[] {
  return [caja(x, y, w, h, AMBAR_L, { stroke: AMBAR_B, strokeWidth: 2 }), texto(x + 18, y + 14, w - 36, t, size, { color: "#78350f" })];
}

/** Tabla de celdas cortas: una columna = un bloque de texto con interlineado fijo (pocos elementos). */
function tablaColumnas(x: number, y: number, ancho: number, cols: { nombre: string; peso: number; celdas: string[]; negrita?: boolean; centro?: boolean }[], size = 16): CanvasElement[] {
  const filas = Math.max(...cols.map((c) => c.celdas.length));
  const lh = 2.1, alto = size * lh;
  const total = cols.reduce((s, c) => s + c.peso, 0);
  const out: CanvasElement[] = [tarjeta(x, y, ancho, alto + filas * alto + 12), caja(x, y, ancho, alto, INDIGO, { radius: 14 })];
  for (let i = 0; i < filas; i += 2) out.push(caja(x + 6, y + alto + i * alto + 6, ancho - 12, alto, INDIGO_L, { radius: 8 }));
  let cx = x;
  for (const c of cols) {
    const w = (ancho * c.peso) / total;
    out.push(texto(cx + 14, y + (alto - size * 1.25) / 2, w - 20, c.nombre, size - 1, { bold: true, color: "#ffffff", align: c.centro ? "center" : "left" }));
    const celdas = Array.from({ length: filas }, (_, i) => c.celdas[i] ?? "");
    out.push(texto(cx + 14, y + alto + 6, w - 20, celdas.join("\n"), size, { lineHeight: lh, bold: c.negrita, color: c.negrita ? INDIGO_D : TINTA, align: c.centro ? "center" : "left" }));
    cx += w;
  }
  return out;
}

/** Filas de varias líneas, una por elemento (≤ 8 filas): para tablas con explicaciones largas. */
function tablaFilas(x: number, y: number, ancho: number, cabeceras: string[], pesos: number[], filas: string[][], size = 16, altoFila = 62): CanvasElement[] {
  const total = pesos.reduce((s, p) => s + p, 0);
  const anchos = pesos.map((p) => (ancho * p) / total);
  const out: CanvasElement[] = [tarjeta(x, y, ancho, 40 + filas.length * altoFila + 8), caja(x, y, ancho, 40, INDIGO)];
  let cx = x;
  cabeceras.forEach((c, i) => { out.push(texto(cx + 14, y + 10, anchos[i] - 20, c, 15, { bold: true, color: "#ffffff" })); cx += anchos[i]; });
  filas.forEach((fila, r) => {
    const fy = y + 44 + r * altoFila;
    if (r % 2 === 0) out.push(caja(x + 6, fy - 2, ancho - 12, altoFila - 4, INDIGO_L, { radius: 8 }));
    let fx = x;
    fila.forEach((celda, i) => {
      out.push(texto(fx + 14, fy + 8, anchos[i] - 24, celda, size, { bold: i === 0, color: i === 0 ? INDIGO_D : TINTA }));
      fx += anchos[i];
    });
  });
  return out;
}

/** Cuadrícula de tarjetas palabra + significado + botón de sonido (4×3). */
function tarjetasPalabras(items: [string, string][], tema: string, t: string, subt?: string): SlideCanvas {
  const els = cabecera(t, tema, subt);
  const W = 208, H = 118, GX = 16, GY = 14, X0 = 40, Y0 = 104;
  items.forEach(([aymara, español], i) => {
    const x = X0 + (i % 4) * (W + GX), y = Y0 + Math.floor(i / 4) * (H + GY);
    els.push(tarjeta(x, y, W, H));
    els.push(titulo(x + 14, y + 12, W - 64, aymara, 20, { color: INDIGO }));
    els.push(texto(x + 14, y + 66, W - 28, español, 15, { color: GRIS }));
    els.push(sonido(x + W - 46, y + 10, 34, aymara.split(/[,(]/)[0].trim()));
  });
  return fondoClaro(els);
}

/** Filas «botón · aymara · español» (7 por diapositiva). */
function filasSonido(items: [string, string][], tema: string, t: string, cab: [string, string], subt?: string): SlideCanvas {
  const els = cabecera(t, tema, subt);
  els.push(texto(112, 94, 380, cab[0], 13, { bold: true, color: GRIS_L }), texto(530, 94, 380, cab[1], 13, { bold: true, color: GRIS_L }));
  items.forEach(([aymara, español], i) => {
    const y = 116 + i * 55;
    els.push(tarjeta(40, y, 880, 48, { radius: 12 }));
    els.push(sonido(52, y + 6, 36, aymara.split(/[(,]/)[0].trim()));
    els.push(titulo(106, y + 11, 400, aymara, 20, { color: INDIGO }));
    els.push(texto(530, y + 13, 380, español, 18, { color: TINTA }));
  });
  return fondoClaro(els);
}

const trozos = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const dividir = (s: string): [string, string] => { const i = s.indexOf(" — "); return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 3)]; };
const primeraPalabra = (s: string) => s.split(/[=;]/)[0].trim();

/* ───────────── temas ───────────── */

type Ctx = { media: (grupo: string, archivo: string) => Promise<number | undefined> };

async function deckAlfabeto(ctx: Ctx): Promise<SlideCanvas[]> {
  const T = "Lección 1: Alfabeto Aymara";
  const fonador = await ctx.media("alfabeto", "aparato_fonador.png");
  const condor = await ctx.media("mascota", "Aprender.png");
  const decks: SlideCanvas[] = [];

  decks.push(portada(T, "Conoce las vocales y consonantes del aymara con ejemplos visuales.", "Alfabeto", condor));

  decks.push(fondoClaro([
    ...cabecera("📘 Alfabeto Oficial Único Aymara", T),
    ...(fonador ? [tarjeta(40, 100, 330, 330), imagen(52, 112, 306, 306, fonador), texto(40, 440, 330, "Puntos de articulación: bilabial, dental, palatal, velar, postvelar.", 12, { color: GRIS, italic: true })] : []),
    texto(400, 104, 520, "Después de acuerdos binacionales, el alfabeto aymara reconocido oficialmente se denomina Alfabeto Oficial Único. Es un sistema fonémico: cada fonema tiene su propia letra.", 20),
    caja(400, 262, 520, 120, INDIGO_L, { stroke: INDIGO_B, strokeWidth: 2 }),
    texto(420, 276, 480, "Establecido por el DS 20227-DS (Bolivia, 1984) y la RM 1218-RM (Perú, 1985). Sintetiza propuestas previas y promueve una representación consistente.", 17, { color: INDIGO_D }),
  ]));

  decks.push(fondoClaro([
    ...cabecera("26 consonantes y 3 vocales", T),
    texto(48, 98, 864, "El sistema tiene 26 consonantes y 3 vocales (A, I, U). Las consonantes se agrupan en series: simples, aspiradas (h) y eyectivas (’).", 19),
    ...tablaColumnas(48, 190, 864, [
      { nombre: "VOCALES", peso: 2, celdas: ["Fonemas"], negrita: true },
      { nombre: "Anterior", peso: 1.5, celdas: ["i"], centro: true },
      { nombre: "Central", peso: 1.5, celdas: ["a"], centro: true },
      { nombre: "Posterior", peso: 1.5, celdas: ["u"], centro: true },
      { nombre: "Alargamiento vocálico", peso: 3, celdas: ["aa / ii / uu (doble vocal)"], centro: true },
    ], 18),
    ...nota(48, 330, 864, 110, "La diferencia entre series simples, aspiradas y eyectivas cambia significados. También se distingue /k/ (velar) de /q/ (postvelar)."),
    sonido(860, 392, 40, "a i u"),
    texto(560, 405, 290, "Escucha las vocales:", 15, { color: "#78350f", align: "right" }),
  ]));

  decks.push(fondoClaro([
    ...cabecera("Cuadro general de consonantes", T),
    ...tablaColumnas(48, 96, 864, [
      { nombre: "CONSONANTES", peso: 3.1, negrita: true, celdas: ["Oclusivas simples", "Oclusivas aspiradas", "Oclusivas eyectivas", "Africada simple", "Africada aspirada", "Africada eyectiva", "Fricativas", "Laterales", "Nasales", "Vibrante", "Pseudovocales"] },
      { nombre: "Bilabial", peso: 1, centro: true, celdas: ["p", "ph", "p’", "", "", "", "", "", "m", "", "w"] },
      { nombre: "Dental", peso: 1, centro: true, celdas: ["t", "th", "t’", "", "", "", "s", "l", "n", "r", ""] },
      { nombre: "Palatal", peso: 1, centro: true, celdas: ["", "", "", "ch", "chh", "ch’", "", "ll", "ñ", "", "y"] },
      { nombre: "Velar", peso: 1, centro: true, celdas: ["k", "kh", "k’", "", "", "", "j", "", "", "", ""] },
      { nombre: "Postvelar", peso: 1, centro: true, celdas: ["q", "qh", "q’", "", "", "", "x", "", "", "", ""] },
    ], 15),
  ]));

  const apoyo: [string, string, string][] = [
    ["Alaña", "Comprar", "Alaña sarnaqaña (ir a comprar)"],
    ["Ikintaña", "Dormir / estar durmiendo", "Wawanakax ikintaniwa"],
    ["Uma", "Agua", "Uma manq’aña (beber agua)"],
  ];
  decks.push(fondoClaro([
    ...cabecera("Vocabulario de apoyo", T),
    ...tablaFilas(48, 100, 864, ["Aymara", "Español", "Ejemplo"], [1.2, 1.4, 2.6], apoyo, 18, 70),
    ...apoyo.map(([palabra], i) => sonido(872, 146 + i * 70, 32, palabra)),
  ]));

  // Galería: una diapositiva por letra, con imagen, palabra, sonido y oración de ejemplo.
  for (const it of data.alfabeto as { letra: string; palabra: string; glosa: string; oracion: string; categoria: string; img: string }[]) {
    const id = await ctx.media("alfabeto", it.img);
    decks.push(fondoClaro([
      texto(48, 22, 300, it.categoria === "Vocales" ? "GALERÍA · VOCALES" : "GALERÍA · CONSONANTES", 13, { bold: true, color: ESMERALDA }),
      tarjeta(48, 56, 420, 430),
      ...(id ? [imagen(60, 68, 396, 406, id)] : []),
      titulo(500, 70, 260, it.letra, 84, { color: INDIGO }),
      sonido(836, 82, 72, it.palabra),
      titulo(500, 210, 420, it.palabra, 40),
      texto(500, 272, 420, `Significa: ${it.glosa}`, 24, { color: GRIS }),
      caja(500, 340, 420, 116, AMBAR_L, { stroke: AMBAR_B, strokeWidth: 2 }),
      texto(520, 354, 380, it.oracion || "—", 20, { italic: true, color: "#78350f" }),
      texto(500, 480, 420, "Toca el altavoz para escuchar la palabra.", 12, { color: GRIS_L }),
    ]));
  }

  decks.push(portada("¡Listo!", "Ya conoces las vocales y las series de consonantes. Presiona «Terminar tema» para seguir con los ejercicios.", "Alfabeto"));
  return decks;
}

function deckPersonas(): SlideCanvas[] {
  const T = "Lección 2: Las 4 personas gramaticales";
  const out: SlideCanvas[] = [portada("El sistema de 4 personas gramaticales en aymara", "Pronombres personales y cómo cambian los verbos según quién habla.", "Personas gramaticales")];

  const pron = (x: number, nombre: string, filas: [string, string][]) => [
    tarjeta(x, 100, 420, 290), caja(x, 100, 420, 40, INDIGO), texto(x + 16, 110, 380, nombre, 16, { bold: true, color: "#ffffff" }),
    ...filas.flatMap(([a, e], i) => [
      ...(i % 2 === 0 ? [caja(x + 6, 146 + i * 60, 408, 56, INDIGO_L, { radius: 8 })] : []),
      sonido(x + 14, 154 + i * 60, 40, a),
      titulo(x + 66, 150 + i * 60, 160, a, 22, { color: INDIGO }),
      texto(x + 226, 154 + i * 60, 182, e, 15, { color: TINTA }),
    ]),
  ];
  out.push(fondoClaro([
    ...cabecera("Pronombres personales", T),
    ...pron(40, "Singular", [["Naya", "Yo"], ["Juma", "Tú"], ["Jiwasa", "Tú y yo"], ["Jupa", "Él / Ella"]]),
    ...pron(500, "Plural", [["Nayanaka", "Nosotros (excluye al interlocutor)"], ["Jumanaka", "Ustedes"], ["Jiwasanaka", "Nosotros (incluye al interlocutor)"], ["Jupanaka", "Ellos / Ellas"]]),
    ...nota(40, 406, 880, 84, "Tip: el aymara distingue el “nosotros incluyente” (Jiwasanaka) del “nosotros excluyente” (Nayanaka)."),
  ]));

  const conj = (tit: string, sing: string[], plur: string[]) => {
    const col = (x: number, nombre: string, filas: string[]) => [
      tarjeta(x, 100, 430, 380), caja(x, 100, 430, 40, INDIGO), texto(x + 16, 110, 390, nombre, 16, { bold: true, color: "#ffffff" }),
      ...filas.flatMap((f, i) => {
        const [a, e] = dividir(f);
        return [
          ...(i % 2 === 0 ? [caja(x + 6, 146 + i * 82, 418, 78, INDIGO_L, { radius: 8 })] : []),
          sonido(x + 12, 168 + i * 82, 38, a),
          titulo(x + 60, 154 + i * 82, 360, a, 19, { color: INDIGO }),
          texto(x + 60, 188 + i * 82, 360, e, 16, { color: GRIS }),
        ];
      }),
    ];
    return fondoClaro([...cabecera(tit, T), ...col(40, "Singular", sing), ...col(490, "Plural", plur)]);
  };
  out.push(conj("Ser pastor (awatiri)",
    ["Nayax awatiritwa — Yo soy pastor", "Jumax awatiritawa — Tú eres pastor", "Jiwasax awatiritanwa — Tú y yo somos pastores", "Jupax awatiriwa — Él/Ella es pastor(a)"],
    ["Nänakax awatiripxtawa — Nosotros (excl.) somos pastores", "Jumanakax awatiripxtawa — Ustedes son pastores", "Jiwasanakax awatiripxtanwa — Nosotros (incl.) somos pastores", "Jupanakax awatiripxtawa — Ellos/Ellas son pastores"]));
  out.push(conj("Tener casa (utani-)",
    ["Nayax utanitwa — Yo tengo casa", "Jumax utanitawa — Tú tienes casa", "Jiwasax utanitanwa — Tú y yo tenemos casa", "Jupax utaniwa — Él/Ella tiene casa"],
    ["Nänakax utanipxtawa — Nosotros (excl.) tenemos casa", "Jumanakax utanipxtawa — Ustedes tienen casa", "Jiwasanakax utanipxtanwa — Nosotros (incl.) tenemos casa", "Jupanakax utanipxiwa — Ellos/Ellas tienen casa"]));
  out.push(conj("No tener casa (jani utani-)",
    ["Nayax janiw utanïkti — Yo no tengo casa", "Jumax janiw utanïktati — Tú no tienes casa", "Jiwasax janiw utanitanti — Tú y yo no tenemos casa", "Jupax janiw utanïkiti — Él/Ella no tiene casa"],
    ["Nänakax janiw utanipxti — Nosotros no tenemos casa", "Jumanakax janiw utanipxtati — Ustedes no tienen casa", "Jiwasanakax janiw utanipxtanti — Nosotros (incl.) no tenemos casa", "Jupanakax janiw utanipxiti — Ellos/Ellas no tienen casa"]));

  // Práctica rápida: preguntas y, en la diapositiva siguiente, las respuestas.
  const qs = data.preguntasPersonas as { q: string; opts: string[]; a: number }[];
  trozos(qs, 2).forEach((par, n) => {
    out.push(fondoClaro([
      ...cabecera(`🎯 Práctica rápida (${n + 1}/3)`, T, "Piensa tu respuesta y compárala en la última diapositiva."),
      ...par.flatMap((q, i) => [
        tarjeta(40, 104 + i * 196, 880, 184),
        titulo(60, 118 + i * 196, 840, `${n * 2 + i + 1}. ${q.q}`, 22),
        ...q.opts.map((o, k) => [caja(60 + (k % 2) * 430, 170 + i * 196 + Math.floor(k / 2) * 52, 410, 44, INDIGO_L, { stroke: INDIGO_B, strokeWidth: 2, radius: 10 }), texto(76 + (k % 2) * 430, 181 + i * 196 + Math.floor(k / 2) * 52, 380, `${"ABCD"[k]}) ${o}`, 17)]).flat(),
      ]),
    ]));
  });
  out.push(fondoClaro([
    ...cabecera("Respuestas de la práctica", T),
    ...qs.flatMap((q, i) => [
      caja(40, 100 + i * 66, 880, 58, i % 2 ? "#ffffff" : INDIGO_L, { stroke: INDIGO_B, strokeWidth: 2, radius: 10 }),
      texto(58, 108 + i * 66, 470, `${i + 1}. ${q.q}`, 15, { color: GRIS }),
      titulo(540, 118 + i * 66, 370, `${"ABCD"[q.a]}) ${q.opts[q.a]}`, 17, { color: ESMERALDA }),
    ]),
  ]));
  out.push(portada("¡Listo!", "Ya distingues las personas gramaticales y sus formas. Presiona «Terminar tema» para seguir con los ejercicios.", "Personas gramaticales"));
  return out;
}

function deckSufijos(): SlideCanvas[] {
  const T = "Lección 3: Sufijos básicos y reglas de uso";
  const out: SlideCanvas[] = [portada("Sufijos básicos y reglas de uso", "Cómo se construyen las palabras en aymara: raíz + sufijos.", "Sufijos básicos")];

  out.push(fondoClaro([
    ...cabecera("Sufijos básicos y reglas de uso", T),
    texto(48, 98, 864, "De acuerdo a Gallego, Yapita y Guzmán de Rojas, el aymara cuenta con entre 150 y 200 sufijos.", 20),
    texto(48, 160, 864, "La gramática tradicional estudia las reglas de uso (Gallego y Yapita), mientras que Guzmán propone una estructura lógica trivalente con un sufijo invisible, el «elitor», que eliminaría la última vocal de la raíz (lo que otros autores llaman sufijo fuerte).", 18, { color: GRIS }),
    ...nota(48, 330, 864, 150, "Reglas generales\n• En aymara no existen prefijos.\n• Las palabras se forman por sufijación: raíz + sufijo 1 → palabra 1 + sufijo 2 → … hasta n sufijos.", 19),
  ]));
  out.push(fondoClaro([
    ...cabecera("Fuertes, débiles y ámbitos de acción", T),
    tarjeta(40, 100, 430, 380), titulo(60, 116, 390, "Según su acción sobre la vocal anterior", 19, { color: INDIGO }),
    texto(60, 190, 390, "Sufijos fuertes: modifican o eliminan la última vocal de la palabra.\n\nSufijos débiles: mantienen la vocal intacta.", 19),
    tarjeta(490, 100, 430, 380), titulo(510, 116, 390, "Según dónde actúan", 19, { color: INDIGO }),
    texto(510, 160, 390, "Sufijos verbales: actúan sobre verbos y formas verbales.\n\nSufijos nominales: actúan sobre sustantivos, pronombres, adjetivos y/o participios.\n\nSufijos neutrales: actúan sobre cualquier palabra.", 18),
  ]));

  const tabla = (t: string, filas: [string, string, string, string][]) =>
    fondoClaro([
      ...cabecera(t, T),
      ...tablaFilas(40, 100, 880, ["Sufijo", "Acción y ejemplos", "Tipo", "Otros usos"], [1, 5, 1.7, 1.2], filas, 17, 76),
      // Cada botón lee el primer ejemplo de su fila.
      ...filas.map((f, i) => sonido(884, 146 + i * 76, 30, primeraPalabra(f[1].split("—")[1] ?? f[0]))),
    ]);
  out.push(tabla("Sufijos nominales posesivos", [
    ["XA", "Posesivo 1.ª persona — Utaxa = Mi casa", "Débil", "0"], ["MA", "Posesivo 2.ª persona — Yapuma = Tu casa", "Débil", "0"],
    ["PA", "Posesivo 3.ª persona — Amparapa = Su mano", "Débil", "0"], ["SA", "Posesivo 4.ª persona — Jilasa = Nuestro hermano", "Débil", "1"],
  ]));
  out.push(tabla("Otros sufijos nominales", [
    ["JAMA", "Similaridad, semejanza — Jumjama = Similar a ti; Ukjama = Parece eso/así", "Fuerte", "0"], ["MPI", "Conectivo «con» — Jumampi = Contigo; Ukampi = Con eso", "Débil", "0"],
    ["NAKA", "Pluralizador (-s) — Jumanaka = Ustedes; Ukanaka = Esos", "Débil", "0"], ["TAKI", "Direccionador «para» — Jumataki = Para ti; Ukataki = Para eso", "Débil", "0"],
  ]));
  out.push(tabla("Sufijos neutrales", [
    ["KI", "«Solamente» — Jumaki = Solo tú; Ukaki = Eso nomás", "Débil", "0"], ["PUNI", "«Siempre» — Jumapuni = Siempre tú; Ukapuni = Siempre así", "Débil", "0"],
    ["WA", "Afirmativo principal (ser/tener) — Ukjamawa = Así es; Utaxawa = Es mi casa; Utaniwa = Tiene", "Débil", "0"],
  ]));
  out.push(tabla("Sufijos interrogativos", [
    ["SA", "Interrogativo enfático — Kunatsa? = ¿Por qué?", "Fuerte", "1"], ["STI", "Conectivo interrogativo — Jumasti? = ¿Y tú?", "Débil", "0"], ["TI", "Interrogativo — Sumati? = ¿Es bueno?", "Débil", "0"],
  ]));

  const constr = (t: string, raiz: string, filas: [string, string][]) => {
    const els = [...cabecera(`Construcción de palabras: ${t}`, T), titulo(48, 92, 864, raiz, 20, { color: INDIGO })];
    filas.forEach(([a, e], i) => {
      const x = 40 + (i % 2) * 450, y = 140 + Math.floor(i / 2) * 72;
      els.push(tarjeta(x, y, 430, 62, { radius: 12 }), sonido(x + 12, y + 12, 38, a), titulo(x + 62, y + 8, 360, a, 20, { color: INDIGO }), texto(x + 62, y + 34, 360, e, 15, { color: GRIS }));
    });
    return fondoClaro(els);
  };
  out.push(constr("sustantivo", "Raíz sustantiva: ACHACHILA (abuelo)", [
    ["achachilawa", "es el abuelo"], ["achachilanaka", "abuelos"], ["achachilataki", "para el abuelo"], ["achachilampi", "con el abuelo"], ["achachiljama", "como el abuelo"],
    ["achachilaxa", "mi abuelo"], ["achachilanakataki", "para los abuelos"], ["achachilasti", "¿y/qué del abuelo?"], ["achachilapuniwa", "de verdad, es el abuelo"],
  ]));
  out.push(constr("verbo", "Raíz verbal: LURAÑA (hacer)", [
    ["lurañawa", "hay que hacer"], ["lurañataki", "para hacer"], ["luriri", "hacedor"], ["lurata", "hecho"], ["lurañani", "hagámoslo"], ["lurarakiñani", "también hagámoslo"],
  ]));
  out.push(constr("adjetivo", "Adjetivo: SUMA (bueno)", [
    ["sumawa", "es bonito / bueno"], ["sumaraki", "también bueno"], ["sumapuni", "sin duda es bueno"], ["sumakama", "solo los buenos"],
    ["sumipana", "mientras sea bueno"], ["sumarakipuniwa", "sin duda, también es bueno"], ["sumita", "bonito"], ["sumitawa", "es bonito"],
  ]));
  out.push(fondoClaro([
    ...cabecera("Para practicar", T),
    ...nota(48, 120, 864, 120, "Tip: prueba a identificar qué sufijos aparecen en cada forma y si son fuertes o débiles.", 22),
    texto(48, 280, 864, "Presiona «Terminar tema» para marcarlo como leído y seguir con los ejercicios.", 20, { color: GRIS }),
  ]));
  return out;
}

function deckLexico(): SlideCanvas[] {
  const T = "Lección 4: Léxico temático";
  const out: SlideCanvas[] = [portada("Léxico temático", "Frases elementales, partes del cuerpo, alimentos, familia y los números (jakhuña).", "Léxico temático")];

  const frases = data.frases as [string, string][];
  trozos(frases, 7).forEach((g, i, todos) => out.push(filasSonido(g, T, `💬 Frases elementales (${i + 1}/${todos.length})`, ["Aymara", "Español"])));
  const grupo = (nombre: string, items: [string, string][], emoji: string) =>
    trozos(items, 12).forEach((g, i, todos) => out.push(tarjetasPalabras(g, T, `${emoji} ${nombre} (${i + 1}/${todos.length})`, "Toca el altavoz para escuchar cada palabra.")));
  grupo("Partes del cuerpo", data.cuerpo as [string, string][], "🧍");
  grupo("Alimentos", data.alimentos as [string, string][], "🍲");
  grupo("Familia", data.familia as [string, string][], "👪");

  const nums = [...(data.nums1 as [string, number][]), ...(data.nums2 as [string, number][])].map(([a, v]) => [a, String(v)] as [string, string]);
  trozos(nums, 8).forEach((g, i, todos) => out.push(filasSonido(g, T, `🔢 Contando — Jakhuña (${i + 1}/${todos.length})`, ["Aymara", "Valor"], "Formas básicas y compuestas.")));

  out.push(portada("¡Listo!", "Ya tienes un vocabulario básico para conversar. Presiona «Terminar tema» para seguir con los ejercicios.", "Léxico temático"));
  return out;
}

/* ───────────── ejecución ───────────── */

const TEMAS: { clave: string; coincide: RegExp; deck: (ctx: Ctx) => SlideCanvas[] | Promise<SlideCanvas[]> }[] = [
  { clave: "alfabeto", coincide: /alfabeto/i, deck: deckAlfabeto },
  { clave: "personas gramaticales", coincide: /personas gramaticales/i, deck: deckPersonas },
  { clave: "sufijos", coincide: /sufijos/i, deck: deckSufijos },
  { clave: "léxico temático", coincide: /l[ée]xico tem[áa]tico/i, deck: deckLexico },
];

async function main() {
  const topics = await prisma.lessonTopic.findMany({ select: { id: true, title: true, _count: { select: { slides: true } } }, orderBy: { id: "asc" } });
  let hechos = 0;

  for (const topic of topics) {
    const def = TEMAS.find((t) => t.coincide.test(topic.title));
    if (!def) continue;
    if (topic._count.slides > 0 && !REEMPLAZAR) {
      console.log(`· Tema ${topic.id} «${topic.title}» ya tiene ${topic._count.slides} diapositivas: se omite (usa --reemplazar).`);
      continue;
    }

    // Cada imagen se sube una vez por tema (y comprimida), como hace el panel de recursos.
    const cache = new Map<string, number | undefined>();
    const ctx: Ctx = {
      media: async (grupo, archivo) => {
        const k = `${grupo}/${archivo}`;
        if (cache.has(k)) return cache.get(k);
        const f = await leerBiblioteca(grupo, archivo);
        let id: number | undefined;
        if (f) {
          const ya = await prisma.topicMedia.findFirst({ where: { topic_id: topic.id, kind: "image", nombre: f.nombre }, select: { id: true } });
          id = ya?.id ?? (await prisma.topicMedia.create({ data: { topic_id: topic.id, kind: "image", nombre: f.nombre.slice(0, 255), mime: f.mime, size_bytes: f.data.length, data: Uint8Array.from(f.data) }, select: { id: true } })).id;
        } else console.warn(`  ! No se encontró la imagen ${k}`);
        cache.set(k, id);
        return id;
      },
    };

    const canvases = (await def.deck(ctx)).map((c) => sanitizeCanvas(c));
    await prisma.$transaction(async (tx) => {
      if (topic._count.slides > 0) await tx.topicSlide.deleteMany({ where: { topic_id: topic.id } });
      for (const [order, canvas] of canvases.entries()) {
        await tx.topicSlide.create({ data: { topic_id: topic.id, order, title: canvasTitle(canvas), canvas } });
      }
    }, { timeout: 60_000 });

    // Medios que ya no usa ninguna diapositiva (p. ej. los de las diapositivas reemplazadas).
    const usadas = new Set(canvases.flatMap((c) => c.elements.flatMap((e) => (e.mediaId ? [e.mediaId] : []))));
    const sueltos = await prisma.topicMedia.findMany({ where: { topic_id: topic.id, audioSlides: { none: {} } }, select: { id: true } });
    const aBorrar = sueltos.map((m) => m.id).filter((id) => !usadas.has(id));
    if (aBorrar.length) await prisma.topicMedia.deleteMany({ where: { id: { in: aBorrar } } });

    console.log(`✓ Tema ${topic.id} «${topic.title}»: ${canvases.length} diapositivas.`);
    hechos++;
  }
  console.log(hechos ? `Listo: ${hechos} tema(s).` : "No se creó nada.");
}

main().finally(() => prisma.$disconnect());
