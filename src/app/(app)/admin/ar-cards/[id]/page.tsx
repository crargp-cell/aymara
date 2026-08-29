import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { saveUploadedMarker, saveArModel } from "@/lib/ar/marker";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent } from "@/lib/rbac";
import Link from "next/link";

export default async function AdminArCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["maestro", "admin"]);
  const { id } = await params;
  const cardId = Number(id);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "arcard", cardId);
  if (!ok) notFound();
  const card = await prisma.arCard.findUnique({
    where: { id: cardId },
    include: { user_cards: { include: { alumno: { select: { id: true, nombre: true, apellido: true, username: true } } }, orderBy: { unlocked_at: "desc" } } },
  });
  if (!card) notFound();

  async function guard() {
    "use server";
    const u = await requireRole(["maestro", "admin"]);
    const { ok } = await assertMaestroOwnsContent(u.role, u.id, "arcard", cardId);
    return ok ? u : null;
  }

  async function updateCard(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    await prisma.arCard.update({
      where: { id: cardId },
      data: { title, description: String(formData.get("description") ?? "") || null, updated_by: u.id },
    });
    revalidatePath(`/admin/ar-cards/${cardId}`);
    revalidatePath("/admin/ar-cards");
  }

  async function replaceMarker(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const image = formData.get("image");
    if (!(image instanceof File) || image.size === 0) return;
    const patt = formData.get("patt");
    const pattBuffer = patt instanceof File && patt.size > 0 ? Buffer.from(await patt.arrayBuffer()) : null;
    const { code, markerFile, previewFile } = await saveUploadedMarker(Buffer.from(await image.arrayBuffer()), pattBuffer);
    await prisma.arCard.update({ where: { id: cardId }, data: { card_code: code, marker_file: markerFile, image_file: previewFile, updated_by: u.id } });
    revalidatePath(`/admin/ar-cards/${cardId}`);
    revalidatePath("/admin/ar-cards");
  }

  async function uploadModel(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const model = formData.get("model");
    if (!(model instanceof File) || model.size === 0) throw new Error("Selecciona un .glb");
    if (!model.name.toLowerCase().endsWith(".glb")) throw new Error("Solo .glb");
    if (model.size > 15 * 1024 * 1024) throw new Error("Máximo 15MB");
    const url = await saveArModel(card!.card_code, Buffer.from(await model.arrayBuffer()));
    await prisma.arCard.update({ where: { id: cardId }, data: { card_data: url, updated_by: u.id } });
    revalidatePath(`/admin/ar-cards/${cardId}`);
  }

  async function revokeFromStudent(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const userCardId = Number(formData.get("user_card_id"));
    const motivo = String(formData.get("motivo") ?? "Revocada por el docente").slice(0, 255);
    // Se conserva la fila histórica (Negocio.md §21) — sólo se marca revocada.
    await prisma.userArCard.update({
      where: { id: userCardId },
      data: { revocado: true, revocado_at: new Date(), revocado_por: u.id, motivo },
    });
    revalidatePath(`/admin/ar-cards/${cardId}`);
  }

  async function restoreToStudent(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const userCardId = Number(formData.get("user_card_id"));
    await prisma.userArCard.update({ where: { id: userCardId }, data: { revocado: false, revocado_at: null, revocado_por: null, motivo: null } });
    revalidatePath(`/admin/ar-cards/${cardId}`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Topbar title={`Tarjeta AR — ${card.card_code}`} subtitle={card.title ?? undefined} />
      <Link href="/admin/ar-cards" className="text-sm text-primary hover:underline">← Volver a tarjetas AR</Link>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos</CardTitle></CardHeader>
        <CardContent>
          <form action={updateCard} className="grid gap-3">
            <Input name="title" placeholder="Título" defaultValue={card.title ?? ""} required />
            <Input name="description" placeholder="Descripción" defaultValue={card.description ?? ""} />
            <Button type="submit" variant="gradient">Guardar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Marcador y modelo 3D</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <form action={replaceMarker} className="grid gap-2">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground text-xs">Imagen nueva. Con esto basta: se regeneran solos el .patt y la lámina para imprimir.</span>
              <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground text-xs">Marcador .patt propio (opcional), sólo si prefieres uno entrenado a mano.</span>
              <input type="file" name="patt" accept=".patt" className="block w-full text-sm" />
            </label>
            <Button type="submit" variant="secondary">Reemplazar marcador</Button>
          </form>
          <form action={uploadModel} className="flex items-center gap-2 pt-2 border-t border-border">
            <input type="file" name="model" accept=".glb" required className="text-sm" />
            <Button type="submit" variant="secondary">{card.card_data ? "Reemplazar" : "Subir"} .glb</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Alumnos con esta tarjeta ({card.user_cards.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {card.user_cards.length === 0 && <p className="text-sm text-muted-foreground">Ningún alumno la ha desbloqueado.</p>}
          {card.user_cards.map((uc) => (
            <div key={uc.id} className="panel rounded-xl px-4 py-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {uc.alumno.nombre ?? uc.alumno.username} {uc.alumno.apellido ?? ""}
                {uc.revocado && <Badge variant="destructive">revocada</Badge>}
                <span className="text-xs text-muted-foreground">{uc.unlocked_at.toLocaleDateString()}</span>
              </span>
              {uc.revocado ? (
                <form action={restoreToStudent}><input type="hidden" name="user_card_id" value={uc.id} /><Button size="sm" variant="secondary" type="submit">Restaurar</Button></form>
              ) : (
                <form action={revokeFromStudent} className="flex gap-2">
                  <input type="hidden" name="user_card_id" value={uc.id} />
                  <Input name="motivo" placeholder="Motivo" className="h-8 w-40" />
                  <Button size="sm" variant="destructive" type="submit">Revocar</Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
