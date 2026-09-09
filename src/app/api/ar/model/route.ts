import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveArModel } from "@/lib/ar/marker";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["maestro", "admin"].includes(role)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("model") as File | null;
  const cardId = Number(form.get("card_id"));
  if (!file) return NextResponse.json({ error: "model requerido" }, { status: 400 });
  if (!Number.isFinite(cardId)) return NextResponse.json({ error: "card_id inválido" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "máximo 15MB" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".glb")) return NextResponse.json({ error: "solo se acepta .glb" }, { status: 400 });

  const card = await prisma.arCard.findUnique({ where: { id: cardId } });
  if (!card) return NextResponse.json({ error: "tarjeta no encontrada" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await saveArModel(card.card_code, buffer);
  await prisma.arCard.update({ where: { id: cardId }, data: { card_data: url, model_data: buffer, model_mime: "model/gltf-binary" } });

  return NextResponse.json({ url });
}
