import sysgrafix from "@/shared/api/sysgrafix";
import type { NovoProdutoDto, ProdutoUpdateDto } from "@/shared/domain/produto";

const ProductService = {
  getAll: async (params?: { name?: string; category?: string }) => await sysgrafix.get("/produtos", { params }),

  create: async (data: NovoProdutoDto) => await sysgrafix.post("/produtos/cadastrar", data),

  /**
   * ATENÇÃO: diferente de clientes e pedidos, este endpoint não recebe o `id`
   * na URL — ele vai no corpo. Comportamento preservado do código original por
   * não ser possível validar o contrato do backend daqui. Se a API na verdade
   * espera `/produtos/alterar/{id}`, esta é a linha a ajustar.
   */
  update: async (data: ProdutoUpdateDto) => await sysgrafix.patch(`/produtos/alterar/`, data),

  /**
   * Devolve a frase do servidor, e não só a resposta crua.
   *
   * Excluir tem dois desfechos: o produto some de vez (nunca foi vendido) ou
   * sai do estoque e continua nos pedidos em que apareceu. Quem apaga precisa
   * saber em qual dos dois caiu — a tela dizer sempre "excluído" faria a pessoa
   * procurar o produto no histórico achando que sumiu de lá também.
   */
  remove: async (id: string): Promise<string> => {
    const { data } = await sysgrafix.delete(`/produtos/${id}`);

    return data?.message ?? "Produto excluído.";
  },
};

export default ProductService;
