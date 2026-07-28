type ProductType = {
  id: string;
  nome: string;
  valorCompra: number;
  valorVenda: number;
  imagem: string;
  descricao: string;
  quantidade: number;
  codigoEmpresa: string;
};

/**
 * Payload de criação: `id` e `codigoEmpresa` são gerados pelo backend
 * (o último derivado do token), então o formulário não os envia.
 * `descricao` e `imagem` são opcionais no formulário.
 */
export type NovoProdutoDto = Omit<ProductType, "id" | "codigoEmpresa" | "descricao" | "imagem"> & {
  descricao?: string;
  imagem?: string;
};

/** Payload de alteração: identifica pelo `id` e aceita campos parciais. */
export type ProdutoUpdateDto = Partial<Omit<ProductType, "id">> & {
  id: string;
};

export default ProductType;
