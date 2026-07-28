import { create } from "zustand";

import FinanceiroService from "@/features/financeiro/services/financeiro.service";
import NoteService from "@/features/vendas/services/note.service";
import type { MovimentacaoType, NovaMovimentacaoType, NovaParcelaType, ParcelaType, ResumoFinanceiroType } from "@/shared/domain/financeiro";
import { isPedidoValido, type PedidoClienteType } from "@/shared/domain/pedido";
import { unwrapList } from "@/shared/api/types";

export type PedidoOpcao = { pedidoId: string; nomeCliente: string; totalPedido: number };

interface FinanceiroState {
  resumo: ResumoFinanceiroType | null;
  parcelas: ParcelaType[];
  movimentacoes: MovimentacaoType[];
  pedidosDisponiveis: PedidoOpcao[];
  loading: boolean;
  error: string | null;
  carregado: boolean;

  fetchFinanceiro: (force?: boolean) => Promise<void>;
  criarParcela: (parcela: NovaParcelaType) => Promise<void>;
  baixarParcela: (id: string, formaPagamento: string) => Promise<void>;
  criarMovimentacao: (mov: NovaMovimentacaoType) => Promise<void>;
  excluirMovimentacao: (id: string) => Promise<void>;
}

const useFinanceiroStore = create<FinanceiroState>((set, get) => ({
  resumo: null,
  parcelas: [],
  movimentacoes: [],
  pedidosDisponiveis: [],
  loading: false,
  error: null,
  carregado: false,

  async fetchFinanceiro(force = false) {
    if (get().loading) return;
    if (get().carregado && !force) return;

    set({ loading: true, error: null });
    try {
      const [resResumo, resParcelas, resMovimentacoes, resPedidos] = await Promise.all([FinanceiroService.getResumo(), FinanceiroService.getParcelas(), FinanceiroService.getMovimentacoes(), NoteService.getAll()]);

      set({
        resumo: unwrapList<ResumoFinanceiroType>(resResumo.data)[0] ?? null,
        parcelas: unwrapList<ParcelaType>(resParcelas.data),
        movimentacoes: unwrapList<MovimentacaoType>(resMovimentacoes.data),
        pedidosDisponiveis: unwrapList<PedidoClienteType>(resPedidos.data)
          .filter(isPedidoValido)
          .map((p) => ({ pedidoId: p.pedido.pedidoId, nomeCliente: p.nomeCliente, totalPedido: p.pedido.totalPedido ?? 0 })),
        carregado: true,
      });
    } catch {
      set({ error: "Não foi possível carregar os dados financeiros." });
    } finally {
      set({ loading: false });
    }
  },

  async criarParcela(parcela) {
    await FinanceiroService.criarParcela(parcela);
    await get().fetchFinanceiro(true);
  },

  async baixarParcela(id, formaPagamento) {
    await FinanceiroService.baixarParcela(id, formaPagamento);
    await get().fetchFinanceiro(true);
  },

  async criarMovimentacao(mov) {
    await FinanceiroService.criarMovimentacao(mov);
    await get().fetchFinanceiro(true);
  },

  async excluirMovimentacao(id) {
    await FinanceiroService.excluirMovimentacao(id);
    await get().fetchFinanceiro(true);
  },
}));

export default useFinanceiroStore;
