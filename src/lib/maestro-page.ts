import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getParaleloSeleccionado } from "@/lib/paralelo";

/**
 * Preámbulo de las páginas de autoría. El contenido pertenece a un paralelo
 * (Negocio.md §31), así que lo primero es elegir con cuál se va a trabajar:
 * si no hay uno seleccionado, se redirige al selector antes de cargar nada.
 *
 * @param backPath ruta a la que volver una vez elegido el paralelo.
 */
export async function maestroContext(backPath: string) {
  const user = await requireRole(["maestro", "admin"]);
  const { actual, opciones } = await getParaleloSeleccionado(user.role, user.id);
  if (!actual) redirect(`/admin/paralelo?next=${encodeURIComponent(backPath)}`);
  return { user, paralelo: actual, opciones };
}
