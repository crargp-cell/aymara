"use server";

import { signOut } from "@/lib/auth";

/**
 * Cierre de sesión como server action con destino RELATIVO.
 *
 * El `signOut` de `next-auth/react` resuelve el destino contra la URL
 * configurada del servidor, así que detrás de un túnel o proxy devolvía al
 * visitante a localhost. Con `redirect()` sobre una ruta relativa siempre se
 * queda en el host por el que entró.
 */
export async function cerrarSesion() {
  await signOut({ redirectTo: "/login" });
}
