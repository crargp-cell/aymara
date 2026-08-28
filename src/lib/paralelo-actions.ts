"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PARALELO_COOKIE, getParalelosVisibles } from "@/lib/paralelo";
import { requireRole } from "@/lib/session";

/** Fija el paralelo con el que trabaja el docente y vuelve a la página pedida. */
export async function setParaleloSeleccionado(formData: FormData) {
  const user = await requireRole(["maestro", "admin"]);
  const id = Number(formData.get("paralelo_id"));
  if (!Number.isFinite(id)) return;

  // Sólo se puede elegir un paralelo que el usuario realmente pueda ver.
  const visibles = await getParalelosVisibles(user.role, user.id);
  if (!visibles.some((p) => p.id === id)) return;

  const jar = await cookies();
  jar.set(PARALELO_COOKIE, String(id), { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });

  const back = String(formData.get("back") ?? "");
  const destino = back.startsWith("/") ? back : "/admin/lessons";
  revalidatePath(destino);
  redirect(destino);
}

/** Olvida el paralelo elegido — vuelve a pedir la selección. */
export async function limpiarParaleloSeleccionado() {
  await requireRole(["maestro", "admin"]);
  const jar = await cookies();
  jar.delete(PARALELO_COOKIE);
  redirect("/dashboard");
}
