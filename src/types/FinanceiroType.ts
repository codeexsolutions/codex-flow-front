export type ParcelaType = {
  id: string;
  numero_parcela: number;
  valor: number;
  vencimento: string;
  status: "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO";
  forma_pagamento: string | null;
  data_pagamento: string | null;
  pedido_id: string;
  codigo_pedido: string;
  cliente_id: string;
  cliente_nome: string;
};

export type MovimentacaoType = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  categoria: string | null;
  descricao: string;
  valor: number;
  data_movimentacao: string;
};

export type NovaParcelaType = {
  pedidoId: string;
  numeroParcela: number;
  valor: number;
  vencimento: string;
};

export type NovaMovimentacaoType = {
  tipo: "ENTRADA" | "SAIDA";
  categoria?: string;
  descricao: string;
  valor: number;
  dataMovimentacao: string;
};

export type ResumoFinanceiroType = {
  totalAReceber: number;
  totalRecebido: number;
  totalAtrasado: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoCaixa: number;
};
