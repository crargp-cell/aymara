import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 36;
const HEADER_H = 88;
const FOOTER_H = 36;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

type CeaMetadata = {
  fecha: string;
  generadoPor: string;
  gestion: string;
  departamento: string;
};

type CeaRow = {
  id: string;
  logro: string;
  afectados: string;
  estado: string;
  estadoColor: "emerald" | "amber" | "blue" | "gray";
  observaciones: string;
};

type CeaReportData = {
  titulo: string;
  subtitulo: string;
  metadata: CeaMetadata;
  rows: CeaRow[];
};

type StudentReportData = {
  user: { username: string; email: string | null; nombre: string | null; apellido: string | null; codigo_estudiante: string | null };
  historial: { paralelo: string; estado: string; desde: string; hasta: string | null }[];
  progress: { lesson_id: number; completed: boolean; current_index: number; total_exercises: number }[];
  lessonAttempts: { lesson: string; attempt_no: number; passed: boolean; correct_count: number; min_required: number }[];
  examAttempts: { exam: string; attempt_no: number; score: number; passed: boolean }[];
  arCards: { title: string; via: string; revoked: boolean }[];
  logros: string[];
};

const COLORS = {
  headerBg: rgb(0.05, 0.14, 0.25),
  headerBg2: rgb(0.07, 0.2, 0.36),
  gold: rgb(0.95, 0.76, 0),
  white: rgb(1, 1, 1),
  whiteAlpha: rgb(1, 1, 1),
  tricolorRed: rgb(0.85, 0.16, 0.11),
  tricolorYellow: rgb(0.96, 0.78, 0),
  tricolorGreen: rgb(0, 0.48, 0.2),
  navy: rgb(0.07, 0.14, 0.25),
  navyLight: rgb(0.09, 0.25, 0.46),
  gray50: rgb(0.98, 0.98, 0.98),
  gray100: rgb(0.96, 0.96, 0.96),
  gray200: rgb(0.9, 0.9, 0.9),
  gray400: rgb(0.66, 0.66, 0.66),
  gray500: rgb(0.55, 0.55, 0.55),
  gray600: rgb(0.42, 0.42, 0.42),
  gray700: rgb(0.29, 0.29, 0.29),
  emeraldBg: rgb(0.94, 0.99, 0.95),
  emeraldText: rgb(0.06, 0.46, 0.32),
  emeraldBorder: rgb(0.66, 0.84, 0.71),
  amberBg: rgb(1, 0.97, 0.88),
  amberText: rgb(0.65, 0.42, 0.03),
  amberBorder: rgb(0.96, 0.85, 0.62),
  blueBg: rgb(0.94, 0.96, 1),
  blueText: rgb(0.15, 0.32, 0.6),
  blueBorder: rgb(0.73, 0.82, 0.96),
  cardBg: rgb(0.99, 0.98, 0.96),
};

async function loadLogoBytes(): Promise<Uint8Array | null> {
  const candidates = [
    path.join(process.cwd(), "public", "mascota", "mascota_normal.png"),
    path.join(process.cwd(), "public", "fondo.png"),
    path.join(process.cwd(), "public", "covers", "1.jpg"),
  ];
  for (const p of candidates) {
    try {
      return await fs.readFile(p);
    } catch {}
  }
  return null;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

async function buildCeaDocument(data: CeaReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let logoImage: any = null;
  let logoDims: { width: number; height: number } | null = null;
  const logoBytes = await loadLogoBytes();
  if (logoBytes) {
    try {
      if (logoBytes[0] === 0x89 && logoBytes[1] === 0x50) logoImage = await pdfDoc.embedPng(logoBytes);
      else logoImage = await pdfDoc.embedJpg(logoBytes);
      const { width, height } = logoImage.scale(1);
      logoDims = { width, height };
    } catch {}
  }

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  const ensureSpace = (needed: number) => {
    if (y - needed < FOOTER_H + 20) {
      drawFooter(page);
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H;
      drawWatermark(page, logoImage, logoDims);
    }
  };

  const drawWatermark = (pg: any, img: any, dims: any) => {
    if (!img || !dims) return;
    const scale = Math.min(450 / dims.width, 450 / dims.height);
    const w = dims.width * scale;
    const h = dims.height * scale;
    pg.drawImage(img, {
      x: (PAGE_W - w) / 2,
      y: (PAGE_H - h) / 2,
      width: w,
      height: h,
      opacity: 0.04,
    });
  };

  const drawHeader = (pg: any) => {
    pg.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: COLORS.headerBg });
    if (logoImage && logoDims) {
      const s = 48 / Math.max(logoDims.width, logoDims.height);
      const w = logoDims.width * s;
      const h = logoDims.height * s;
      pg.drawImage(logoImage, { x: 28, y: PAGE_H - HEADER_H / 2 - h / 2 + 6, width: w, height: h });
    }
    pg.drawText("Centro de Educación Alternativa", { x: PAGE_W / 2 - 90, y: PAGE_H - 32, size: 9, font, color: COLORS.gold });
    pg.drawText('"12 de Octubre"', { x: PAGE_W / 2 - 52, y: PAGE_H - 52, size: 16, font: bold, color: COLORS.gold });
    pg.drawText("El Alto - Bolivia", { x: PAGE_W / 2 - 38, y: PAGE_H - 68, size: 6, font, color: rgb(1, 1, 1) });
    pg.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 8, width: PAGE_W / 3, height: 8, color: COLORS.tricolorRed });
    pg.drawRectangle({ x: PAGE_W / 3, y: PAGE_H - HEADER_H - 8, width: PAGE_W / 3, height: 8, color: COLORS.tricolorYellow });
    pg.drawRectangle({ x: (PAGE_W / 3) * 2, y: PAGE_H - HEADER_H - 8, width: PAGE_W / 3, height: 8, color: COLORS.tricolorGreen });
  };

  const drawFooter = (pg: any) => {
    pg.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: FOOTER_H, color: rgb(0.97, 0.97, 0.97) });
    pg.drawLine({ start: { x: 0, y: FOOTER_H }, end: { x: PAGE_W, y: FOOTER_H }, thickness: 0.5, color: COLORS.gray200 });
    pg.drawText("Generado por Sistema Central", { x: MARGIN_X, y: 14, size: 7, font, color: COLORS.gray500 });
    pg.drawText("info@contacto.cea.bo  |  Telf: 887 2345  |  El Alto - Bolivia", { x: PAGE_W - MARGIN_X - 180, y: 14, size: 7, font, color: COLORS.gray500 });
  };

  drawWatermark(page, logoImage, logoDims);
  drawHeader(page);
  y = PAGE_H - HEADER_H - 24;

  page.drawText("Informe de Desempeño Académico", { x: PAGE_W / 2 - 110, y, size: 15, font: bold, color: COLORS.navy });
  y -= 18;
  const badgeW = 110;
  const badgeX = PAGE_W / 2 - badgeW / 2;
  page.drawRectangle({ x: badgeX, y: y - 6, width: badgeW, height: 14, color: rgb(0.93, 0.95, 0.97), borderColor: rgb(0.82, 0.87, 0.91), borderWidth: 0.5 });
  page.drawText(data.subtitulo.toUpperCase(), { x: badgeX + 6, y: y - 2, size: 6, font: bold, color: COLORS.navyLight });
  y -= 22;

  const cardW = (CONTENT_W - 8) / 2;
  const cardH = 38;
  const meta = [
    { label: "Fecha de Emisión", value: data.metadata.fecha, x: MARGIN_X, y: y },
    { label: "Generado por", value: data.metadata.generadoPor, x: MARGIN_X + cardW + 8, y: y },
    { label: "Gestión", value: data.metadata.gestion, x: MARGIN_X, y: y - cardH - 8 },
    { label: "Departamento", value: data.metadata.departamento, x: MARGIN_X + cardW + 8, y: y - cardH - 8 },
  ];
  for (const c of meta) {
    page.drawRectangle({ x: c.x, y: c.y - cardH + 12, width: cardW, height: cardH, color: COLORS.cardBg, borderColor: COLORS.gray200, borderWidth: 0.5 });
    page.drawRectangle({ x: c.x + 6, y: c.y - 14, width: 18, height: 18, color: rgb(0.92, 0.96, 1), borderColor: rgb(0.82, 0.87, 0.96), borderWidth: 0.5 });
    page.drawText(c.label.toUpperCase(), { x: c.x + 30, y: c.y - 4, size: 5, font: bold, color: COLORS.gray500 });
    page.drawText(c.value, { x: c.x + 30, y: c.y - 16, size: 7, font: bold, color: COLORS.gray700 });
  }
  y -= cardH * 2 + 16 + 8;

  const colW = [36, 130, 62, 62, CONTENT_W - 36 - 130 - 62 - 62];
  const colX = [MARGIN_X, MARGIN_X + colW[0], MARGIN_X + colW[0] + colW[1], MARGIN_X + colW[0] + colW[1] + colW[2], MARGIN_X + colW[0] + colW[1] + colW[2] + colW[3]];
  const headerH = 18;
  ensureSpace(headerH + 14);
  page.drawRectangle({ x: MARGIN_X, y: y - headerH + 8, width: CONTENT_W, height: headerH, color: COLORS.navy });
  const headers = ["ID", "Logro Clave", "Afectados", "Estado", "Observaciones"];
  const headerAlign: ("center" | "left")[] = ["center", "left", "center", "center", "left"];
  for (let i = 0; i < 5; i++) {
    const tx = headerAlign[i] === "center" ? colX[i] + colW[i] / 2 - headers[i].length * 1.8 : colX[i] + 4;
    page.drawText(headers[i], { x: tx, y: y - 2, size: 6, font: bold, color: COLORS.white });
  }
  y -= headerH - 4;

  const rowH = 16;
  for (let idx = 0; idx < data.rows.length; idx++) {
    const r = data.rows[idx];
    ensureSpace(rowH + 2);
    const bg = idx % 2 === 0 ? COLORS.white : COLORS.gray50;
    page.drawRectangle({ x: MARGIN_X, y: y - rowH + 8, width: CONTENT_W, height: rowH, color: bg, borderColor: COLORS.gray100, borderWidth: 0.3 });
    if (idx % 2 === 1) page.drawRectangle({ x: colX[2], y: y - rowH + 8, width: colW[2], height: rowH, color: rgb(0.97, 0.97, 0.98) });

    page.drawText(r.id, { x: colX[0] + colW[0] / 2 - 4, y: y - 2, size: 6, font, color: COLORS.gray400 });
    const logro = r.logro.length > 32 ? r.logro.slice(0, 32) + "…" : r.logro;
    page.drawText(logro, { x: colX[1] + 4, y: y - 2, size: 6, font, color: COLORS.gray700 });
    page.drawText(r.afectados, { x: colX[2] + colW[2] / 2 - 6, y: y - 2, size: 6, font: bold, color: COLORS.navy });
    const badgeColor = r.estadoColor === "emerald" ? COLORS.emeraldBg : r.estadoColor === "amber" ? COLORS.amberBg : r.estadoColor === "blue" ? COLORS.blueBg : COLORS.gray100;
    const textColor = r.estadoColor === "emerald" ? COLORS.emeraldText : r.estadoColor === "amber" ? COLORS.amberText : r.estadoColor === "blue" ? COLORS.blueText : COLORS.gray600;
    const badgeX = colX[3] + 6;
    page.drawRectangle({ x: badgeX, y: y - 10, width: colW[3] - 12, height: 10, color: badgeColor, borderColor: textColor, borderWidth: 0.3 });
    const est = r.estado.length > 10 ? r.estado.slice(0, 10) : r.estado;
    page.drawText(est, { x: badgeX + 8, y: y - 4, size: 5, font: bold, color: textColor });
    const obs = r.observaciones.length > 38 ? r.observaciones.slice(0, 38) + "…" : r.observaciones;
    page.drawText(obs, { x: colX[4] + 4, y: y - 2, size: 5, font, color: COLORS.gray600 });
    y -= rowH;
  }

  drawFooter(page);
  return pdfDoc.save();
}

export async function buildStudentReportPdf(data: StudentReportData): Promise<Uint8Array> {
  const nombre = [data.user.nombre, data.user.apellido].filter(Boolean).join(" ") || data.user.username;
  const rows: CeaRow[] = [];

  if (data.lessonAttempts.length > 0) {
    data.lessonAttempts.slice(0, 5).forEach((a, i) => {
      rows.push({
        id: String(i + 1).padStart(2, "0"),
        logro: a.lesson.slice(0, 28),
        afectados: `${a.correct_count}/${a.min_required}`,
        estado: a.passed ? "Operativo" : "Desaprobado",
        estadoColor: a.passed ? "emerald" : "amber",
        observaciones: a.passed ? "Superada" : "Requiere refuerzo",
      });
    });
  }
  if (data.examAttempts.length > 0) {
    data.examAttempts.slice(0, 3).forEach((e, i) => {
      rows.push({
        id: String(rows.length + 1).padStart(2, "0"),
        logro: e.exam.slice(0, 28),
        afectados: `${e.score}%`,
        estado: e.passed ? "Aprobado" : "Reprobado",
        estadoColor: e.passed ? "emerald" : "amber",
        observaciones: `Intento ${e.attempt_no}`,
      });
    });
  }
  if (rows.length === 0) {
    rows.push({ id: "01", logro: "Sin actividad registrada", afectados: "0", estado: "Pendiente", estadoColor: "gray", observaciones: "Sin intentos" });
  }
  while (rows.length < 5) {
    rows.push({ id: String(rows.length + 1).padStart(2, "0"), logro: "—", afectados: "—", estado: "—", estadoColor: "gray", observaciones: "—" });
  }

  return buildCeaDocument({
    titulo: "Informe de Desempeño Académico",
    subtitulo: "Gestión Operativa 2026",
    metadata: {
      fecha: new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" }),
      generadoPor: `Dirección Académica / ${nombre}`,
      gestion: "2026",
      departamento: "Operaciones y Registro",
    },
    rows,
  });
}

export async function buildGeneralReportPdf(opts: { titulo: string; gestion: string; rows: CeaRow[]; generadoPor?: string }): Promise<Uint8Array> {
  return buildCeaDocument({
    titulo: opts.titulo,
    subtitulo: `Gestión Operativa ${opts.gestion}`,
    metadata: {
      fecha: new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" }),
      generadoPor: opts.generadoPor ?? "Dirección Académica / Sistema",
      gestion: opts.gestion,
      departamento: "Operaciones y Registro",
    },
    rows: opts.rows.length ? opts.rows : [{ id: "01", logro: "Sin datos", afectados: "0", estado: "Pendiente", estadoColor: "gray", observaciones: "—" }],
  });
}
