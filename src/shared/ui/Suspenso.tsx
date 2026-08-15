import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Painel que abre ancorado a um elemento — a base dos menus suspensos.
 *
 * Existe por um motivo prático: quase todo lugar onde se quer um dropdown está
 * dentro de um cartão com `overflow-hidden` ou de um corpo com
 * `overflow-y-auto`. Um painel `absolute` ali é recortado pela moldura — as
 * opções existem no DOM e simplesmente não aparecem. Aqui ele vai para um
 * **portal no `body`** e se posiciona em coordenadas de tela.
 *
 * Cuida do que todo menu precisa e ninguém lembra: fechar no clique fora, no
 * Esc e ao rolar a página, virar para cima quando não há espaço embaixo, e não
 * vazar pelas bordas da janela.
 *
 * É headless: o conteúdo é de quem chama. Ver `Select` e `BuscaSugestoes`.
 */

type Props = {
  aberto: boolean;
  onFechar: () => void;
  /** O elemento ao qual o painel se cola. */
  ancora: RefObject<HTMLElement>;
  children: ReactNode;
  /** `"ancora"` copia a largura do elemento; um número fixa em px. */
  largura?: "ancora" | number;
  /** Por qual borda alinhar quando a largura é fixa. */
  alinhar?: "inicio" | "fim";
  /** Altura máxima antes de o painel rolar por dentro. */
  alturaMax?: number;
  className?: string;
};

const MARGEM = 8;
const FOLGA = 6;

const Suspenso = ({ aberto, onFechar, ancora, children, largura = "ancora", alinhar = "inicio", alturaMax = 300, className = "" }: Props) => {
  const painel = useRef<HTMLDivElement>(null);
  const [caixa, setCaixa] = useState<{ left: number; width: number; top?: number; bottom?: number; paraCima: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!aberto) return;

    const posicionar = () => {
      const r = ancora.current?.getBoundingClientRect();
      if (!r) return;

      const width = largura === "ancora" ? r.width : largura;
      const bruto = alinhar === "fim" ? r.right - width : r.left;
      const left = Math.max(MARGEM, Math.min(bruto, window.innerWidth - width - MARGEM));

      /* Perto do rodapé o painel sobe. Sem isto, o filtro da última linha
         visível abriria metade da lista fora da janela. */
      const espacoAbaixo = window.innerHeight - r.bottom;
      const paraCima = espacoAbaixo < Math.min(alturaMax, 180) && r.top > espacoAbaixo;

      setCaixa(
        paraCima
          ? { left, width, bottom: window.innerHeight - r.top + FOLGA, paraCima }
          : { left, width, top: r.bottom + FOLGA, paraCima },
      );
    };

    posicionar();

    /* `capture`: a rolagem que importa costuma ser a de um corpo interno, não
       a da janela — e essa não borbulha. */
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);

    return () => {
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  }, [aberto, ancora, largura, alinhar, alturaMax]);

  useEffect(() => {
    if (!aberto) return;

    const aoClicar = (ev: MouseEvent) => {
      const alvo = ev.target as Node;

      /* O painel está no portal, fora da árvore da âncora: sem checar as duas
         referências, clicar numa opção contaria como clique fora e o painel
         sumiria antes de o `click` chegar nela. */
      if (ancora.current?.contains(alvo) || painel.current?.contains(alvo)) return;

      onFechar();
    };

    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onFechar();
    };

    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, ancora, onFechar]);

  return createPortal(
    <AnimatePresence>
      {aberto && caixa && (
        <motion.div
          ref={painel}
          initial={{ opacity: 0, y: caixa.paraCima ? 4 : -6, scaleY: 0.94 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: caixa.paraCima ? 2 : -4, scaleY: 0.97 }}
          transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.6 }}
          style={{
            position: "fixed",
            left: caixa.left,
            top: caixa.top,
            bottom: caixa.bottom,
            width: caixa.width,
            maxHeight: alturaMax,
            transformOrigin: caixa.paraCima ? "bottom" : "top",
          }}
          className={`z-[120] overflow-y-auto rounded-xl border border-fg/[0.1] bg-surface p-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Suspenso;
