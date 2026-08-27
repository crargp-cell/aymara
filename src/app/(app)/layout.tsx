import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ChatWidget } from "@/components/chat/ChatWidget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any)?.role;
  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <MobileNav role={role} />
      <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-auto">{children}</main>
      <ChatWidget />
    </div>
  );
}
