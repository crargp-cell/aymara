import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";

export default async function DictionaryPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const page = Number(sp.page ?? 1);
  const perPage = 20;
  const where = q ? { OR: [{ aymara: { contains: q, mode: "insensitive" as const } }, { espanol: { contains: q, mode: "insensitive" as const } }], activo: true } : { activo: true };
  const [words, total] = await Promise.all([
    prisma.diccionario.findMany({ where, take: perPage, skip: (page - 1) * perPage, orderBy: { id: "asc" } }),
    prisma.diccionario.count({ where }),
  ]);

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
          <CardTitle className="text-base">Resultados ({words.length}/{total})</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {words.map((w) => (
            <div key={w.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{w.aymara}</p>
                <p className="text-xs text-muted-foreground">{w.espanol}</p>
              </div>
              <span className="text-xs text-muted-foreground">{w.categoria}</span>
            </div>
          ))}
          {words.length === 0 && <p className="text-sm text-muted-foreground col-span-3">Sin resultados</p>}
        </CardContent>
      </Card>
    </div>
  );
}
