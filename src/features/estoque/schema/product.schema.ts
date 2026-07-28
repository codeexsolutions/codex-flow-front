import { z } from "zod";

export const productSchema = z.object({
  nome: z.string().min(3, "Informe o nome do produto"),

  valorCompra: z.coerce.number().min(0, "Valor inválido"),

  valorVenda: z.coerce.number().min(0, "Valor inválido"),

  quantidade: z.coerce.number().min(0, "Quantidade inválida"),

  descricao: z.string().optional(),

  imagem: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
