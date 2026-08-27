"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button variant="ghost" className="w-full justify-start gap-3 px-3" onClick={() => signOut({ callbackUrl: "/login" })}>
      <LogOut className="h-4 w-4" /> Cerrar sesión
    </Button>
  );
}
