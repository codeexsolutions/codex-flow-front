import { novoPedidoDto, pedidoUpdate } from "../types/InvoiceType";
import sysgrafix from "./sysgrafix.service";

const NoteService = {
  create: (note: novoPedidoDto) => sysgrafix.post("/pedidos/novo-pedido", note),

  getAll: () => sysgrafix.get("/pedidos/"),
  getById: (pedidoId: string) => sysgrafix.get(`/pedidos/${pedidoId}`).then(({ data }) => data.data),

  update: (data: pedidoUpdate, pedidoId: string) => sysgrafix.patch(`/pedidos/alterar/${pedidoId}`, data),

  delete: (pedidoId: string) => sysgrafix.delete(`/pedidos/${pedidoId}`),
};

export default NoteService;
