import { z } from "zod";
import { eStatus } from "../../../../types/ClientType";

const optionalDigits = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    const d = (v ?? "").replace(/\D/g, "");
    return d.length ? d : undefined;
  })
  .refine((v) => v === undefined || v.length >= 8, "Número inválido");

const optionalEmail = z
  .union([z.string().trim().email("E-mail inválido"), z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

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
