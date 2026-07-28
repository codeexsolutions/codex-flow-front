import { z } from "zod";

export const productSchema = z.object({
  nome: z.string().min(3, "Informe o nome do produto"),

  valorCompra: z.coerce.number().min(0, "Valor inválido"),

  valorVenda: z.coerce.number().min(0, "Valor inválido"),

  quantidade: z.coerce.number().min(0, "Quantidade inválida"),

  descricao: z.string().optional(),

  imagem: z.string().optional(),
});

/**
 * `z.coerce.number()` aceita string na entrada (o que o input HTML devolve) e
 * garante number na saída — por isso entrada e saída são tipos distintos.
 */
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormData = z.output<typeof productSchema>;
