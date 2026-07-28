import { z } from "zod";
import { eStatus } from "@/shared/domain/cliente";
import { optionalDigits, optionalEmail } from "@/shared/validation/fields";

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do cliente"),
  cpfCnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "CPF ou CNPJ inválido"),
  status: z.nativeEnum(eStatus),
  contato: z
    .object({
      telefone: optionalDigits,
      celular: optionalDigits,
      whatsapp: optionalDigits,
      email: optionalEmail,
    })
    .optional(),
});

export type ClienteFormInput = z.input<typeof clienteSchema>;
export type ClienteFormData = z.output<typeof clienteSchema>;
