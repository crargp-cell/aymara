import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Usuario, UserProgress, ExerciseAttempt, UserArCard, ExamResult } from "@/generated/prisma/client";

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const MARGIN = 50;

export async function buildStudentReportPdf(data: {
  user: Usuario;
  progress: UserProgress[];
  attempts: ExerciseAttempt[];
  arCards: UserArCard[];
  examResults: ExamResult[];
}) {
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

  const line = (text: string, opts: { size?: number; useBold?: boolean; gap?: number; color?: [number, number, number] } = {}) => {
    const size = opts.size ?? 11;
    ensureSpace(size + (opts.gap ?? 6));
    page.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: opts.useBold ? bold : font,
      color: opts.color ? rgb(...opts.color) : rgb(0.1, 0.1, 0.1),
    });
    y -= size + (opts.gap ?? 6);
  };

  line("Reporte de estudiante — Aymara", { size: 18, useBold: true, gap: 12 });
  line(`Usuario: ${data.user.username}`, { useBold: true });
  line(`Email: ${data.user.email ?? "sin email"}`);
  line(`Rol: ${data.user.role} · Curso: ${data.user.curso}`);
  line(`Generado: ${new Date().toISOString().slice(0, 19).replace("T", " ")}`, { gap: 16 });

  line("Progreso de lecciones", { size: 14, useBold: true, gap: 8 });
  if (data.progress.length === 0) line("Sin registros de progreso.");
  for (const p of data.progress) {
    line(`Lección ${p.lesson_id} — ${p.date.toISOString().slice(0, 10)} — ${p.completed ? "completado" : "en curso"}`);
  }
  y -= 10;

  line("Intentos de ejercicios", { size: 14, useBold: true, gap: 8 });
  if (data.attempts.length === 0) line("Sin intentos registrados.");
  for (const a of data.attempts) {
    line(`Ejercicio ${a.exercise_id} (${a.exercise_type ?? "?"}) — ${a.is_correct ? "correcto" : a.error_type ?? "incorrecto"} — score ${a.score ?? 0}`);
  }
  y -= 10;

  line("Resultados de exámenes", { size: 14, useBold: true, gap: 8 });
  if (data.examResults.length === 0) line("Sin exámenes rendidos.");
  for (const e of data.examResults) {
    line(`Examen ${e.exam_id ?? "?"} — score ${e.score ?? 0} — ${e.passed ? "aprobado" : "reprobado"}`);
  }
  y -= 10;

  line("Tarjetas AR desbloqueadas", { size: 14, useBold: true, gap: 8 });
  if (data.arCards.length === 0) line("Sin tarjetas desbloqueadas.");
  for (const c of data.arCards) {
    line(`Tarjeta ${c.ar_card_id} — vía ${c.unlocked_by} — ${c.unlocked_at?.toISOString().slice(0, 10) ?? ""}`);
  }

  return pdfDoc.save();
}
