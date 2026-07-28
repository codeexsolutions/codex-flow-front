import { z } from "zod";
import { onlyDigits } from "../../../utils/format";

const optionalPhone = z.string().refine((v) => {
  const d = onlyDigits(v);
  return d === "" || d.length === 10 || d.length === 11;
}, "Número inválido");

export const profileSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
  phone: optionalPhone,
  role: z.string().optional().default(""),
});

export type ProfileData = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual"),
    next: z.string().min(6, "Mínimo de 6 caracteres"),
    confirm: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.next === d.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem",
  });

export type PasswordData = z.infer<typeof passwordSchema>;
