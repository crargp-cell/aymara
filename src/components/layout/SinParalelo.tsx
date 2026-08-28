import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Estado vacío cuando no hay paralelo en contexto. Para el docente es un paso
 * pendiente (elegir con cuál trabajar); para el alumno, una inscripción que le
 * falta y que resuelve el administrador.
 */
export function SinParalelo({ esDocente, volverA }: { esDocente: boolean; volverA: string }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        {esDocente ? (
          <>
            <p className="text-sm text-muted-foreground">
              Todavía no elegiste con qué paralelo trabajar. El contenido pertenece a un paralelo concreto.
            </p>
            <Link href={`/dashboard?next=${encodeURIComponent(volverA)}`}>
              <Button variant="gradient">Elegir paralelo</Button>
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no estás inscrito en un paralelo. Pide al administrador que te inscriba para ver el contenido.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
