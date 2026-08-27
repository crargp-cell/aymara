import fs from "fs/promises";
import path from "path";

export const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** Guarda un archivo subido bajo public/uploads/<subdir>/ y devuelve su URL pública. */
export async function saveUpload(
  subdir: string,
  originalName: string,
  buffer: Buffer,
): Promise<{ url: string; filename: string; absPath: string }> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .slice(0, 40);
  const filename = `${base || "file"}-${Date.now()}${ext}`;
  const absPath = path.join(dir, filename);
  await fs.writeFile(absPath, buffer);
  return { url: `/uploads/${subdir}/${filename}`, filename, absPath };
}

export async function fileExists(absolutePath: string): Promise<boolean> {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
