import { create } from "zustand";

import ContaService, { type Conta, type ResumoContas } from "@/features/financeiro/services/conta.service";

/**
 * Contas a pagar e a receber, em um lugar só.
 *
 * Antes cada tela buscava por conta própria. Com "A pagar", "A receber" e a
 * Visão geral virando abas separadas, a mesma lista seria pedida três vezes ao
 * trocar de aba, e o número do topo piscaria a cada troca. Aqui a busca é uma:
 * quem chega depois lê o que já está carregado, e só o botão de atualizar (ou
 * um pagamento registrado) força ida nova ao servidor.
 */

interface ContasState {
  contas: Conta[];
  resumo: ResumoContas | null;
  carregando: boolean;
  carregado: boolean;

  fetchContas: (force?: boolean) => Promise<void>;
}

const useContasStore = create<ContasState>((set, get) => ({
  contas: [],
  resumo: null,
  carregando: false,
  carregado: false,

  async fetchContas(force = false) {
    if (get().carregando) return;
    if (get().carregado && !force) return;

    set({ carregando: true });

    try {
      /* Lista e resumo juntos: os dois alimentam a mesma tela, e buscar em
         dois momentos faria os números aparecerem em tempos diferentes. */
      const [contas, resumo] = await Promise.all([ContaService.listar(), ContaService.resumo()]);
      set({ contas, resumo, carregado: true });
    } catch {
      /* Falha aqui não derruba o resto: o caixa e os recebimentos continuam
         na tela, e as guias de contas mostram lista vazia. */
      set({ contas: [], carregado: true });
    } finally {
      set({ carregando: false });
    }
  },
}));

export default useContasStore;
