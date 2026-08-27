import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import { saveUploadedMarker, AR_DIR, fileExists } from "@/lib/ar/marker";
import path from "path";
import Image from "next/image";

export default async function AdminArCardsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const cards = await prisma.arCard.findMany({ orderBy: { id: "asc" }, take: 30 });
  const previews = await Promise.all(cards.map(async (c) => (await fileExists(path.join(AR_DIR, `marker_${c.card_code}.png`))) ? `/ar/marker_${c.card_code}.png` : null));
  const previewMap = new Map(cards.map((c, i) => [c.id, previews[i]]));

  async function createCardWithMarker(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "") || null;
    const image = formData.get("image") as File | null;
    const patt = formData.get("patt") as File | null;
    if (!title || !image || image.size === 0) return;
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const pattBuffer = patt && patt.size > 0 ? Buffer.from(await patt.arrayBuffer()) : null;
    const { code, markerFile } = await saveUploadedMarker(imageBuffer, pattBuffer);
    const session = await auth();
    const created_by = Number((session?.user as any)?.id ?? 1);
    await prisma.arCard.create({ data: { title, description, card_code: code, marker_file: markerFile, created_by, activo: true, is_unlocked: true } });
    revalidatePath("/admin/ar-cards");
  }

  async function uploadModel(formData: FormData) {
    "use server";
    const cardId = Number(formData.get("card_id"));
    const model = formData.get("model") as File | null;
    if (!cardId || !model || model.size === 0) return;
    if (!model.name.toLowerCase().endsWith(".glb")) return;
    const card = await prisma.arCard.findUnique({ where: { id: cardId } });
    if (!card) return;
    const { saveArModel } = await import("@/lib/ar/marker");
    const buffer = Buffer.from(await model.arrayBuffer());
    const url = await saveArModel(card.card_code, buffer);
    await prisma.arCard.update({ where: { id: cardId }, data: { card_data: url } });
    revalidatePath("/admin/ar-cards");
  }

  async function toggle(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    const c = await prisma.arCard.findUnique({ where: { id } });
    if (!c) return;
    await prisma.arCard.update({ where: { id }, data: { activo: !c.activo } });
    revalidatePath("/admin/ar-cards");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Gestión AR Cards" subtitle="Subí tu propio marcador (.patt) y su imagen de referencia" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear tarjeta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCardWithMarker} className="grid md:grid-cols-2 gap-3">
            <Input name="title" placeholder="Título" required />
            <Input name="description" placeholder="Descripción" />
            <label className="md:col-span-2 text-sm space-y-1">
              <span className="text-muted-foreground text-xs">Imagen de referencia (jpg/png/webp, máx 5MB) — la usa la cámara AR para reconocer el marcador</span>
              <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" required className="block w-full text-sm" />
            </label>
            <label className="md:col-span-2 text-sm space-y-1">
              <span className="text-muted-foreground text-xs">Marcador .patt (opcional) — generalo con una herramienta externa de AR.js si querés ofrecer descarga</span>
              <input type="file" name="patt" accept=".patt" className="block w-full text-sm" />
            </label>
            <Button type="submit" variant="gradient" className="md:col-span-2">
              Crear tarjeta
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subir modelo 3D (.glb) a una tarjeta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={uploadModel} className="grid md:grid-cols-2 gap-3">
            <select name="card_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" required defaultValue="">
              <option value="" disabled>
                Selecciona tarjeta
              </option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.card_code} — {c.title ?? "sin título"}
                </option>
              ))}
            </select>
            <input type="file" name="model" accept=".glb" required className="block w-full text-sm h-10" />
            <Button type="submit" variant="secondary" className="md:col-span-2">
              Subir modelo
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarjetas ({cards.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cards.map((c) => (
            <div key={c.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                {previewMap.get(c.id) && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={previewMap.get(c.id)!} alt={c.card_code} fill sizes="48px" className="object-cover" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {c.title} — {c.card_code}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{c.marker_file} · {c.card_data ? "modelo .glb ✓" : "sin modelo"}</span>
                    <Badge variant={c.activo ? "success" : "destructive"}>{c.activo ? "activo" : "inactivo"}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/ar-cards/${c.id}`}>
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                </Link>
                <form action={toggle}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button size="sm" variant="secondary" type="submit">
                    {c.activo ? "Desactivar" : "Activar"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
