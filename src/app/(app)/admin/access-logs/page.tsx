import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";

const PAGE_SIZE = 25;

export default async function AccessLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({ orderBy: { created_at: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.accessLog.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <Topbar title="Registro de accesos" subtitle={`${total} eventos registrados`} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos (página {page}/{totalPages})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((l) => (
            <div key={l.id.toString()} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-sm">
              <div className="flex-1">
                <p className="font-medium">{l.username ?? l.email ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {l.path} · {l.method} · {l.ip} · {l.created_at.toISOString().replace("T", " ").slice(0, 19)}
                </p>
                {l.message && <p className="text-xs text-muted-foreground">{l.message}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{l.action}</Badge>
                <Badge variant={l.status >= 200 && l.status < 300 ? "success" : "destructive"}>{l.status}</Badge>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>}
          <div className="flex justify-between pt-2">
            <Link href={`/admin/access-logs?page=${Math.max(1, page - 1)}`}>
              <Button variant="outline" size="sm" disabled={page <= 1}>
                ← Anterior
              </Button>
            </Link>
            <Link href={`/admin/access-logs?page=${Math.min(totalPages, page + 1)}`}>
              <Button variant="outline" size="sm" disabled={page >= totalPages}>
                Siguiente →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
