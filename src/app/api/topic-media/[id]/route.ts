import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/*
  Sirve la imagen o el audio de una diapositiva desde la base.

  Los audios necesitan responder a `Range`: Safari/iOS no reproduce un <audio>
  cuyo servidor no soporte peticiones parciales, y Chrome lo usa para poder
  saltar dentro de la pista. Un id de medio nunca cambia de contenido (reemplazar
  el archivo crea uno nuevo), así que la respuesta se puede cachear sin límite.
*/
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId)) return new Response("No encontrado", { status: 404 });

  // `data` está excluido por defecto (src/lib/prisma.ts); aquí se pide a propósito.
  const media = await prisma.topicMedia.findUnique({
    where: { id: mediaId },
    select: { mime: true, data: true, topic: { select: { estado: true } } },
  });
  if (!media) return new Response("No encontrado", { status: 404 });
  if (user.role === "estudiante" && media.topic.estado !== "activo") {
    return new Response("No encontrado", { status: 404 });
  }

  const data = new Uint8Array(media.data);
  const total = data.byteLength;
  const base = {
    "Content-Type": media.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=-500" = los últimos 500 bytes.
    const start = range[1] ? Number(range[1]) : Math.max(total - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start > end || start >= total) {
      return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${total}` } });
    }
    const parte = data.subarray(start, end + 1);
    return new Response(parte, {
      status: 206,
      headers: { ...base, "Content-Length": String(parte.byteLength), "Content-Range": `bytes ${start}-${end}/${total}` },
    });
  }

  return new Response(data, { headers: { ...base, "Content-Length": String(total) } });
}
