import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArScene } from "@/components/ar/ArScene";
import { AR_DIR, fileExists } from "@/lib/ar/marker";
import path from "path";
import Link from "next/link";

export default async function ArCardViewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await prisma.arCard.findFirst({ where: { card_code: code } });
  if (!card) notFound();

  const previewFile = `marker_${card.card_code}.png`;
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
            <div className="glass rounded-2xl p-6 text-center">
              <div className="h-64 bg-black rounded-xl flex items-center justify-center text-white text-sm px-4 text-center">
                Esta tarjeta no tiene un marcador de imagen real generado todavía — pide a un maestro/admin que la recree subiendo una imagen en el panel de AR Cards.
              </div>
            </div>
          )}
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Marcador: {card.card_code} · Modelo: {card.card_data ?? "—"}
            </p>
          </div>
          <div className="flex gap-2">
            {hasPatt && (
              <a href={`/api/ar/marker?code=${card.card_code}`} download>
                <Button variant="outline">Descargar .patt</Button>
              </a>
            )}
            <Link href="/ar-cards">
              <Button variant="secondary">Volver</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
