import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { Trophy, Lock } from "lucide-react";

export default async function LogrosPage() {
  const user = await requireUser();

  const [logros, obtenidos] = await Promise.all([
    prisma.logro.findMany({ where: { activo: true }, orderBy: [{ categoria: "asc" }, { criterio_valor: "asc" }] }),
    prisma.logroAlumno.findMany({ where: { alumno_id: user.id } }),
  ]);
  const map = new Map(obtenidos.map((o) => [o.logro_id, o]));

  return (
    <div className="space-y-6">
      <Topbar title="Logros" subtitle={`${obtenidos.length}/${logros.length} desbloqueados`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {logros.map((l) => {
          const got = map.get(l.id);
          return (
            <Card key={l.id} className={got ? "border-emerald-400/30" : "opacity-70"}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {got ? <Trophy className="h-5 w-5 text-amber-300" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                  {l.nombre}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{l.descripcion}</p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="outline">{l.categoria}</Badge>
                {got ? (
                  <span className="text-xs text-emerald-400">{got.unlocked_at.toLocaleDateString()}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">meta: {l.criterio_valor}</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
