import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AccessLogsActionEnum } from "@/generated/prisma/enums";

type LogInput = {
  action: AccessLogsActionEnum;
  path: string;
  userId?: number | null;
  username?: string | null;
  email?: string | null;
  method?: string;
  status?: number;
  message?: string;
};

/**
 * Registra una acción en `access_logs`. Fire-and-forget: nunca debe romper la
 * request que la origina. Antes sólo se escribía `login_success`.
 */
export async function logAccess(input: LogInput): Promise<void> {
  try {
    let ip = "0.0.0.0";
    let ua: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";
      ua = h.get("user-agent");
    } catch {
      /* headers() no disponible fuera de request scope */
    }
    await prisma.accessLog.create({
      data: {
        user_id: input.userId != null ? BigInt(input.userId) : null,
        username: input.username ?? null,
        email: input.email ?? null,
        action: input.action,
        path: input.path.slice(0, 255),
        method: input.method ?? "POST",
        ip: ip.slice(0, 45),
        user_agent: ua,
        status: input.status ?? 200,
        message: input.message?.slice(0, 255) ?? null,
      },
    });
  } catch {
    /* ignore */
  }
}
