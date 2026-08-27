import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import { AR_DIR, saveUploadedMarker } from "@/lib/ar/marker";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code requerido" }, { status: 400 });
  const file = path.join(AR_DIR, `marker_${code}.patt`);
  try {
    const data = await fs.readFile(file, "utf-8");
    return new NextResponse(data, { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=31536000" } });
  } catch {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["maestro", "admin"].includes(role)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image") as File | null;
  const pattFile = form.get("patt") as File | null;
  const title = String(form.get("title") ?? "").slice(0, 100);
  if (!file) return NextResponse.json({ error: "image requerido" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "máximo 5MB" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "tipo no permitido" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const pattBuffer = pattFile && pattFile.size > 0 ? Buffer.from(await pattFile.arrayBuffer()) : null;
  const { code, markerFile } = await saveUploadedMarker(buffer, pattBuffer);

  // La creación de la tarjeta (con su paralelo) se hace desde /admin/ar-cards;
  // este endpoint sólo persiste el archivo del marcador.
  void title;
  return NextResponse.json({ code, marker: markerFile, preview: `marker_${code}.png` });
}
