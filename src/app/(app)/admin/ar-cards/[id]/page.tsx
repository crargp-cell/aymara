import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import { saveUploadedMarker } from "@/lib/ar/marker";
import Link from "next/link";

export default async function AdminArCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");

  const { id } = await params;
  const cardId = Number(id);
  const card = await prisma.arCard.findUnique({ where: { id: cardId } });
  if (!card) notFound();

  async function updateCard(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "") || null;
    if (!title) return;
    await prisma.arCard.update({ where: { id: cardId }, data: { title, description } });
    revalidatePath(`/admin/ar-cards/${cardId}`);
    revalidatePath("/admin/ar-cards");
  }

  async function replaceMarker(formData: FormData) {
    "use server";
    const image = formData.get("image") as File | null;
    const patt = formData.get("patt") as File | null;
    if ((!image || image.size === 0) && (!patt || patt.size === 0)) return;
    const current = await prisma.arCard.findUnique({ where: { id: cardId } });
    if (!current) return;
    if (image && image.size > 0) {
      const imageBuffer = Buffer.from(await image.arrayBuffer());
      const pattBuffer = patt && patt.size > 0 ? Buffer.from(await patt.arrayBuffer()) : null;
      const { code, markerFile } = await saveUploadedMarker(imageBuffer, pattBuffer);
      await prisma.arCard.update({ where: { id: cardId }, data: { card_code: code, marker_file: markerFile } });
    }
    revalidatePath(`/admin/ar-cards/${cardId}`);
    revalidatePath("/admin/ar-cards");
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Topbar title={`Editar tarjeta AR — ${card.card_code}`} subtitle={card.title ?? undefined} />
      <Link href="/admin/ar-cards" className="text-sm text-primary hover:underline">
        ← Volver a tarjetas AR
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCard} className="grid gap-3">
            <Input name="title" placeholder="Título" defaultValue={card.title ?? ""} required />
            <Input name="description" placeholder="Descripción" defaultValue={card.description ?? ""} />
            <Button type="submit" variant="gradient">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reemplazar marcador</CardTitle>
          <p className="text-xs text-muted-foreground">Sube una nueva imagen de referencia (genera un código nuevo) y opcionalmente un `.patt` real.</p>
        </CardHeader>
        <CardContent>
          <form action={replaceMarker} className="grid gap-3">
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground text-xs">Nueva imagen de referencia</span>
              <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" className="block w-full text-sm" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground text-xs">Nuevo .patt (opcional)</span>
              <input type="file" name="patt" accept=".patt" className="block w-full text-sm" />
            </label>
            <Button type="submit" variant="secondary">
              Reemplazar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
