import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getParaleloActivoAlumno, getParaleloSeleccionado } from "@/lib/paralelo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { SinParalelo } from "@/components/layout/SinParalelo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default async function ArCardsPage() {
  const user = await requireUser();
  const isStaff = user.role !== "estudiante";
  const paralelo = isStaff ? (await getParaleloSeleccionado(user.role, user.id)).actual : await getParaleloActivoAlumno(user.id);

  if (!paralelo) {
    return (
      <div className="space-y-6">
        <Topbar title="Tarjetas AR" />
        <SinParalelo esDocente={isStaff} volverA="/ar-cards" />
      </div>
    );
  }

  const cards = await prisma.arCard.findMany({
    where: { paralelo_id: paralelo.id, estado: { in: isStaff ? ["activo", "inactivo", "retirado"] : ["activo", "retirado"] } },
    orderBy: { id: "asc" },
  });
  const mine = await prisma.userArCard.findMany({ where: { alumno_id: user.id } });
  const ownedMap = new Map(mine.map((m) => [m.ar_card_id, m]));

  const activos = cards.filter((c) => c.estado === "activo");
  const inactivos = cards.filter((c) => c.estado !== "activo");

  const renderCard = (c: (typeof cards)[number]) => {
    const owned = ownedMap.get(c.id);
    const hasIt = isStaff || (!!owned && !owned.revocado);
    const preview = c.image_file ? `/ar/${c.image_file}` : null;
    const body = (
      <>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            {c.title ?? c.card_code}
            <Badge variant={hasIt ? "success" : owned?.revocado ? "destructive" : "secondary"}>
              {isStaff ? c.estado : owned?.revocado ? "revocada" : hasIt ? "obtenida" : "bloqueada"}
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{c.card_code}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview ? (
            <div className="relative h-32 w-full rounded-xl overflow-hidden">
              <Image src={preview} alt={c.card_code} fill sizes="(max-width:768px) 100vw, 33vw" className={`object-cover ${hasIt ? "" : "grayscale opacity-50"}`} />
            </div>
          ) : (
            <div className="h-32 panel rounded-xl flex items-center justify-center text-xs text-muted-foreground">Sin imagen</div>
          )}
          <p className="text-xs line-clamp-2">{c.description ?? "Sin descripción"}</p>
          {hasIt ? (
            <Button variant="gradient" size="sm" className="w-full pointer-events-none">Ver en AR</Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full pointer-events-none" disabled>
              {owned?.revocado ? "Revocada" : "Bloqueada"}
            </Button>
          )}
        </CardContent>
      </>
    );
    return hasIt ? (
      <Link key={c.id} href={`/ar-cards/${c.card_code}`}><Card style={{ borderColor: "var(--ruta-completado)" }}>{body}</Card></Link>
    ) : (
      <Card key={c.id} className="opacity-60 cursor-not-allowed">{body}</Card>
    );
  };

  return (
    <div className="space-y-6">
      <Topbar
        title="Tarjetas AR"
        subtitle={isStaff ? `${paralelo.nombre} — ${cards.length} tarjetas (${activos.length} activas, ${inactivos.length} inactivas)` : `${mine.filter((m) => !m.revocado).length}/${cards.length} en tu colección`}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Activas</h2>
          <Badge variant="secondary">{activos.length}</Badge>
        </div>
        {activos.length === 0 ? (
          <p className="text-sm text-muted-foreground panel rounded-xl px-4 py-3">Sin tarjetas activas en este paralelo.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{activos.map(renderCard)}</div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Inactivas</h2>
          <Badge variant="outline">{inactivos.length}</Badge>
        </div>
        {inactivos.length === 0 ? (
          <p className="text-sm text-muted-foreground panel rounded-xl px-4 py-3">Sin tarjetas inactivas.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{inactivos.map(renderCard)}</div>
        )}
      </section>
    </div>
  );
}
