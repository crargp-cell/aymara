import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CondorFlotante } from "@/components/mascota/CondorFlotante";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any)?.role;
  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <MobileNav role={role} />
      <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">{children}</main>
      {/* El cóndor acompaña sólo a quien está aprendiendo; al administrador,
          que supervisa y no cursa, no le pinta nada en la esquina. */}
      {role !== "admin" && <CondorFlotante />}
    </div>
  );
}
