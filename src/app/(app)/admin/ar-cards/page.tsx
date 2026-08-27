import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { ParaleloSwitcher } from "@/components/layout/ParaleloSwitcher";
import { maestroContext } from "@/lib/maestro-page";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent, assertMaestroOwnsParalelo } from "@/lib/rbac";
import { badgeVariantContenido } from "@/lib/estado";
import { saveUploadedMarker } from "@/lib/ar/marker";
import Link from "next/link";
import Image from "next/image";

export default async function AdminArCardsPage() {
  const { paralelo, opciones } = await maestroContext("/admin/ar-cards");

  const [cards, lessons] = paralelo
    ? await Promise.all([
        prisma.arCard.findMany({
          where: { paralelo_id: paralelo.id },
          orderBy: { id: "asc" },
          include: { _count: { select: { user_cards: true, exam_links: true } } },
        }),
        prisma.lesson.findMany({ where: { paralelo_id: paralelo.id }, orderBy: { orden: "asc" }, select: { id: true, title: true } }),
      ])
    : [[], []];

  async function createCard(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const paraleloId = Number(formData.get("paralelo_id"));
    if (!(await assertMaestroOwnsParalelo(user.role, user.id, paraleloId))) return;
    const title = String(formData.get("title") ?? "").trim();
    const image = formData.get("image");
    if (!title || !(image instanceof File) || image.size === 0) return;
    const patt = formData.get("patt");
    const pattBuffer = patt instanceof File && patt.size > 0 ? Buffer.from(await patt.arrayBuffer()) : null;
    const { code, markerFile, previewFile } = await saveUploadedMarker(Buffer.from(await image.arrayBuffer()), pattBuffer);
    const unlock_type = formData.get("unlock_type") === "exam" ? "exam" : "lesson";
    const unlock_lesson_id = formData.get("unlock_lesson_id") ? Number(formData.get("unlock_lesson_id")) : null;
    await prisma.arCard.create({
      data: {
        paralelo_id: paraleloId,
        title,
        description: String(formData.get("description") ?? "") || null,
        card_code: code,
        marker_file: markerFile,
        image_file: previewFile,
        unlock_type,
        unlock_lesson_id: unlock_type === "lesson" ? unlock_lesson_id : null,
        created_by: user.id,
        updated_by: user.id,
      },
    });
    revalidatePath("/admin/ar-cards");
  }

  async function setEstado(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const id = Number(formData.get("id"));
    const target = String(formData.get("estado"));
    const { ok } = await assertMaestroOwnsContent(user.role, user.id, "arcard", id);
    if (!ok) return;
    if (!["activo", "inactivo", "retirado"].includes(target)) return;
    await prisma.arCard.update({ where: { id }, data: { estado: target as "activo" | "inactivo" | "retirado", updated_by: user.id } });
    revalidatePath("/admin/ar-cards");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Tarjetas AR" subtitle="Recompensas físicas imprimibles. Retirar una impide nuevas obtenciones; quien ya la tiene la conserva." />
      <ParaleloSwitcher actual={paralelo} opciones={opciones} back="/admin/ar-cards" />

      {paralelo && (
        <Card>
          <CardHeader><CardTitle className="text-base">Crear tarjeta en {paralelo.nombre}</CardTitle></CardHeader>
          <CardContent>
            <form action={createCard} className="grid md:grid-cols-2 gap-3">
              <input type="hidden" name="paralelo_id" value={paralelo.id} />
              <Input name="title" placeholder="Título (p. ej. Llama)" required />
              <Input name="description" placeholder="Descripción" />
              <label className="md:col-span-2 text-sm space-y-1">
                <span className="text-muted-foreground text-xs">Imagen de referencia (jpg/png/webp) — la cámara AR la usa para reconocer la tarjeta</span>
                <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required className="block w-full text-sm" />
              </label>
              <label className="md:col-span-2 text-sm space-y-1">
                <span className="text-muted-foreground text-xs">Marcador .patt (opcional, para descarga AR.js)</span>
                <input type="file" name="patt" accept=".patt" className="block w-full text-sm" />
              </label>
              <select name="unlock_type" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue="lesson">
                <option value="lesson">Se obtiene al completar una lección</option>
                <option value="exam">Se obtiene al aprobar un examen</option>
              </select>
              <select name="unlock_lesson_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue="">
                <option value="">Lección (si aplica)…</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.title.slice(0, 40)}</option>)}
              </select>
              <Button type="submit" variant="gradient" className="md:col-span-2">Crear tarjeta</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Tarjetas ({cards.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cards.length === 0 && <p className="text-sm text-muted-foreground">Sin tarjetas en este paralelo.</p>}
          {cards.map((c) => (
            <div key={c.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                {c.image_file && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={`/ar/${c.image_file}`} alt={c.card_code} fill sizes="48px" className="object-cover" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{c.title} — {c.card_code}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <Badge variant={badgeVariantContenido(c.estado)}>{c.estado}</Badge>
                    <span>obtención: {c.unlock_type}</span>
                    <span>{c._count.user_cards} alumno(s) · {c._count.exam_links} examen(es)</span>
                    <span>{c.card_data ? "modelo .glb ✓" : "sin modelo"}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/ar-cards/${c.id}`}><Button size="sm" variant="outline">Editar</Button></Link>
                {c.estado !== "retirado" ? (
                  <>
                    <form action={setEstado}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="estado" value={c.estado === "activo" ? "inactivo" : "activo"} /><Button size="sm" variant="secondary" type="submit">{c.estado === "activo" ? "Desactivar" : "Activar"}</Button></form>
                    <form action={setEstado}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="estado" value="retirado" /><Button size="sm" variant="destructive" type="submit">Retirar</Button></form>
                  </>
                ) : (
                  <form action={setEstado}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="estado" value="activo" /><Button size="sm" variant="secondary" type="submit">Reactivar</Button></form>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
