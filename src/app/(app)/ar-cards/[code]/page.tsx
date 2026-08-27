import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArScene } from "@/components/ar/ArScene";
import { AR_DIR, fileExists } from "@/lib/ar/marker";
import { requireUser } from "@/lib/session";
import { maestroParaleloIds } from "@/lib/rbac";
import path from "path";
import Link from "next/link";

export default async function ArCardViewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await prisma.arCard.findFirst({ where: { card_code: code } });
  if (!card) notFound();

  const user = await requireUser();
  // Guard real de desbloqueo (Negocio.md §30, §37) — antes la lista sólo escondía el enlace.
  if (user.role === "estudiante") {
    const owned = await prisma.userArCard.findUnique({ where: { alumno_id_ar_card_id: { alumno_id: user.id, ar_card_id: card.id } } });
    if (!owned || owned.revocado) {
      return (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle>Tarjeta bloqueada</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Aún no has desbloqueado esta tarjeta.</p>
              <Link href="/ar-cards"><Button variant="outline">Volver</Button></Link>
            </CardContent>
          </Card>
        </div>
      );
    }
  } else {
    const allowed = user.role === "admin" || (await maestroParaleloIds(user.id)).includes(card.paralelo_id);
    if (!allowed) notFound();
  }

  const previewFile = card.image_file ?? `marker_${card.card_code}.png`;
  const hasPreview = await fileExists(path.join(AR_DIR, previewFile));
  const hasPatt = await fileExists(path.join(AR_DIR, `marker_${card.card_code}.patt`));
  const modelUrl = card.card_data && card.card_data.startsWith("/ar/models/") ? card.card_data : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{card.title ?? card.card_code}</CardTitle>
          <p className="text-sm text-muted-foreground">{card.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPreview ? (
            <ArScene markerImageUrl={`/ar/${previewFile}`} modelUrl={modelUrl} />
          ) : (
            <div className="h-64 bg-black rounded-xl flex items-center justify-center text-white text-sm px-4 text-center">
              Esta tarjeta no tiene un marcador de imagen todavía — pide a un docente que suba la imagen de referencia.
            </div>
          )}
          <div className="flex gap-2">
            {hasPatt && (
              <a href={`/api/ar/marker?code=${card.card_code}`} download>
                <Button variant="outline">Descargar .patt</Button>
              </a>
            )}
            <Link href="/ar-cards"><Button variant="secondary">Volver</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
