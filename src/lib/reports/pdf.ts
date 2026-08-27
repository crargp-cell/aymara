import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const MARGIN = 50;

type StudentReportData = {
  user: { username: string; email: string | null; nombre: string | null; apellido: string | null; codigo_estudiante: string | null };
  historial: { paralelo: string; estado: string; desde: string; hasta: string | null }[];
  progress: { lesson_id: number; completed: boolean; current_index: number; total_exercises: number }[];
  lessonAttempts: { lesson: string; attempt_no: number; passed: boolean; correct_count: number; min_required: number }[];
  examAttempts: { exam: string; attempt_no: number; score: number; passed: boolean }[];
  arCards: { title: string; via: string; revoked: boolean }[];
  logros: string[];
};

export async function buildStudentReportPdf(data: StudentReportData) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - MARGIN;
    }
  };
  const line = (text: string, opts: { size?: number; useBold?: boolean; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    ensureSpace(size + (opts.gap ?? 6));
    page.drawText(text, { x: MARGIN, y, size, font: opts.useBold ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= size + (opts.gap ?? 6);
  };

  const nombre = [data.user.nombre, data.user.apellido].filter(Boolean).join(" ") || data.user.username;
  line("Reporte de estudiante — Aymara", { size: 18, useBold: true, gap: 12 });
  line(`Estudiante: ${nombre}`, { useBold: true });
  line(`Usuario: @${data.user.username} · ${data.user.email ?? "sin email"} · ${data.user.codigo_estudiante ?? "sin código"}`);
  line(`Generado: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`, { gap: 16 });

  line("Historial académico", { size: 14, useBold: true, gap: 8 });
  if (data.historial.length === 0) line("Sin inscripciones.");
  for (const h of data.historial) line(`${h.paralelo} — ${h.estado} — ${h.desde}${h.hasta ? ` a ${h.hasta}` : ""}`);
  y -= 8;

  line("Progreso de lecciones", { size: 14, useBold: true, gap: 8 });
  if (data.progress.length === 0) line("Sin registros.");
  for (const p of data.progress) line(`Lección ${p.lesson_id} — ${p.completed ? "completada" : `${p.current_index}/${p.total_exercises}`}`);
  y -= 8;

  line("Intentos de lección", { size: 14, useBold: true, gap: 8 });
  for (const a of data.lessonAttempts) line(`${a.lesson} — intento ${a.attempt_no} — ${a.correct_count}/${a.min_required} — ${a.passed ? "superada" : "no superada"}`);
  y -= 8;

  line("Exámenes", { size: 14, useBold: true, gap: 8 });
  if (data.examAttempts.length === 0) line("Sin exámenes rendidos.");
  for (const e of data.examAttempts) line(`${e.exam} — intento ${e.attempt_no} — ${e.score}% — ${e.passed ? "aprobado" : "reprobado"}`);
  y -= 8;

  line("Tarjetas AR y logros", { size: 14, useBold: true, gap: 8 });
  for (const c of data.arCards) line(`Tarjeta ${c.title} — vía ${c.via}${c.revoked ? " (revocada)" : ""}`);
  for (const l of data.logros) line(`Logro: ${l}`);

  return pdfDoc.save();
}
