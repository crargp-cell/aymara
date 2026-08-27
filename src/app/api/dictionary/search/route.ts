import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const perPage = 20;
  const where = q ? { OR: [{ aymara: { contains: q, mode: "insensitive" as const } }, { espanol: { contains: q, mode: "insensitive" as const } }], activo: true } : { activo: true };
  const [words, total] = await Promise.all([
    prisma.diccionario.findMany({ where, take: perPage, skip: (page - 1) * perPage, orderBy: { id: "asc" } }),
    prisma.diccionario.count({ where }),
  ]);

  // log search_history async (no await)
  if (q) {
    const first = words[0];
    if (first) prisma.searchHistory.create({ data: { headword: first.aymara ?? q, gloss: first.espanol ?? q } }).catch(() => {});
  }

  return NextResponse.json({ words, total, page, perPage });
}
