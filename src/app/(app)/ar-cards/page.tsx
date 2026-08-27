import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AR_DIR, fileExists } from "@/lib/ar/marker";
import path from "path";
import Image from "next/image";

export default async function ArCardsPage() {
  const session = await auth();
  const userId = Number((session?.user as any)?.id ?? 0);
  const role = (session?.user as any)?.role;
  const isStaff = role === "maestro" || role === "admin";
  const unlocked = await prisma.userArCard.findMany({ where: { user_id: userId } });
  const unlockedIds = unlocked.map((u) => u.ar_card_id);
  const cards = await prisma.arCard.findMany({ where: { activo: true }, orderBy: { id: "asc" } });
  const previews = await Promise.all(
    cards.map(async (c) => (await fileExists(path.join(AR_DIR, `marker_${c.card_code}.png`))) ? `/ar/marker_${c.card_code}.png` : null)
  );
  const previewMap = new Map(cards.map((c, i) => [c.id, previews[i]]));

  return (
    <div className="space-y-6">
      <Topbar title="Tarjetas AR" subtitle={isStaff ? `${cards.length} tarjetas` : `${unlocked.length}/${cards.length} desbloqueadas`} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const isUnlocked = isStaff || unlockedIds.includes(c.id);
          const preview = previewMap.get(c.id);
          const body = (
            <>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {c.title ?? c.card_code}
                  <Badge variant={isUnlocked ? "success" : "secondary"}>{isUnlocked ? "desbloqueada" : "bloqueada"}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{c.card_code} · {c.marker_file}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {preview ? (
                  <div className="relative h-32 w-full rounded-xl overflow-hidden">
                    <Image src={preview} alt={`Marcador ${c.card_code}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  </div>
                ) : (
                  <div className="h-32 glass rounded-xl flex items-center justify-center text-xs text-muted-foreground">Preview {c.marker_file}</div>
                )}
                <p className="text-xs line-clamp-2">{c.description ?? "Sin descripción"}</p>
                {isUnlocked ? (
                  <Button variant="gradient" size="sm" className="w-full pointer-events-none">
                    Ver en AR
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full pointer-events-none" disabled>
                    Bloqueada
                  </Button>
                )}
              </CardContent>
            </>
          );
          if (!isUnlocked) {
            return (
              <Card key={c.id} className="opacity-60 cursor-not-allowed">
                {body}
              </Card>
            );
          }
          return (
            <Link key={c.id} href={`/ar-cards/${c.card_code}`}>
              <Card className="border-emerald-400/30">{body}</Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
