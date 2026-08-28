"use client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cerrarSesion } from "@/lib/auth-actions";

export function LogoutButton() {
  return (
    <form action={cerrarSesion}>
      <Button type="submit" variant="ghost" className="w-full justify-start gap-3 px-3">
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </Button>
    </form>
  );
}
