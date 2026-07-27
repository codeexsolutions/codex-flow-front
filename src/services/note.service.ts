import { novoPedidoDto, pedidoUpdate } from "../types/InvoiceType";
import sysgrafix from "./sysgrafix.service";
import { NovoPedidoType } from "../types/InvoiceType";

const NoteService = {
  create: (note: NovoPedidoType | Record<string, unknown>) => sysgrafix.post("/pedidos/novo-pedido", note),

  getAll: () => sysgrafix.get("/pedidos/"),
  getById: (pedidoId: string) => sysgrafix.get(`/pedidos/${pedidoId}`).then(({ data }) => data.data),

  getById: async (pedidoId: string) => {
    
    const response = await sysgrafix.get<any>(`/pedidos/${pedidoId}`) 
    const pedido = response.data;
    return pedido.data;
  },

  update: async (note: Record<string, unknown>, pedidoId: string) => sysgrafix.patch(`/pedidos/alterar/${pedidoId}`, note),

  delete: (pedidoId: string) => sysgrafix.delete(`/pedidos/${pedidoId}`),
};

export default NoteService;
