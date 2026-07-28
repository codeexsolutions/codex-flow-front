import type { NovoPedidoDto, PedidoUpdateDto } from "@/shared/domain/pedido";
import sysgrafix from "@/shared/api/sysgrafix";

const NoteService = {
  create: (note: NovoPedidoDto) => sysgrafix.post("/pedidos/novo-pedido", note),

  getAll: () => sysgrafix.get("/pedidos/"),
  getById: (pedidoId: string) => sysgrafix.get(`/pedidos/${pedidoId}`).then(({ data }) => data.data),

  update: async (data: PedidoUpdateDto, pedidoId: string) => await sysgrafix.patch(`/pedidos/alterar/${pedidoId}`, data),

  delete: (pedidoId: string) => sysgrafix.delete(`/pedidos/${pedidoId}`),
};

export default NoteService;
