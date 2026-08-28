import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import type { Prisma } from "@/generated/prisma/client";

export default async function DictionaryPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));
  const perPage = 20;
  // Tipado explícito: sin él, TypeScript no comprueba las propiedades de un
  // `where` construido en una variable y los campos obsoletos sólo fallan en runtime.
  const where: Prisma.DiccionarioWhereInput = {
    estado: "activo",
    ...(q
      ? {
          OR: [
            { aymara: { contains: q, mode: "insensitive" } },
            { espanol: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [words, total] = await Promise.all([
    prisma.diccionario.findMany({ where, take: perPage, skip: (page - 1) * perPage, orderBy: { id: "asc" } }),
    prisma.diccionario.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <Topbar title="Diccionario" subtitle={`${total} palabras · búsqueda aymara ↔ español`} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buscar</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2">
            <Input name="q" placeholder="Buscar aymara o español..." defaultValue={q} />
            <Button type="submit">Buscar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados ({words.length} de {total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {words.map((w) => (
              <div key={w.id} className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{w.aymara}</p>
                  <p className="text-xs text-muted-foreground truncate">{w.espanol}</p>
                </div>
                {w.categoria && <span className="text-xs text-muted-foreground shrink-0">{w.categoria}</span>}
              </div>
            ))}
            {words.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Sin resultados</p>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <a href={`/dictionary?q=${encodeURIComponent(q)}&page=${page - 1}`} className={page <= 1 ? "pointer-events-none" : ""}>
                <Button variant="outline" size="sm" disabled={page <= 1}>Anterior</Button>
              </a>
              <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
              <a href={`/dictionary?q=${encodeURIComponent(q)}&page=${page + 1}`} className={page >= totalPages ? "pointer-events-none" : ""}>
                <Button variant="outline" size="sm" disabled={page >= totalPages}>Siguiente</Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
