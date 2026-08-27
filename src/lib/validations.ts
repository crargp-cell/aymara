import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido").max(50),
  password: z.string().min(1, "Contraseña requerida"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(50)
    .regex(/^[a-zA-Z0-9_\s]+$/, "Solo letras, números, espacios y guión bajo"),
  email: z.string().email("Email inválido").max(100).optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe tener mayúscula")
    .regex(/[a-z]/, "Debe tener minúscula")
    .regex(/[0-9]/, "Debe tener número")
    .regex(/[^A-Za-z0-9]/, "Debe tener símbolo"),
  curso: z.coerce.number().int().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
