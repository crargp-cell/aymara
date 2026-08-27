import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

export async function getCurrentCurso(): Promise<number> {
  const jar = await cookies();
  const cookieVal = jar.get("curso_id")?.value;
  if (cookieVal) {
    const n = Number(cookieVal);
    if (Number.isFinite(n)) return n;
  }
  const session = await auth();
  return Number((session?.user as any)?.curso ?? 1);
}
