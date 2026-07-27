export type clientePedido = {
  clienteId: string;
  nomeCliente: string;
  statusCliente: string;
  pedido: pedidoCliente;
  codigoEmpresa: string;
};

export type pedidoCliente = {
  pedidoId: string;
  totalPedido: number;
  dataPedido: Date;
  pedidoStatus: string;
  itensPedido: itemPedido[];
  produtosPedido?: itemPedido[];
};


export type itemPedido = {
  itemPedidoId: string;
  quantidadeItem: number;
  valorVendaItem: number;
  subtotalItens: number;
  produto: produtoPedido;
};

export type produtosPedido = {
  itemPedidoId: string;
  quantidadeItem: number;
  valorVendaItem: number;
  subtotalItens: number;
  produto: produtoPedido;
};

export type produtoPedido = {
  produtoId: string;
  nomeProduto: string;
  valorProduto: number;
};

export type pedidoUpdate = {
  clienteId: string;
  codigoEmpresa?: string;
  produtosPedido: itemUpdate[];
};

export type itemUpdate = {
  produtoId: string;
  quantidade: number;
  valorVenda: number;
};

