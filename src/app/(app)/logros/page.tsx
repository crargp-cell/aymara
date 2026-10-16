import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { Chakana } from "@/components/brand/Chakana";
import { Lock } from "lucide-react";

export default async function LogrosPage() {
  const user = await requireUser();

  const [logros, obtenidos] = await Promise.all([
    prisma.logro.findMany({ where: { activo: true }, orderBy: [{ categoria: "asc" }, { criterio_valor: "asc" }] }),
    prisma.logroAlumno.findMany({ where: { alumno_id: user.id } }),
  ]);
  const map = new Map(obtenidos.map((o) => [o.logro_id, o]));
  const pct = logros.length ? Math.round((obtenidos.length / logros.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Topbar title="Logros" subtitle={`${obtenidos.length} de ${logros.length} desbloqueados`} />

      <div className="panel rounded-lg px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Colección</span>
          <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--ruta-completado)" }} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {logros.map((l, i) => {
          const got = map.get(l.id);
          return (
            <Card key={l.id} className={got ? "" : "opacity-75"} style={got ? { borderColor: "var(--ruta-completado)" } : undefined}>
              <CardContent className="pt-6 flex items-start gap-4">
                <div className="relative shrink-0">
                  <Chakana seed={l.id + i} size={52} apagada={!got} />
                  {!got && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="font-semibold text-sm leading-tight">{l.nombre}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{l.descripcion}</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge variant="outline">{l.categoria}</Badge>
                    {got ? (
                      <span className="text-[11px] font-medium" style={{ color: "var(--ruta-completado)" }}>
                        {got.unlocked_at.toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">meta: {l.criterio_valor}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
