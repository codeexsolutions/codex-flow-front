import type { NovoPedidoDto, PedidoUpdateDto } from "@/shared/domain/pedido";
import type { PedidoClienteType } from "@/shared/domain/pedido";
import sysgrafix from "@/shared/api/sysgrafix";
import { unwrapList } from "@/shared/api/types";

const NoteService = {
  /** Cria novo pedido → POST /pedidos/novo-pedido */
  create: (note: NovoPedidoDto) => sysgrafix.post("/pedidos/novo-pedido", note),

  /** Lista todos os pedidos → GET /pedidos/ */
  getAll: () => sysgrafix.get("/pedidos/"),

  /**
   * Busca pedido por ID → GET /pedidos/:id
   * Retorno: { statusCode, message, data: [clientePedido] }
   */
  getById: async (pedidoId: string) => await sysgrafix.get(`/pedidos/${pedidoId}`).then(({ data }) => data.data),

  /**
   * Altera pedido → PATCH /pedidos/alterar/:id
   * O controller lê `data.itensPedido` do body
   */
  update: async (data: PedidoUpdateDto, pedidoId: string) => {
    return await sysgrafix.patch(`/pedidos/alterar/${pedidoId}`, {
      clienteId: data.clienteId,
      itensPedido: data.itensPedido,
    });
  },

  /** Exclui pedido */
  delete: (pedidoId: string) => sysgrafix.delete(`/pedidos/${pedidoId}`),
};

export default NoteService;
