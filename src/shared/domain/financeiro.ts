export type NotaFinanceiroType = {
  pedido_id: string;
  codigo_pedido: string;
  total: number;
  status: string;
  data_pedido: string;
  valor_pago: number;
  status_pagamento: "PENDENTE" | "PAGO";
  /** A forma do ÚLTIMO recebimento — resumo, não a verdade completa. */
  forma_pagamento: string | null;
  /**
   * Quanto entrou por forma, nesta nota.
   *
   * Existe porque `forma_pagamento` guarda só a última: uma venda recebida
   * metade no Pix e metade em dinheiro entrava inteira em dinheiro no gráfico
   * do caixa. Vem do extrato de recebimentos (migration 050), somado por
   * forma e ordenado da maior para a menor.
   */
  formas: { forma: string; valor: number }[];
  /** Quantos lançamentos compõem o `valor_pago`. */
  recebimentos: number;
  data_pagamento: string | null;
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
  recebidoPorFormaPagamento: { formaPagamento: string; valor: number }[];
};
