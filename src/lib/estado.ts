import type { EstadoContenido, EstadoAlumno } from "@/generated/prisma/enums";

export function badgeVariantContenido(estado: EstadoContenido): "success" | "secondary" | "warning" | "destructive" {
  switch (estado) {
    case "activo":
      return "success";
    case "inactivo":
      return "secondary";
    case "deshabilitado":
      return "warning";
    default:
      return "destructive";
  }
}

export function badgeVariantAlumno(estado: EstadoAlumno): "success" | "secondary" | "warning" | "destructive" {
  switch (estado) {
    case "activo":
    case "reincorporado":
      return "success";
    case "inactivo":
      return "secondary";
    case "promovido":
    case "trasladado":
      return "warning";
    default:
      return "destructive";
  }
}

/** Alterna un estado activo/inactivo conservando los estados administrativos. */
export function toggleEstado(estado: EstadoContenido): EstadoContenido {
  return estado === "activo" ? "inactivo" : "activo";
}
