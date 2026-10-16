import type { DefaultSession } from "next-auth";
import type { UsuariosRoleEnum } from "@/generated/prisma/enums";

/*
  Auth.js no conoce el rol del sistema (maestro/estudiante/admin): se amplía
  aquí el tipo que ya se usa en `auth.config.ts`/`auth.ts` (antes iba con
  `any`, sin esta declaración TypeScript no tiene de dónde sacar `user.role`).

  Se augmenta "@auth/core/types" y no "next-auth": el paquete `next-auth` sólo
  re-exporta `export type { User, Session } from "@auth/core/types"`, así que
  aumentar el módulo "next-auth" crearía una interfaz nueva y separada en vez
  de extender la que de verdad usan los callbacks internamente. `JWT` no hace
  falta declararla — ya extiende `Record<string, unknown>` en @auth/core.
*/
declare module "@auth/core/types" {
  interface User {
    role: UsuariosRoleEnum;
  }

  interface Session {
    user: {
      role: UsuariosRoleEnum;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UsuariosRoleEnum;
    /** id numérico de `usuarios`, como string (igual que `User.id`). */
    uid?: string;
  }
}
