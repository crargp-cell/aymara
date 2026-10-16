import { auth } from "@/lib/auth";
import { contextoDelAlumno } from "@/lib/mascota/contexto";

/*
  El acompañante flotante pide su contexto desde el navegador en vez de recibirlo
  del layout. El layout envuelve todas las pantallas del alumno: calcular ahí el
  tablero, los logros y el diccionario retrasaría cada carga por algo que es
  decoración. Así la página aparece primero y el cóndor habla un instante después.
*/
export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!user?.id) return Response.json({ error: "sin sesión" }, { status: 401 });

  const ctx = await contextoDelAlumno(Number(user.id), user.name ?? "");
  return Response.json(ctx, { headers: { "Cache-Control": "no-store" } });
}
