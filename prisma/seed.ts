/**
 * Seed de desarrollo COMPLETO — colegio único, materia única (Aymara).
 *
 * Genera un escenario que permite probar TODAS las funciones del sistema:
 * estructura académica en 3 gestiones, promoción/retiro/reincorporación/traslado,
 * cambio de profesor sin perder contenido, pool de ejercicios reutilizables,
 * versionado de lecciones (cambio mayor que caduca progreso), material PDF,
 * tarjetas AR (otorgadas, retiradas y revocadas), exámenes con ventana abierta /
 * futura / cerrada, historial de intentos con reintentos, logros automáticos,
 * comentarios de supervisión, y datos suficientes para analítica + modelo ML.
 *
 * ⚠️ BORRA todos los datos existentes antes de recrear el escenario.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateMarkerImage, generateTopicPdf, installMarkerAssets } from "./seed-assets";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DEMO_PASSWORD = "Demo1234!";
const HOY = new Date();
const día = (offset: number, hora = 10) => {
  const d = new Date(HOY);
  d.setDate(d.getDate() + offset);
  d.setHours(hora, 0, 0, 0);
  return d;
};

type Legacy = {
  diccionario: { aymara: string | null; espanol: string | null; categoria: string | null }[];
  topics: { lesson_id: number; title: string; content: string | null }[];
};

function loadLegacy(): Legacy {
  const p = join(process.cwd(), "prisma", "legacy-data.json");
  if (!existsSync(p)) return { diccionario: [], topics: [] };
  return JSON.parse(readFileSync(p, "utf8")) as Legacy;
}

// ---------------------------------------------------------------------------
// 0. Reset — hijos primero para respetar las claves foráneas
// ---------------------------------------------------------------------------
async function reset() {
  await prisma.examAttemptDetail.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.examArCard.deleteMany();
  await prisma.examPrerequisito.deleteMany();
  await prisma.examDetail.deleteMany();
  await prisma.exerciseAttempt.deleteMany();
  await prisma.lessonAttempt.deleteMany();
  await prisma.topicReading.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.logroAlumno.deleteMany();
  await prisma.userArCard.deleteMany();
  await prisma.multipleChoiceOption.deleteMany();
  await prisma.matchingPair.deleteMany();
  await prisma.fillInTheBlankAnswer.deleteMany();
  await prisma.lessonExercise.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.lessonVersion.deleteMany();
  await prisma.lessonTopic.deleteMany();
  await prisma.archivo.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.arCard.deleteMany();
  await prisma.contentOrder.deleteMany();
  await prisma.comentarioRevision.deleteMany();
  await prisma.movimientoAcademico.deleteMany();
  await prisma.inscripcion.deleteMany();
  await prisma.asignacionProfesor.deleteMany();
  await prisma.paralelo.deleteMany();
  await prisma.grado.deleteMany();
  await prisma.gestion.deleteMany();
  await prisma.prediccionAlumno.deleteMany();
  await prisma.mlModelo.deleteMany();
  await prisma.statisticsAggregated.deleteMany();
  await prisma.errorPattern.deleteMany();
  await prisma.accessLog.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.diccionario.deleteMany();
  await prisma.logro.deleteMany();
  await prisma.usuario.deleteMany();
}

// ---------------------------------------------------------------------------
// Catálogo de logros (automáticos — Negocio.md §24)
// ---------------------------------------------------------------------------
const LOGROS = [
  { codigo: "primera_leccion", nombre: "Primer paso", descripcion: "Completaste tu primera lección", icono: "Flag", categoria: "lecciones" as const, criterio_tipo: "lecciones_completadas", criterio_valor: 1 },
  { codigo: "tres_lecciones", nombre: "Tomando ritmo", descripcion: "Completaste 3 lecciones", icono: "BookOpen", categoria: "lecciones" as const, criterio_tipo: "lecciones_completadas", criterio_valor: 3 },
  { codigo: "cinco_lecciones", nombre: "En marcha", descripcion: "Completaste 5 lecciones", icono: "Library", categoria: "lecciones" as const, criterio_tipo: "lecciones_completadas", criterio_valor: 5 },
  { codigo: "diez_lecciones", nombre: "Constancia", descripcion: "Completaste 10 lecciones", icono: "GraduationCap", categoria: "lecciones" as const, criterio_tipo: "lecciones_completadas", criterio_valor: 10 },
  { codigo: "racha_3", nombre: "Racha de 3", descripcion: "3 días seguidos practicando", icono: "Flame", categoria: "racha" as const, criterio_tipo: "racha_dias", criterio_valor: 3 },
  { codigo: "racha_7", nombre: "Racha de 7", descripcion: "7 días seguidos practicando", icono: "Flame", categoria: "racha" as const, criterio_tipo: "racha_dias", criterio_valor: 7 },
  { codigo: "primer_examen", nombre: "A prueba", descripcion: "Rendiste tu primer examen", icono: "FileCheck", categoria: "examenes" as const, criterio_tipo: "examenes_rendidos", criterio_valor: 1 },
  { codigo: "tres_examenes", nombre: "Veterano", descripcion: "Rendiste 3 exámenes", icono: "ClipboardCheck", categoria: "examenes" as const, criterio_tipo: "examenes_rendidos", criterio_valor: 3 },
  { codigo: "examen_aprobado", nombre: "Aprobado", descripcion: "Aprobaste un examen", icono: "Award", categoria: "rendimiento" as const, criterio_tipo: "examenes_aprobados", criterio_valor: 1 },
  { codigo: "coleccionista_1", nombre: "Primera tarjeta", descripcion: "Desbloqueaste tu primera tarjeta AR", icono: "Sparkles", categoria: "tarjetas" as const, criterio_tipo: "tarjetas_desbloqueadas", criterio_valor: 1 },
  { codigo: "coleccionista_3", nombre: "Coleccionista", descripcion: "Desbloqueaste 3 tarjetas AR", icono: "Sparkles", categoria: "tarjetas" as const, criterio_tipo: "tarjetas_desbloqueadas", criterio_valor: 3 },
];

const CAT_WORDS: Record<string, [string, string][]> = {
  Animales: [["anu", "perro"], ["phisi", "gato"], ["wallpa", "gallina"], ["qarwa", "llama"], ["uwija", "oveja"], ["khuchi", "cerdo"], ["kunturi", "cóndor"], ["challwa", "pez"]],
  Colores: [["janq'u", "blanco"], ["ch'iyara", "negro"], ["wila", "rojo"], ["q'illu", "amarillo"], ["ch'uxña", "verde"], ["larama", "azul"], ["ch'umphi", "café"]],
  Familia: [["tayka", "madre"], ["awki", "padre"], ["jila", "hermano mayor"], ["kullaka", "hermana"], ["wawa", "bebé"], ["achachila", "abuelo"]],
  "Números": [["maya", "uno"], ["paya", "dos"], ["kimsa", "tres"], ["pusi", "cuatro"], ["phisqa", "cinco"], ["suxta", "seis"]],
  Cuerpo: [["nayra", "ojo"], ["nasa", "nariz"], ["laka", "boca"], ["ampara", "mano"], ["kayu", "pie"], ["p'iqi", "cabeza"]],
  Naturaleza: [["uma", "agua"], ["inti", "sol"], ["phaxsi", "luna"], ["qullu", "cerro"], ["quta", "lago"], ["pacha", "tierra"]],
};

// ---------------------------------------------------------------------------
// Pool de ejercicios del paralelo 1º A
// ---------------------------------------------------------------------------
type ExSpec = {
  ref: string;
  type: "text" | "multiple_choice" | "matching" | "fill_in_the_blank";
  question: string;
  answer?: string;
  dificultad: "facil" | "medio" | "dificil";
  options?: [string, boolean][];
  pairs?: [string, string][];
  blanks?: string[];
};

const POOL: ExSpec[] = [
  // --- Alfabeto (L1) ---
  { ref: "alf_mc1", type: "multiple_choice", question: "¿Cuántas vocales fonémicas tiene el aymara?", dificultad: "facil", options: [["3", true], ["5", false], ["4", false], ["2", false]] },
  { ref: "alf_mc2", type: "multiple_choice", question: "La serie aspirada de consonantes se escribe…", dificultad: "medio", options: [["con h (ph, th, kh)", true], ["con apóstrofo", false], ["con doble letra", false], ["con tilde", false]] },
  { ref: "alf_mc3", type: "multiple_choice", question: "¿Qué palabra significa 'agua'?", dificultad: "facil", options: [["uma", true], ["qhana", false], ["aru", false], ["jaqi", false]] },
  { ref: "alf_mc4", type: "multiple_choice", question: "La consonante eyectiva se marca con…", dificultad: "medio", options: [["apóstrofo ' (p', t', k')", true], ["h", false], ["x", false], ["w", false]] },
  { ref: "alf_mc5", type: "multiple_choice", question: "¿Cuál de estas letras se pronuncia más atrás, casi en la garganta?", dificultad: "dificil", options: [["q", true], ["p", false], ["t", false], ["m", false]] },
  { ref: "alf_mat1", type: "matching", question: "Une cada palabra aymara con su significado", dificultad: "medio", pairs: [["uma", "agua"], ["qhana", "claro"], ["aru", "idioma"]] },
  { ref: "alf_mat2", type: "matching", question: "Une la consonante con su serie", dificultad: "dificil", pairs: [["p", "simple"], ["ph", "aspirada"], ["p'", "eyectiva"]] },
  { ref: "alf_fib1", type: "fill_in_the_blank", question: "El aymara tiene solo tres vocales: a, i, ___", dificultad: "facil", blanks: ["u"] },
  { ref: "alf_fib2", type: "fill_in_the_blank", question: "El sonido con golpe de aire extra corresponde a la serie ___", dificultad: "medio", blanks: ["aspirada"] },
  { ref: "alf_fib3", type: "fill_in_the_blank", question: "'uma' significa ___ en español", dificultad: "facil", blanks: ["agua"] },
  { ref: "alf_txt1", type: "text", question: "¿Con qué letra se marca la serie aspirada en aymara?", answer: "h", dificultad: "facil" },
  { ref: "alf_txt2", type: "text", question: "Escribe la palabra aymara para 'agua'", answer: "uma", dificultad: "facil" },
  // --- Personas gramaticales (L2) ---
  { ref: "per_mc1", type: "multiple_choice", question: "¿Cuántas personas gramaticales distingue el aymara?", dificultad: "facil", options: [["4", true], ["3", false], ["5", false], ["2", false]] },
  { ref: "per_mat1", type: "matching", question: "Une el pronombre aymara con su significado", dificultad: "medio", pairs: [["naya", "yo"], ["juma", "tú"], ["jupa", "él"], ["jiwasa", "nosotros"]] },
  { ref: "per_fib1", type: "fill_in_the_blank", question: "El 'nosotros' que incluye a tu interlocutor es ___", dificultad: "dificil", blanks: ["jiwasa"] },
  { ref: "per_txt1", type: "text", question: "¿Cómo se dice 'yo' en aymara?", answer: "naya", dificultad: "facil" },
  { ref: "per_mc2", type: "multiple_choice", question: "El 'nosotros' que NO incluye a tu interlocutor es…", dificultad: "dificil", options: [["nanaka", true], ["jiwasa", false], ["jumanaka", false], ["jupanaka", false]] },
  // --- Números y sufijos (L3) ---
  { ref: "num_mat1", type: "matching", question: "Une el número aymara con su valor", dificultad: "facil", pairs: [["maya", "uno"], ["paya", "dos"], ["kimsa", "tres"], ["pusi", "cuatro"]] },
  { ref: "num_mc1", type: "multiple_choice", question: "¿Cómo se dice 'once' en aymara?", dificultad: "medio", options: [["tunka mayani", true], ["maya tunka", false], ["tunka paya", false], ["mayani tunka", false]] },
  { ref: "num_fib1", type: "fill_in_the_blank", question: "El sufijo que marca el plural es ___", dificultad: "medio", blanks: ["-naka", "naka"] },
  { ref: "num_txt1", type: "text", question: "¿Cómo se dice 'diez' en aymara?", answer: "tunka", dificultad: "facil" },
  { ref: "num_mc2", type: "multiple_choice", question: "'utani' significa…", dificultad: "dificil", options: [["con casa / que tiene casa", true], ["sin casa", false], ["muchas casas", false], ["la casa grande", false]] },
  // --- Colores (L4) ---
  { ref: "col_mat1", type: "matching", question: "Une el color aymara con su nombre en español", dificultad: "facil", pairs: [["janq'u", "blanco"], ["wila", "rojo"], ["ch'iyara", "negro"], ["larama", "azul"]] },
  { ref: "col_mc1", type: "multiple_choice", question: "En aymara, el adjetivo de color va…", dificultad: "medio", options: [["antes del sustantivo", true], ["después del sustantivo", false], ["al final de la oración", false], ["no existe", false]] },
  { ref: "col_fib1", type: "fill_in_the_blank", question: "'flor roja' se dice ___ panqara", dificultad: "medio", blanks: ["wila"] },
  { ref: "col_txt1", type: "text", question: "¿Cómo se dice 'verde' en aymara?", answer: "ch'uxña", dificultad: "medio" },
];

async function main() {
  console.log("⏳ Limpiando la base de datos…");
  await reset();

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  // -------------------------------------------------------------------------
  // 1. Logros
  // -------------------------------------------------------------------------
  await prisma.logro.createMany({ data: LOGROS });

  // -------------------------------------------------------------------------
  // 2. Gestiones y grados
  // -------------------------------------------------------------------------
  const g2025 = await prisma.gestion.create({
    data: { nombre: "Gestión 2025", anio: 2025, fecha_inicio: new Date("2025-02-03"), fecha_fin: new Date("2025-11-28"), estado: "cerrada", es_actual: false },
  });
  const g2026 = await prisma.gestion.create({
    data: { nombre: "Gestión 2026", anio: 2026, fecha_inicio: new Date("2026-02-02"), fecha_fin: new Date("2026-11-27"), estado: "activa", es_actual: true },
  });
  const g2027 = await prisma.gestion.create({
    data: { nombre: "Gestión 2027", anio: 2027, fecha_inicio: new Date("2027-02-01"), fecha_fin: new Date("2027-11-26"), estado: "planificada", es_actual: false },
  });

  const grados = await Promise.all(
    [
      { nombre: "1º Secundaria", nivel: 1 },
      { nombre: "2º Secundaria", nivel: 2 },
      { nombre: "3º Secundaria", nivel: 3 },
    ].map((d) => prisma.grado.create({ data: d })),
  );
  const [g1, g2, g3] = grados;

  const mkParalelo = (gestionId: number, gradoId: number, nombre: string) =>
    prisma.paralelo.create({ data: { gestion_id: gestionId, grado_id: gradoId, nombre } });

  // 2025 (cerrada) — de aquí vienen los alumnos promovidos
  const p25_1A = await mkParalelo(g2025.id, g1.id, "A");
  const p25_2A = await mkParalelo(g2025.id, g2.id, "A");
  // 2026 (actual)
  const p1A = await mkParalelo(g2026.id, g1.id, "A");
  const p1B = await mkParalelo(g2026.id, g1.id, "B");
  const p2A = await mkParalelo(g2026.id, g2.id, "A");
  const p2B = await mkParalelo(g2026.id, g2.id, "B");
  const p3A = await mkParalelo(g2026.id, g3.id, "A");
  // 2027 (planificada) — destino para probar la promoción por lote
  const p27_2A = await mkParalelo(g2027.id, g2.id, "A");

  // -------------------------------------------------------------------------
  // 3. Usuarios
  // -------------------------------------------------------------------------
  const admin = await prisma.usuario.create({
    data: { username: "admin_demo", email: "admin_demo@aymara.local", password, role: "admin", nombre: "Ada", apellido: "Administradora" },
  });
  const maestro1 = await prisma.usuario.create({
    data: { username: "maestro_demo", email: "maestro_demo@aymara.local", password, role: "maestro", nombre: "Juan", apellido: "Mamani" },
  });
  const maestro2 = await prisma.usuario.create({
    data: { username: "maestro2_demo", email: "maestro2_demo@aymara.local", password, role: "maestro", nombre: "María", apellido: "Quispe" },
  });
  const maestro3 = await prisma.usuario.create({
    data: { username: "maestro3_demo", email: "maestro3_demo@aymara.local", password, role: "maestro", nombre: "Pedro", apellido: "Colque" },
  });

  const ALUMNOS: [string, string, string][] = [
    ["estudiante_demo", "Carlos", "Choque"],
    ["est02", "Ana", "Mamani"],
    ["est03", "Bruno", "Apaza"],
    ["est04", "Daniela", "Quispe"],
    ["est05", "Elena", "Condori"],
    ["est06", "Franco", "Ticona"],
    ["est07", "Gabriela", "Huanca"],
    ["est08", "Hugo", "Laura"],
    ["est09", "Irene", "Poma"],
    ["est10", "Javier", "Yujra"],
    ["est11", "Karina", "Nina"],
    ["est12", "Luis", "Callisaya"],
    ["est13", "Marta", "Chura"],
    ["est14", "Nelson", "Aruquipa"],
    ["est15", "Olga", "Vargas"],
  ];
  const alumnos: Record<string, { id: number; nombre: string }> = {};
  for (let i = 0; i < ALUMNOS.length; i++) {
    const [username, nombre, apellido] = ALUMNOS[i];
    const u = await prisma.usuario.create({
      data: {
        username,
        email: `${username}@aymara.local`,
        password,
        role: "estudiante",
        nombre,
        apellido,
        codigo_estudiante: `EST-${String(i + 1).padStart(4, "0")}`,
        fecha_nacimiento: new Date(2011 - Math.floor(i / 6), (i % 12) + 1, ((i * 3) % 27) + 1),
      },
    });
    alumnos[username] = { id: u.id, nombre: `${nombre} ${apellido}` };
  }

  // -------------------------------------------------------------------------
  // 4. Asignaciones de profesor
  //    1º A (2026) cambió de profesora a mitad de gestión: el contenido se queda.
  // -------------------------------------------------------------------------
  const asignar = async (paraleloId: number, profesorId: number, desde: Date, hasta: Date | null = null) => {
    await prisma.asignacionProfesor.create({
      data: { paralelo_id: paraleloId, profesor_id: profesorId, fecha_desde: desde, fecha_hasta: hasta, activo: hasta === null },
    });
    if (hasta === null) await prisma.paralelo.update({ where: { id: paraleloId }, data: { profesor_id: profesorId } });
  };

  await asignar(p1A.id, maestro2.id, new Date("2026-02-02"), new Date("2026-04-15")); // histórica
  await asignar(p1A.id, maestro1.id, new Date("2026-04-16"));                          // vigente
  await asignar(p1B.id, maestro1.id, new Date("2026-02-02"));
  await asignar(p2A.id, maestro1.id, new Date("2026-02-02"));
  await asignar(p2B.id, maestro2.id, new Date("2026-02-02"));
  await asignar(p3A.id, maestro2.id, new Date("2026-02-02"));
  await asignar(p25_1A.id, maestro3.id, new Date("2025-02-03"), new Date("2025-11-28"));
  await asignar(p25_2A.id, maestro3.id, new Date("2025-02-03"), new Date("2025-11-28"));
  await asignar(p27_2A.id, maestro1.id, new Date("2027-02-01"));

  // -------------------------------------------------------------------------
  // 5. Inscripciones e historial académico
  // -------------------------------------------------------------------------
  const inscribir = async (
    username: string,
    paraleloId: number,
    estado: "activo" | "retirado" | "promovido" | "trasladado" | "reincorporado" | "repitente",
    opts: { fecha?: Date; baja?: Date; motivo?: string; movimiento?: "alta" | "promocion" | "cambio_paralelo" | "retiro" | "reincorporacion" | "repitencia" } = {},
  ) => {
    const insc = await prisma.inscripcion.create({
      data: {
        alumno_id: alumnos[username].id,
        paralelo_id: paraleloId,
        estado,
        fecha_inscripcion: opts.fecha ?? new Date("2026-02-02"),
        fecha_baja: opts.baja ?? null,
        motivo: opts.motivo ?? null,
      },
    });
    await prisma.movimientoAcademico.create({
      data: { inscripcion_id: insc.id, tipo: opts.movimiento ?? "alta", fecha: opts.fecha ?? new Date("2026-02-02"), realizado_por: admin.id },
    });
    return insc;
  };

  // 1º A 2026 — el paralelo con todo el contenido
  for (const u of ["estudiante_demo", "est02", "est03", "est04", "est05", "est06", "est07"]) await inscribir(u, p1A.id, "activo");
  // Hugo se retiró a mitad de gestión (su historial se conserva)
  await inscribir("est08", p1A.id, "retirado", { baja: new Date("2026-06-10"), motivo: "Cambio de ciudad", movimiento: "retiro" });
  // Olga empezó en 1ºA y fue trasladada a 1ºB
  await inscribir("est15", p1A.id, "trasladado", { baja: new Date("2026-05-02"), movimiento: "cambio_paralelo" });
  await inscribir("est15", p1B.id, "activo", { fecha: new Date("2026-05-02"), movimiento: "cambio_paralelo" });

  // 1º B 2026
  for (const u of ["est13", "est14"]) await inscribir(u, p1B.id, "activo");
  // Luis estuvo en 2025, se retiró y volvió este año
  await inscribir("est12", p25_1A.id, "retirado", { fecha: new Date("2025-02-03"), baja: new Date("2025-08-20"), motivo: "Motivos familiares", movimiento: "retiro" });
  await inscribir("est12", p1B.id, "reincorporado", { fecha: new Date("2026-03-01"), movimiento: "reincorporacion" });

  // Promovidos: 1ºA 2025 → 2ºA 2026
  for (const u of ["est09", "est10", "est11"]) {
    await inscribir(u, p25_1A.id, "promovido", { fecha: new Date("2025-02-03"), baja: new Date("2025-11-28"), movimiento: "promocion" });
    await inscribir(u, p2A.id, "activo", { movimiento: "promocion" });
  }

  // -------------------------------------------------------------------------
  // 6. Diccionario
  // -------------------------------------------------------------------------
  const legacy = loadLegacy();
  if (legacy.diccionario.length) {
    await prisma.diccionario.createMany({
      data: legacy.diccionario.map((d) => ({ aymara: d.aymara, espanol: d.espanol, categoria: (d.categoria ?? "").trim() })),
    });
  }
  for (const [categoria, pares] of Object.entries(CAT_WORDS)) {
    await prisma.diccionario.createMany({ data: pares.map(([aymara, espanol]) => ({ aymara, espanol, categoria })) });
  }
  await prisma.searchHistory.createMany({
    data: [
      { headword: "uma", gloss: "agua" },
      { headword: "qarwa", gloss: "llama" },
      { headword: "wila", gloss: "rojo" },
    ],
  });

  // -------------------------------------------------------------------------
  // 7. Tarjetas AR (con marcadores PNG reales generados en public/ar)
  // -------------------------------------------------------------------------
  console.log("⏳ Instalando marcadores AR y generando PDF…");
  /**
   * Se reutilizan los marcadores REALES que ya están en `public/ar` (imagen de
   * referencia + `.patt` de AR.js + modelo `.glb`), así el visor y el examen AR
   * funcionan con material de verdad. `origen` es el código con el que fueron
   * subidos originalmente; `null` = sin material real, se genera un marcador.
   */
  const CARDS: { code: string; title: string; desc: string; origen: string | null }[] = [
    { code: "ARCHHAJNA", title: "Chh'ajña — miel", desc: "La abeja y la miel. Recompensa por completar el Nivel 1.", origen: "AR00001765755122825" },
    { code: "ARANU", title: "Anu — perro", desc: "Tarjeta del perro, usada en el examen AR.", origen: "AR00001765755348141" },
    { code: "ARANATA", title: "Anata — juego", desc: "El dado. Tarjeta de juego usada en el examen AR.", origen: "AR00001765855406691" },
    { code: "ARPANDA", title: "Panda", desc: "Tarjeta retirada: no corresponde a la fauna andina del contenido.", origen: "AR1787823192378" },
    { code: "ARWALLPA", title: "Wallpa — gallina", desc: "Recompensa por aprobar el examen de palabras.", origen: null },
  ];

  const cards: Record<string, { id: number }> = {};
  for (let i = 0; i < CARDS.length; i++) {
    const c = CARDS[i];
    const assets = c.origen
      ? await installMarkerAssets(c.code, c.origen)
      : await (async () => {
          const png = await generateMarkerImage(c.code, c.title.split(" ")[0], i);
          return { image_file: png, marker_file: png, card_data: null };
        })();

    const row = await prisma.arCard.create({
      data: {
        paralelo_id: p1A.id,
        card_code: c.code,
        title: c.title,
        description: c.desc,
        marker_file: assets.marker_file,
        image_file: assets.image_file,
        card_data: assets.card_data,
        unlock_type: c.code === "ARWALLPA" ? "exam" : "lesson",
        created_by: maestro1.id,
        updated_by: maestro1.id,
        // La del panda está RETIRADA: quien ya la tiene la conserva, nadie más la obtiene.
        ...(c.code === "ARPANDA"
          ? { estado: "retirado" as const, deshabilitado_por: maestro1.id, deshabilitado_at: día(-20), motivo: "No corresponde al léxico andino del curso" }
          : {}),
      },
    });
    cards[c.code] = row;
  }

  // -------------------------------------------------------------------------
  // 8. Contenido del paralelo 1º A — lecciones, temas (uno con PDF), ejercicios
  // -------------------------------------------------------------------------
  const topicByLegacy = new Map(legacy.topics.map((t) => [t.lesson_id, t]));

  const pdf = await generateTopicPdf("guia-alfabeto-aymara.pdf", "Guía del alfabeto aymara", [
    "El aymara es una lengua fonémica: cada sonido se escribe siempre con la misma letra. Esto hace que leer y escribir sea predecible una vez aprendido el alfabeto.",
    "Vocales: solo existen tres — a, i, u. Los sonidos parecidos a la e y la o del español son variantes de i y u cuando aparecen junto a q, qh, q' y x.",
    "Consonantes: la mayoría se organizan en tres series. La simple (p, t, k, q), la aspirada, que se escribe con h y sale con un golpe de aire (ph, th, kh, qh), y la eyectiva, que se escribe con apóstrofo y se pronuncia cerrando la glotis (p', t', k', q').",
    "Punto de articulación: bilabial (p, ph, p'), dental (t, th, t'), postalveolar (ch, chh, ch'), velar (k, kh, k') y postvelar (q, qh, q'). Esta última suena parecida a la k pero se produce más atrás, casi en la garganta.",
    "Practica leyendo en voz alta: uma (agua), aymara aru (idioma aymara), qhana (claro, luz), jaqi (persona), panqara (flor).",
  ]);
  const archivoPdf = await prisma.archivo.create({
    data: { nombre: pdf.nombre, ruta: pdf.ruta, mime: "application/pdf", size_bytes: pdf.size, uploaded_by: maestro1.id, paralelo_id: p1A.id },
  });

  type LessonSpec = {
    key: string;
    orden: number;
    title: string;
    desc: string;
    min_correct: number;
    present_count: number | null;
    random: boolean;
    legacyTopic: number;
    refs: string[];
    pdf?: boolean;
    reward?: string;
    /** Cambio mayor aplicado: sube la época y caduca los completados anteriores. */
    cambioMayor?: string;
  };

  const LESSONS: LessonSpec[] = [
    {
      key: "L1", orden: 1, title: "Lección 1: El alfabeto aymara",
      desc: "Vocales, series de consonantes y puntos de articulación.",
      min_correct: 8, present_count: 10, random: true, legacyTopic: 1, pdf: true, reward: "ARCHHAJNA",
      refs: ["alf_mc1", "alf_mc2", "alf_mc3", "alf_mc4", "alf_mc5", "alf_mat1", "alf_mat2", "alf_fib1", "alf_fib2", "alf_fib3", "alf_txt1", "alf_txt2"],
    },
    {
      key: "L2", orden: 2, title: "Lección 2: Las 4 personas gramaticales",
      desc: "Pronombres personales y la distinción inclusivo/exclusivo.",
      min_correct: 3, present_count: null, random: false, legacyTopic: 2,
      cambioMayor: "Se reemplazaron los ejercicios y se añadió el contraste jiwasa/nanaka",
      refs: ["per_mc1", "per_mat1", "per_fib1", "per_txt1", "per_mc2"],
    },
    {
      key: "L3", orden: 3, title: "Lección 3: Números y sufijos básicos",
      desc: "Contar en aymara y los sufijos -naka / -ni.",
      min_correct: 3, present_count: null, random: false, legacyTopic: 3,
      // alf_txt2 se reutiliza aquí: un mismo ejercicio en dos lecciones (Negocio.md §10)
      refs: ["num_mat1", "num_mc1", "num_fib1", "num_txt1", "num_mc2", "alf_txt2"],
    },
    {
      key: "L4", orden: 4, title: "Lección 4: Los colores",
      desc: "Léxico de colores y su uso con sustantivos.",
      min_correct: 3, present_count: null, random: false, legacyTopic: 4,
      refs: ["col_mat1", "col_mc1", "col_fib1", "col_txt1"],
    },
  ];

  // Pool de ejercicios (pertenece al paralelo, no a una lección)
  const exByRef: Record<string, number> = {};
  for (const ex of POOL) {
    const row = await prisma.exercise.create({
      data: {
        paralelo_id: p1A.id,
        type: ex.type,
        question: ex.question,
        answer: ex.answer ?? null,
        dificultad: ex.dificultad,
        created_by: maestro1.id,
        updated_by: maestro1.id,
        options: ex.options ? { create: ex.options.map(([t, c]) => ({ option_text: t, is_correct: c })) } : undefined,
        pairs: ex.pairs ? { create: ex.pairs.map(([a, s], i) => ({ aymara_word: a, spanish_word: s, orden: i })) } : undefined,
        blanks: ex.blanks ? { create: ex.blanks.map((t) => ({ answer_text: t })) } : undefined,
      },
    });
    exByRef[ex.ref] = row.id;
  }

  const lessons: Record<string, { id: number; epoch: number; minValid: number; minCorrect: number; exIds: number[] }> = {};
  for (const spec of LESSONS) {
    const esMayor = !!spec.cambioMayor;
    const lesson = await prisma.lesson.create({
      data: {
        paralelo_id: p1A.id,
        title: spec.title,
        description: spec.desc,
        orden: spec.orden,
        min_correct: spec.min_correct,
        present_count: spec.present_count,
        random_selection: spec.random,
        grants_ar: !!spec.reward,
        ar_card_id: spec.reward ? cards[spec.reward].id : null,
        content_epoch: esMayor ? 2 : 1,
        min_valid_version: esMayor ? 2 : 1,
        created_by: maestro1.id,
        updated_by: maestro1.id,
      },
    });
    await prisma.lessonVersion.create({
      data: { lesson_id: lesson.id, version: 1, tipo_cambio: "menor", resumen: "Versión inicial", created_by: maestro2.id, created_at: new Date("2026-02-10"), vigente: !esMayor },
    });
    if (esMayor) {
      await prisma.lessonVersion.create({
        data: { lesson_id: lesson.id, version: 2, tipo_cambio: "mayor", resumen: spec.cambioMayor!, created_by: maestro1.id, created_at: día(-12) },
      });
    }

    const lt = topicByLegacy.get(spec.legacyTopic);
    const topic = await prisma.lessonTopic.create({
      data: {
        lesson_id: lesson.id,
        title: lt?.title ?? `${spec.title} — teoría`,
        content: lt?.content ?? "Contenido teórico pendiente.",
        archivo_id: spec.pdf ? archivoPdf.id : null,
        order: 0,
      },
    });
    await prisma.lesson.update({ where: { id: lesson.id }, data: { default_topic_id: topic.id } });

    const exIds = spec.refs.map((r) => exByRef[r]);
    await prisma.lessonExercise.createMany({
      data: exIds.map((exercise_id, i) => ({ lesson_id: lesson.id, exercise_id, orden: i })),
    });
    if (spec.reward) await prisma.arCard.update({ where: { id: cards[spec.reward].id }, data: { unlock_lesson_id: lesson.id } });

    lessons[spec.key] = { id: lesson.id, epoch: esMayor ? 2 : 1, minValid: esMayor ? 2 : 1, minCorrect: spec.min_correct, exIds };
  }

  // -------------------------------------------------------------------------
  // 9. Exámenes del 1º A — ventana abierta / futura / cerrada
  // -------------------------------------------------------------------------
  const examWords = await prisma.exam.create({
    data: {
      paralelo_id: p1A.id, type: "conectar_palabras",
      title: "Examen 1: Clasificar palabras por categoría",
      description: "Agrupa cada palabra aymara en su categoría correcta.",
      time_limit: 15, start_date: día(-30), end_date: día(30),
      min_score: 60, max_attempts: 2, attempt_policy: "best",
      ar_card_id: cards.ARWALLPA.id, created_by: maestro1.id, updated_by: maestro1.id,
    },
  });
  await prisma.examDetail.create({
    data: { exam_id: examWords.id, config_type: "categories", config_value: JSON.stringify(["Animales", "Colores", "Familia", "Números"]) },
  });
  await prisma.examPrerequisito.create({ data: { exam_id: examWords.id, lesson_id: lessons.L1.id } });
  await prisma.arCard.update({ where: { id: cards.ARWALLPA.id }, data: { unlock_exam_id: examWords.id } });

  const examAr = await prisma.exam.create({
    data: {
      paralelo_id: p1A.id, type: "ar_exam",
      title: "Examen 2: Muestra la tarjeta correcta (AR)",
      description: "El sistema pide una tarjeta al azar y debes mostrarla a la cámara.",
      time_limit: 15, start_date: día(-20), end_date: día(45),
      min_score: 60, max_attempts: 2, attempt_policy: "best",
      created_by: maestro1.id, updated_by: maestro1.id,
    },
  });
  for (const code of ["ARCHHAJNA", "ARANU", "ARANATA"]) {
    await prisma.examArCard.create({ data: { exam_id: examAr.id, ar_card_id: cards[code].id } });
  }
  await prisma.examPrerequisito.createMany({
    data: [
      { exam_id: examAr.id, lesson_id: lessons.L1.id },
      { exam_id: examAr.id, lesson_id: lessons.L2.id },
    ],
  });

  const examFuturo = await prisma.exam.create({
    data: {
      paralelo_id: p1A.id, type: "conectar_palabras",
      title: "Examen 3: Unidad de colores (aún no abierto)",
      description: "Se habilita más adelante — sirve para probar la ventana de disponibilidad.",
      time_limit: 20, start_date: día(15), end_date: día(40),
      min_score: 70, max_attempts: 1, attempt_policy: "last",
      created_by: maestro1.id, updated_by: maestro1.id,
    },
  });
  await prisma.examDetail.create({ data: { exam_id: examFuturo.id, config_type: "categories", config_value: JSON.stringify(["Colores", "Naturaleza"]) } });
  await prisma.examPrerequisito.create({ data: { exam_id: examFuturo.id, lesson_id: lessons.L4.id } });

  const examCerrado = await prisma.exam.create({
    data: {
      paralelo_id: p1A.id, type: "conectar_palabras",
      title: "Examen diagnóstico (cerrado)",
      description: "Ventana ya vencida — sirve para probar el bloqueo por plazo.",
      time_limit: 10, start_date: día(-60), end_date: día(-40),
      min_score: 50, max_attempts: 1, attempt_policy: "first",
      created_by: maestro1.id, updated_by: maestro1.id,
    },
  });
  await prisma.examDetail.create({ data: { exam_id: examCerrado.id, config_type: "categories", config_value: JSON.stringify(["Cuerpo", "Familia"]) } });

  // -------------------------------------------------------------------------
  // 10. Contenido de los otros paralelos (para probar el selector y la copia)
  // -------------------------------------------------------------------------
  const l1b = await prisma.lesson.create({
    data: {
      paralelo_id: p1B.id, title: "Lección 1: El alfabeto aymara", description: "Copiada desde 1º A.",
      orden: 1, min_correct: 5, present_count: null, random_selection: false,
      copiado_de: lessons.L1.id, created_by: maestro1.id, updated_by: maestro1.id,
    },
  });
  await prisma.lessonVersion.create({ data: { lesson_id: l1b.id, version: 1, tipo_cambio: "menor", resumen: "Copia desde 1º A", created_by: maestro1.id } });
  const t1b = await prisma.lessonTopic.create({
    data: { lesson_id: l1b.id, title: "El alfabeto aymara", content: topicByLegacy.get(1)?.content ?? "", order: 0 },
  });
  await prisma.lesson.update({ where: { id: l1b.id }, data: { default_topic_id: t1b.id } });
  const exs1b: number[] = [];
  for (const ref of ["alf_mc1", "alf_mc3", "alf_fib1", "alf_txt2", "alf_mat1"]) {
    const orig = POOL.find((p) => p.ref === ref)!;
    const row = await prisma.exercise.create({
      data: {
        paralelo_id: p1B.id, type: orig.type, question: orig.question, answer: orig.answer ?? null, dificultad: orig.dificultad,
        copiado_de: exByRef[ref], created_by: maestro1.id, updated_by: maestro1.id,
        options: orig.options ? { create: orig.options.map(([t, c]) => ({ option_text: t, is_correct: c })) } : undefined,
        pairs: orig.pairs ? { create: orig.pairs.map(([a, s], i) => ({ aymara_word: a, spanish_word: s, orden: i })) } : undefined,
        blanks: orig.blanks ? { create: orig.blanks.map((t) => ({ answer_text: t })) } : undefined,
      },
    });
    exs1b.push(row.id);
  }
  await prisma.lessonExercise.createMany({ data: exs1b.map((exercise_id, i) => ({ lesson_id: l1b.id, exercise_id, orden: i })) });

  const l2a = await prisma.lesson.create({
    data: { paralelo_id: p2A.id, title: "Lección 1: Repaso y saludos", description: "Contenido de 2º de secundaria.", orden: 1, min_correct: 2, created_by: maestro1.id, updated_by: maestro1.id },
  });
  await prisma.lessonVersion.create({ data: { lesson_id: l2a.id, version: 1, tipo_cambio: "menor", resumen: "Versión inicial", created_by: maestro1.id } });
  await prisma.lessonTopic.create({ data: { lesson_id: l2a.id, title: "Saludos y cortesía", content: "kamisaraki — ¿cómo estás?\nwaliki — bien\njikisiñkama — hasta luego\njallalla — ¡viva!", order: 0 } });
  const ex2a = await prisma.exercise.create({
    data: {
      paralelo_id: p2A.id, type: "multiple_choice", question: "¿Qué significa 'kamisaraki'?", dificultad: "facil",
      created_by: maestro1.id, updated_by: maestro1.id,
      options: { create: [{ option_text: "¿cómo estás?", is_correct: true }, { option_text: "adiós", is_correct: false }, { option_text: "gracias", is_correct: false }] },
    },
  });
  const ex2a2 = await prisma.exercise.create({
    data: { paralelo_id: p2A.id, type: "text", question: "¿Cómo se responde 'estoy bien' en aymara?", answer: "waliki", dificultad: "facil", created_by: maestro1.id, updated_by: maestro1.id },
  });
  await prisma.lessonExercise.createMany({
    data: [
      { lesson_id: l2a.id, exercise_id: ex2a.id, orden: 0 },
      { lesson_id: l2a.id, exercise_id: ex2a2.id, orden: 1 },
    ],
  });

  // -------------------------------------------------------------------------
  // 11. Orden del mapa
  // -------------------------------------------------------------------------
  const orden1A: { t: "lesson" | "exam"; id: number }[] = [
    { t: "lesson", id: lessons.L1.id },
    { t: "lesson", id: lessons.L2.id },
    { t: "exam", id: examWords.id },
    { t: "lesson", id: lessons.L3.id },
    { t: "exam", id: examAr.id },
    { t: "lesson", id: lessons.L4.id },
    { t: "exam", id: examFuturo.id },
    { t: "exam", id: examCerrado.id },
  ];
  await prisma.contentOrder.createMany({
    data: orden1A.map((o, i) => ({ paralelo_id: p1A.id, content_type: o.t, content_id: o.id, orden: (i + 1) * 10 })),
  });
  await prisma.contentOrder.create({ data: { paralelo_id: p1B.id, content_type: "lesson", content_id: l1b.id, orden: 10 } });
  await prisma.contentOrder.create({ data: { paralelo_id: p2A.id, content_type: "lesson", content_id: l2a.id, orden: 10 } });

  // -------------------------------------------------------------------------
  // 12. Actividad simulada — intentos, progreso, exámenes, tarjetas
  // -------------------------------------------------------------------------
  console.log("⏳ Simulando actividad de los alumnos…");

  /** Registra un intento de lección completo con sus respuestas. */
  async function intentoLeccion(opts: {
    username: string;
    lessonKey: string;
    attemptNo: number;
    aciertos: number;
    fallosPorEjercicio?: number;
    dayOffset: number;
    lessonVersion?: number;
    marcarProgreso?: boolean;
  }) {
    const alumnoId = alumnos[opts.username].id;
    const L = lessons[opts.lessonKey];
    const presentados = L.exIds.slice(0, Math.min(L.exIds.length, 10));
    const version = opts.lessonVersion ?? L.epoch;
    const minReq = Math.min(L.minCorrect, presentados.length);
    const passed = opts.aciertos >= minReq;
    const inicio = día(opts.dayOffset, 9);

    const attempt = await prisma.lessonAttempt.create({
      data: {
        alumno_id: alumnoId, lesson_id: L.id, paralelo_id: p1A.id, attempt_no: opts.attemptNo,
        started_at: inicio, finished_at: passed ? día(opts.dayOffset, 10) : null,
        presented_exercise_ids: presentados, presented_count: presentados.length,
        correct_count: opts.aciertos, min_required: minReq, score: opts.aciertos * 10,
        passed, best_flag: passed, lesson_version: version,
      },
    });

    const ejercicios = await prisma.exercise.findMany({ where: { id: { in: presentados } } });
    const exMap = new Map(ejercicios.map((e) => [e.id, e]));
    const ERRORES = ["concepto_equivocado", "seleccion_incorrecta", "emparejamiento_incorrecto"];
    let minuto = 0;

    for (let i = 0; i < presentados.length; i++) {
      const exId = presentados[i];
      const ex = exMap.get(exId)!;
      const acierta = i < opts.aciertos;
      const fallosPrevios = acierta ? (i < (opts.fallosPorEjercicio ?? 0) ? 1 : 0) : 1;

      for (let f = 0; f < fallosPrevios; f++) {
        minuto += 2;
        await prisma.exerciseAttempt.create({
          data: {
            lesson_attempt_id: attempt.id, alumno_id: alumnoId, exercise_id: exId, lesson_id: L.id, paralelo_id: p1A.id,
            exercise_type: ex.type, dificultad: ex.dificultad, attempt_number: f + 1,
            user_answer: "respuesta incorrecta", is_correct: false, score: 0,
            time_spent_ms: 25_000 + Math.round(Math.random() * 40_000),
            error_type: ERRORES[i % ERRORES.length],
            created_at: new Date(inicio.getTime() + minuto * 60_000),
          },
        });
      }
      if (acierta) {
        minuto += 2;
        await prisma.exerciseAttempt.create({
          data: {
            lesson_attempt_id: attempt.id, alumno_id: alumnoId, exercise_id: exId, lesson_id: L.id, paralelo_id: p1A.id,
            exercise_type: ex.type, dificultad: ex.dificultad, attempt_number: fallosPrevios + 1,
            user_answer: ex.answer ?? "respuesta", is_correct: true, score: 10,
            time_spent_ms: 12_000 + Math.round(Math.random() * 25_000),
            created_at: new Date(inicio.getTime() + minuto * 60_000),
          },
        });
      }
    }

    if (opts.marcarProgreso !== false) {
      await prisma.userProgress.upsert({
        where: { alumno_id_lesson_id: { alumno_id: alumnoId, lesson_id: L.id } },
        create: {
          alumno_id: alumnoId, lesson_id: L.id, lesson_version: version,
          current_index: opts.aciertos, total_exercises: presentados.length,
          best_score: opts.aciertos * 10, attempts: opts.attemptNo,
          completed: passed, in_progress: !passed, last_seen_at: día(opts.dayOffset, 10),
        },
        update: {
          lesson_version: version, current_index: opts.aciertos, total_exercises: presentados.length,
          best_score: opts.aciertos * 10, attempts: opts.attemptNo,
          completed: passed, in_progress: !passed, last_seen_at: día(opts.dayOffset, 10),
        },
      });
    }
    return { attemptId: attempt.id, passed };
  }

  const otorgarTarjeta = async (username: string, code: string, via: "lesson" | "exam", sourceId: number, dayOffset: number) =>
    prisma.userArCard.create({
      data: { alumno_id: alumnos[username].id, ar_card_id: cards[code].id, unlocked_by: via, source_id: sourceId, unlocked_at: día(dayOffset, 11) },
    });

  const leerTema = async (username: string, lessonKey: string, dayOffset: number) => {
    const topic = await prisma.lessonTopic.findFirst({ where: { lesson_id: lessons[lessonKey].id }, orderBy: { order: "asc" } });
    if (!topic) return;
    await prisma.topicReading.create({
      data: {
        alumno_id: alumnos[username].id, topic_id: topic.id, lesson_id: lessons[lessonKey].id,
        reading_completed: true, reading_started_at: día(dayOffset, 8), reading_completed_at: día(dayOffset, 9),
        time_spent_ms: 6 * 60_000,
      },
    });
  };

  // --- Carlos (estudiante_demo): alumno modelo, con racha de 3 días ---
  await leerTema("estudiante_demo", "L1", -14);
  await intentoLeccion({ username: "estudiante_demo", lessonKey: "L1", attemptNo: 1, aciertos: 5, dayOffset: -14 }); // falla
  await intentoLeccion({ username: "estudiante_demo", lessonKey: "L1", attemptNo: 2, aciertos: 9, fallosPorEjercicio: 2, dayOffset: -13 }); // aprueba
  await otorgarTarjeta("estudiante_demo", "ARCHHAJNA", "lesson", lessons.L1.id, -13);
  await leerTema("estudiante_demo", "L2", -2);
  await intentoLeccion({ username: "estudiante_demo", lessonKey: "L2", attemptNo: 1, aciertos: 5, dayOffset: -2 });
  await intentoLeccion({ username: "estudiante_demo", lessonKey: "L3", attemptNo: 1, aciertos: 5, fallosPorEjercicio: 1, dayOffset: -1 });
  await intentoLeccion({ username: "estudiante_demo", lessonKey: "L4", attemptNo: 1, aciertos: 2, dayOffset: 0 }); // en progreso hoy

  // --- Ana (est02): en riesgo — muchos fallos, nada completado, tendencia negativa ---
  await leerTema("est02", "L1", -18);
  await intentoLeccion({ username: "est02", lessonKey: "L1", attemptNo: 1, aciertos: 4, dayOffset: -18 });
  await intentoLeccion({ username: "est02", lessonKey: "L1", attemptNo: 2, aciertos: 3, dayOffset: -9 });
  await intentoLeccion({ username: "est02", lessonKey: "L1", attemptNo: 3, aciertos: 2, dayOffset: -3 });

  // --- Bruno (est03): medio ---
  await leerTema("est03", "L1", -16);
  await intentoLeccion({ username: "est03", lessonKey: "L1", attemptNo: 1, aciertos: 8, fallosPorEjercicio: 3, dayOffset: -16 });
  await otorgarTarjeta("est03", "ARCHHAJNA", "lesson", lessons.L1.id, -16);
  await intentoLeccion({ username: "est03", lessonKey: "L2", attemptNo: 1, aciertos: 2, dayOffset: -6 });

  // --- Daniela (est04): buena ---
  await leerTema("est04", "L1", -17);
  await intentoLeccion({ username: "est04", lessonKey: "L1", attemptNo: 1, aciertos: 10, dayOffset: -17 });
  await otorgarTarjeta("est04", "ARCHHAJNA", "lesson", lessons.L1.id, -17);
  await intentoLeccion({ username: "est04", lessonKey: "L2", attemptNo: 1, aciertos: 5, dayOffset: -8 });
  await intentoLeccion({ username: "est04", lessonKey: "L3", attemptNo: 1, aciertos: 6, dayOffset: -4 });

  // --- Elena (est05): completó la L2 ANTES del cambio mayor → su progreso caducó ---
  await intentoLeccion({ username: "est05", lessonKey: "L1", attemptNo: 1, aciertos: 9, dayOffset: -19 });
  await otorgarTarjeta("est05", "ARCHHAJNA", "lesson", lessons.L1.id, -19);
  await intentoLeccion({ username: "est05", lessonKey: "L2", attemptNo: 1, aciertos: 5, dayOffset: -15, lessonVersion: 1 });

  // --- Franco (est06): tiene una tarjeta REVOCADA (se la dieron por error) ---
  await intentoLeccion({ username: "est06", lessonKey: "L1", attemptNo: 1, aciertos: 8, dayOffset: -11 });
  await otorgarTarjeta("est06", "ARCHHAJNA", "lesson", lessons.L1.id, -11);
  const revocada = await prisma.userArCard.create({
    data: { alumno_id: alumnos.est06.id, ar_card_id: cards.ARANU.id, unlocked_by: "lesson", source_id: lessons.L1.id, unlocked_at: día(-11, 12) },
  });
  await prisma.userArCard.update({
    where: { id: revocada.id },
    data: { revocado: true, revocado_at: día(-5), revocado_por: maestro1.id, motivo: "Otorgada por error al importar resultados" },
  });
  // Franco conserva la tarjeta del cóndor aunque ya esté retirada del catálogo
  await prisma.userArCard.create({
    data: { alumno_id: alumnos.est06.id, ar_card_id: cards.ARPANDA.id, unlocked_by: "lesson", source_id: lessons.L1.id, unlocked_at: día(-25, 12) },
  });

  // --- Hugo (est08): trabajó y luego se retiró; su historial permanece ---
  await intentoLeccion({ username: "est08", lessonKey: "L1", attemptNo: 1, aciertos: 9, dayOffset: -40 });
  await otorgarTarjeta("est08", "ARCHHAJNA", "lesson", lessons.L1.id, -40);

  // Gabriela (est07) no tiene actividad — alumna recién incorporada.

  // -------------------------------------------------------------------------
  // 13. Intentos de examen (con detalle por ítem para la revisión)
  // -------------------------------------------------------------------------
  const CATS = Object.entries(CAT_WORDS);
  async function intentoExamenPalabras(username: string, attemptNo: number, aciertosPct: number, dayOffset: number, cardOtorgada?: string) {
    const items = CATS.flatMap(([cat, pares]) => pares.slice(0, 3).map(([w]) => ({ w, cat })));
    const nAciertos = Math.round((items.length * aciertosPct) / 100);
    const attempt = await prisma.examAttempt.create({
      data: {
        exam_id: examWords.id, alumno_id: alumnos[username].id, attempt_no: attemptNo,
        started_at: día(dayOffset, 14), completed_at: día(dayOffset, 14),
        time_spent_ms: (7 + attemptNo) * 60_000, score: aciertosPct, passed: aciertosPct >= 60,
        ar_card_granted_id: cardOtorgada ? cards[cardOtorgada].id : null,
      },
    });
    await prisma.examAttemptDetail.createMany({
      data: items.map((it, i) => ({
        exam_attempt_id: attempt.id,
        item_ref: it.w,
        expected: it.cat,
        respuesta: i < nAciertos ? it.cat : CATS[(CATS.findIndex(([c]) => c === it.cat) + 1) % CATS.length][0],
        is_correct: i < nAciertos,
        time_spent_ms: 8_000 + i * 1_500,
      })),
    });
    return attempt;
  }

  // Carlos: reprobó el primer intento, aprobó el segundo → gana la tarjeta de la gallina
  await intentoExamenPalabras("estudiante_demo", 1, 45, -10);
  await intentoExamenPalabras("estudiante_demo", 2, 85, -6, "ARWALLPA");
  await otorgarTarjeta("estudiante_demo", "ARWALLPA", "exam", examWords.id, -6);
  // Daniela aprobó a la primera
  await intentoExamenPalabras("est04", 1, 78, -7, "ARWALLPA");
  await otorgarTarjeta("est04", "ARWALLPA", "exam", examWords.id, -7);
  // Bruno raspando
  await intentoExamenPalabras("est03", 1, 62, -5, "ARWALLPA");
  await otorgarTarjeta("est03", "ARWALLPA", "exam", examWords.id, -5);
  // Elena reprobó (agotó sus 2 intentos)
  await intentoExamenPalabras("est05", 1, 40, -9);
  await intentoExamenPalabras("est05", 2, 52, -4);

  // Examen AR: Carlos lo rindió y aprobó
  const arAttempt = await prisma.examAttempt.create({
    data: {
      exam_id: examAr.id, alumno_id: alumnos.estudiante_demo.id, attempt_no: 1,
      started_at: día(-3, 15), completed_at: día(-3, 15), time_spent_ms: 6 * 60_000,
      score: 80, passed: true,
    },
  });
  const pedidos = ["ARCHHAJNA", "ARANU", "ARANATA", "ARCHHAJNA", "ARANU"];
  await prisma.examAttemptDetail.createMany({
    data: pedidos.map((code, i) => {
      const acierta = i !== 3;
      return {
        exam_attempt_id: arAttempt.id,
        item_ref: CARDS.find((c) => c.code === code)!.title,
        expected: code,
        respuesta: acierta ? code : "ARANATA",
        is_correct: acierta,
        time_spent_ms: 15_000 + i * 4_000,
      };
    }),
  });

  // -------------------------------------------------------------------------
  // 14. Supervisión: comentarios del administrador al profesor
  // -------------------------------------------------------------------------
  await prisma.comentarioRevision.createMany({
    data: [
      { paralelo_id: p1A.id, contenido_tipo: "lesson", contenido_id: lessons.L3.id, autor_id: admin.id, texto: "Revisar la redacción del ejercicio de sufijos: la consigna es ambigua.", resuelto: false, created_at: día(-8) },
      { paralelo_id: p1A.id, contenido_tipo: "paralelo", contenido_id: p1A.id, autor_id: admin.id, texto: "Buen avance del curso. Considerar agregar más ejercicios fáciles al inicio.", resuelto: true, created_at: día(-16) },
      { paralelo_id: p1B.id, contenido_tipo: "lesson", contenido_id: l1b.id, autor_id: admin.id, texto: "Falta material teórico en PDF para este paralelo.", resuelto: false, created_at: día(-4) },
    ],
  });

  // -------------------------------------------------------------------------
  // 15. Registro de accesos
  // -------------------------------------------------------------------------
  await prisma.accessLog.createMany({
    data: [
      { user_id: BigInt(admin.id), username: admin.username, email: admin.email, action: "login_success", path: "/api/auth/callback/credentials", method: "POST", ip: "127.0.0.1", status: 200, message: "Inicio de sesión correcto", created_at: día(-1, 8) },
      { user_id: BigInt(maestro1.id), username: maestro1.username, email: maestro1.email, action: "login_success", path: "/api/auth/callback/credentials", method: "POST", ip: "127.0.0.1", status: 200, created_at: día(-1, 9) },
      { user_id: BigInt(maestro1.id), username: maestro1.username, action: "create", path: "/admin/lessons", method: "POST", ip: "127.0.0.1", status: 200, message: "Lección creada", created_at: día(-1, 9) },
      { user_id: BigInt(alumnos.estudiante_demo.id), username: "estudiante_demo", action: "login_success", path: "/api/auth/callback/credentials", method: "POST", ip: "127.0.0.1", status: 200, created_at: día(0, 9) },
      { username: "desconocido", action: "login_failed", path: "/api/auth/callback/credentials", method: "POST", ip: "192.168.0.44", status: 401, message: "Credenciales inválidas", created_at: día(0, 7) },
      { user_id: BigInt(admin.id), username: admin.username, action: "update", path: "/admin/supervision", method: "POST", ip: "127.0.0.1", status: 200, message: "Contenido observado", created_at: día(-8, 11) },
    ],
  });

  // -------------------------------------------------------------------------
  // 16. Logros, analítica y modelo ML (usando la lógica real de la app)
  // -------------------------------------------------------------------------
  console.log("⏳ Evaluando logros, analítica y entrenando el modelo…");
  const { evaluateLogros } = await import("@/lib/logros/evaluate");
  const { recomputeAnalytics } = await import("@/lib/analytics/aggregate");
  const { trainRiskModel } = await import("@/lib/ml/model");

  for (const key of Object.keys(alumnos)) await evaluateLogros(alumnos[key].id);
  const analytics = await recomputeAnalytics();
  const modelo = await trainRiskModel();

  // -------------------------------------------------------------------------
  // Resumen
  // -------------------------------------------------------------------------
  const [nUsuarios, nInscripciones, nLecciones, nEjercicios, nIntentos, nExamenes, nTarjetas, nLogros] = await Promise.all([
    prisma.usuario.count(),
    prisma.inscripcion.count(),
    prisma.lesson.count(),
    prisma.exercise.count(),
    prisma.exerciseAttempt.count(),
    prisma.examAttempt.count(),
    prisma.userArCard.count(),
    prisma.logroAlumno.count(),
  ]);

  console.log(`
✅ Seed completo.

   Gestiones ......... 2025 (cerrada) · 2026 (ACTUAL) · 2027 (planificada)
   Paralelos ......... 1ºA 1ºB 2ºA 2ºB 3ºA (2026) + 1ºA 2ºA (2025) + 2ºA (2027)
   Usuarios .......... ${nUsuarios} (1 admin, 3 maestros, ${ALUMNOS.length} alumnos)
   Inscripciones ..... ${nInscripciones} (con promoción, retiro, reincorporación y traslado)
   Contenido ......... ${nLecciones} lecciones · ${nEjercicios} ejercicios · 5 tarjetas AR · 4 exámenes
                       (1ºA: 4 lecciones + 26 ejercicios + los 4 exámenes; 1ºB y 2ºA con contenido propio)
   Actividad ......... ${nIntentos} intentos de ejercicio · ${nExamenes} intentos de examen · ${nTarjetas} tarjetas · ${nLogros} logros
   Analítica ......... ${analytics.exercises} ejercicios, ${analytics.lessons} lecciones, ${analytics.paralelos} paralelos, ${analytics.students} alumnos
   Modelo ML ......... ${modelo.version} · ${modelo.nMuestras} alumnos con actividad (${modelo.nSinDatos} sin datos) · exactitud ${modelo.accuracy}

   Cuentas (password: ${DEMO_PASSWORD})
     admin_demo ........ administración completa
     maestro_demo ...... 1ºA, 1ºB, 2ºA (2026) y 2ºA (2027)
     maestro2_demo ..... 2ºB, 3ºA — enseñó 1ºA hasta abril (el contenido siguió en el paralelo)
     maestro3_demo ..... paralelos de la gestión 2025 (cerrada)
     estudiante_demo ... Carlos Choque — 1ºA, avanzado, con tarjetas y logros
     est02 ............. Ana Mamani — en riesgo (3 intentos fallidos)
     est05 ............. Elena Condori — progreso de la L2 CADUCADO por cambio mayor
     est06 ............. Franco Ticona — tiene una tarjeta revocada y una retirada
     est07 ............. Gabriela Huanca — sin actividad (alumna nueva)
     est08 ............. Hugo Laura — retirado, conserva su historial
     est09..est11 ...... promovidos de 1ºA-2025 a 2ºA-2026
     est12 ............. Luis Callisaya — se retiró en 2025 y se reincorporó en 1ºB
     est15 ............. Olga Vargas — trasladada de 1ºA a 1ºB
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
