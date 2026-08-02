import { create } from "zustand";

export type ModoTransicao = "entrada" | "saida";

type Estado = {
  modo: ModoTransicao | null;
  nome: string;
  /** Resolve quando a animação termina — é o que segura o fluxo. */
  resolver: (() => void) | null;

  /** Toca a transição e só resolve quando ela acabar. */
  tocar: (modo: ModoTransicao, nome: string) => Promise<void>;
  encerrar: () => void;
};

/**
 * Estado da transição de sessão, fora das telas.
 *
 * Precisa viver acima do roteador: no logout, a tela que disparou a animação é
 * justamente a que o roteador desmonta ao perder a sessão. Se o overlay
 * morasse nela, o efeito sumiria no primeiro frame.
 */
const useTransicao = create<Estado>((set, get) => ({
  modo: null,
  nome: "",
  resolver: null,

  tocar: (modo, nome) =>
    new Promise<void>((resolver) => {
      set({ modo, nome, resolver });
    }),

  encerrar: () => {
    get().resolver?.();
    set({ modo: null, resolver: null });
  },
}));

export default useTransicao;
