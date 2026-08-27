/**
 * Genera los archivos que el seed necesita en disco: marcadores AR (PNG con
 * patrón rico en features, para que `mind-ar` pueda compilar un target real) y
 * un PDF de material didáctico para el visor embebido de temas.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const AR_DIR = path.join(process.cwd(), "public", "ar");
const AR_MODELS_DIR = path.join(AR_DIR, "models");
const PDF_DIR = path.join(process.cwd(), "public", "uploads", "pdf");

export type MarkerAssets = {
  /** PNG de referencia que compila `mind-ar` en el navegador. */
  image_file: string;
  /** Lo que se muestra/descarga como marcador: el `.patt` si existe, si no el PNG. */
  marker_file: string;
  /** URL del modelo 3D, si la tarjeta tiene uno. */
  card_data: string | null;
};

const copyIfExists = async (from: string, to: string): Promise<boolean> => {
  try {
    await fs.access(from);
    await fs.copyFile(from, to);
    return true;
  } catch {
    return false;
  }
};

/**
 * Instala para `code` los assets AR reales que ya viven en `public/ar` bajo otro
 * código (`marker_<origen>.png|.patt|.glb`). Copiar en vez de referenciar deja a
 * cada tarjeta con su propio juego de archivos, igual que si el docente los
 * hubiera subido desde el panel.
 */
export async function installMarkerAssets(code: string, origen: string): Promise<MarkerAssets> {
  await fs.mkdir(AR_DIR, { recursive: true });
  await fs.mkdir(AR_MODELS_DIR, { recursive: true });

  const src = (ext: string) => path.join(AR_DIR, `marker_${origen}.${ext}`);
  const png = `marker_${code}.png`;
  const patt = `marker_${code}.patt`;

  const tienePng = await copyIfExists(src("png"), path.join(AR_DIR, png));
  if (!tienePng) throw new Error(`No existe el marcador de origen marker_${origen}.png`);
  const tienePatt = await copyIfExists(src("patt"), path.join(AR_DIR, patt));
  const tieneGlb = await copyIfExists(src("glb"), path.join(AR_MODELS_DIR, `${code}.glb`));

  return {
    image_file: png,
    marker_file: tienePatt ? patt : png,
    card_data: tieneGlb ? `/ar/models/${code}.glb` : null,
  };
}

/** SVG con formas irregulares — genera esquinas/bordes detectables por el tracker. */
function markerSvg(label: string, bg: string, fg: string, accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" fill="${bg}"/>
    <rect x="24" y="24" width="464" height="464" fill="none" stroke="${fg}" stroke-width="16"/>
    <circle cx="150" cy="150" r="70" fill="${fg}"/>
    <polygon points="360,80 460,240 260,240" fill="${accent}"/>
    <rect x="90" y="300" width="140" height="140" fill="${accent}"/>
    <polygon points="300,300 460,320 420,460 290,420" fill="${fg}"/>
    <circle cx="380" cy="380" r="34" fill="${bg}"/>
    <rect x="120" y="330" width="60" height="60" fill="${bg}"/>
    <text x="256" y="270" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="bold"
          fill="${fg}" text-anchor="middle">${label}</text>
  </svg>`;
}

const PALETTES: [string, string, string][] = [
  ["#ffffff", "#0f172a", "#2563eb"],
  ["#fef3c7", "#7c2d12", "#ea580c"],
  ["#ecfdf5", "#064e3b", "#10b981"],
  ["#faf5ff", "#4c1d95", "#a855f7"],
  ["#fef2f2", "#7f1d1d", "#ef4444"],
];

/**
 * Crea `marker_<code>.png` con un patrón único por índice. Sólo se usa como
 * respaldo cuando no hay un marcador real disponible en `public/ar`.
 */
export async function generateMarkerImage(code: string, label: string, index: number): Promise<string> {
  await fs.mkdir(AR_DIR, { recursive: true });
  const [bg, fg, accent] = PALETTES[index % PALETTES.length];
  const png = await sharp(Buffer.from(markerSvg(label, bg, fg, accent))).png().toBuffer();
  const filename = `marker_${code}.png`;
  await fs.writeFile(path.join(AR_DIR, filename), png);
  return filename;
}

/** PDF de ejemplo para el tema teórico. Devuelve `{ ruta, size }` con la URL pública. */
export async function generateTopicPdf(
  filename: string,
  titulo: string,
  parrafos: string[],
): Promise<{ ruta: string; size: number; nombre: string }> {
  await fs.mkdir(PDF_DIR, { recursive: true });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const SIZE: [number, number] = [595.28, 841.89];
  const MARGIN = 56;

  let page = doc.addPage(SIZE);
  let y = SIZE[1] - MARGIN;

  const write = (text: string, size = 11, useBold = false) => {
    const maxWidth = SIZE[0] - MARGIN * 2;
    const f = useBold ? bold : font;
    const words = text.split(" ");
    let línea = "";
    const flush = () => {
      if (!línea) return;
      if (y - size - 6 < MARGIN) {
        page = doc.addPage(SIZE);
        y = SIZE[1] - MARGIN;
      }
      page.drawText(línea, { x: MARGIN, y, size, font: f, color: rgb(0.08, 0.08, 0.12) });
      y -= size + 6;
      línea = "";
    };
    for (const w of words) {
      const test = línea ? `${línea} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth) flush();
      línea = línea ? `${línea} ${w}` : w;
    }
    flush();
    y -= 6;
  };

  write(titulo, 20, true);
  write("Material de apoyo — Plataforma Aymara", 10);
  y -= 10;
  for (const p of parrafos) write(p);

  const bytes = await doc.save();
  await fs.writeFile(path.join(PDF_DIR, filename), bytes);
  return { ruta: `/uploads/pdf/${filename}`, size: bytes.length, nombre: filename };
}
