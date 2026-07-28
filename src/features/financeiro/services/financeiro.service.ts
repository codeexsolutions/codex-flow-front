import sysgrafix from "@/shared/api/sysgrafix";
import { NovaMovimentacaoType, NovaParcelaType } from "@/shared/domain/financeiro";

const FinanceiroService = {
  getResumo: () => sysgrafix.get("/financeiro/resumo"),

  getParcelas: () => sysgrafix.get("/financeiro/parcelas"),
  criarParcela: (parcela: NovaParcelaType) => sysgrafix.post("/financeiro/parcelas", parcela),
  baixarParcela: (id: string, formaPagamento: string) => sysgrafix.patch(`/financeiro/parcelas/${id}/baixar`, { formaPagamento }),

  getMovimentacoes: () => sysgrafix.get("/financeiro/movimentacoes"),
  criarMovimentacao: (movimentacao: NovaMovimentacaoType) => sysgrafix.post("/financeiro/movimentacoes", movimentacao),
  excluirMovimentacao: (id: string) => sysgrafix.delete(`/financeiro/movimentacoes/${id}`),
};

export default FinanceiroService;
