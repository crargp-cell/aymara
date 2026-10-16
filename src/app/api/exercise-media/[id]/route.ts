import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { assertMaestroOwnsParalelo } from "@/lib/rbac";
import { alumnoEnParalelo, imagenDesenfocada } from "@/lib/exercise-media";
import { intentosDe, sigmaDesenfoque } from "@/lib/exercise-answer";

/*
  Sirve la imagen de un ejercicio desde la base.

  En el juego «adivina la imagen» la imagen es la respuesta, así que el navegador
  nunca la recibe nítida mientras se juega: con `?play=<id de partida>` el
  servidor la manda ya desenfocada según los fallos de ESA partida (que él mismo
  lleva) y sólo la entrega entera cuando la partida terminó. Sin `play`, a un
  alumno se le niega cualquier imagen que sea la respuesta de un ejercicio.
*/
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId)) return new Response("No encontrado", { status: 404 });

  // `data` está excluido por defecto (src/lib/prisma.ts); aquí se pide a propósito.
  const media = await prisma.exerciseMedia.findUnique({ where: { id: mediaId }, select: { mime: true, data: true, paralelo_id: true } });
  if (!media) return new Response("No encontrado", { status: 404 });

  const esDocente = user.role !== "estudiante";
  const permitido = esDocente ? await assertMaestroOwnsParalelo(user.role, user.id, media.paralelo_id) : await alumnoEnParalelo(user.id, media.paralelo_id);
  if (!permitido) return new Response("No encontrado", { status: 404 });

  const playParam = req.nextUrl.searchParams.get("play");
  if (playParam) {
    const play = await prisma.exercisePlay.findUnique({ where: { id: Number(playParam) }, include: { exercise: { select: { image_id: true, config: true } } } });
    if (!play || play.user_id !== user.id || play.exercise.image_id !== mediaId) return new Response("No encontrado", { status: 404 });
    if (!play.terminado) {
      const sigma = sigmaDesenfoque(play.fallos, intentosDe(play.exercise.config));
      const borrosa = await imagenDesenfocada(Buffer.from(media.data), sigma);
      return new Response(new Uint8Array(borrosa), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" } });
    }
    return new Response(new Uint8Array(media.data), { headers: { "Content-Type": media.mime, "Cache-Control": "private, max-age=3600" } });
  }

  if (!esDocente) {
    const esRespuesta = await prisma.exercise.count({ where: { image_id: mediaId, type: "image_guess" } });
    if (esRespuesta > 0) return new Response("No encontrado", { status: 404 });
  }
  return new Response(new Uint8Array(media.data), {
    headers: { "Content-Type": media.mime, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
