import { requireUser } from "@/lib/session";
import { contextoDelAlumno } from "@/lib/mascota/contexto";
import { guionPresentacion, guionProgreso, guionPalabra, semillaDelDia } from "@/lib/mascota/guion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/layout/Topbar";
import { Conversacion } from "@/components/mascota/Conversacion";
import { PanelChat } from "@/components/chat/PanelChat";
import { Guarda } from "@/components/brand/Andino";

export const metadata = { title: "Mallku — el cóndor" };

/**
 * La pantalla del cóndor.
 *
 * El acompañante flotante sólo tiene sitio para una frase; aquí es donde puede
 * explicarse: se presenta, cuenta por dónde va el alumno y enseña una palabra.
 * Es de sólo lectura — el cóndor comenta el progreso, no lo altera —, así que un
 * profesor puede entrar a verla sin que se le guarde nada.
 */
export default async function CondorPage() {
  const user = await requireUser();
  const ctx = await contextoDelAlumno(user.id, user.name ?? "");

  const presentacion = guionPresentacion(ctx);
  const progreso = guionProgreso(ctx);
  const palabra = guionPalabra(ctx, semillaDelDia());

  return (
    <div className="space-y-6">
      <Topbar
        title="Mallku — el cóndor"
        subtitle={ctx.paralelo ? `Te acompaña en ${ctx.paralelo}` : "Aún sin paralelo asignado"}
      />

      <Card acento="morado" className="overflow-hidden">
        <Guarda motivo="chaska" alto={10} opacidad={0.5} />
        <CardHeader>
          <CardTitle className="text-base">{presentacion.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <Conversacion guion={presentacion} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card acento="verde">
          <CardHeader>
            <CardTitle className="text-base">{progreso.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <Conversacion
              guion={progreso}
              accion={ctx.siguiente ? { texto: "Ir allí", href: ctx.siguiente.href } : null}
            />
          </CardContent>
        </Card>

        {palabra && (
          <Card acento="oro">
            <CardHeader>
              <CardTitle className="text-base">{palabra.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <Conversacion guion={palabra} accion={{ texto: "Ver el diccionario", href: "/dictionary" }} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card acento="azul" className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Pregúntale</CardTitle>
          <p className="text-xs text-muted-foreground">
            Busca palabras del diccionario y lecciones. Escribe en aymara o en español.
          </p>
        </CardHeader>
        <div className="h-[22rem] flex flex-col">
          <PanelChat />
        </div>
      </Card>
    </div>
  );
}
