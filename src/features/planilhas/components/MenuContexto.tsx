import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type ItemMenu = {
  id: string;
  rotulo: string;
  icone?: LucideIcon;
  onClick: () => void;
  /** Separador ANTES deste item. Agrupa sem exigir um tipo próprio de item. */
  separar?: boolean;
  perigo?: boolean;
  desabilitado?: boolean;
};

type Props = {
  x: number;
  y: number;
  itens: ItemMenu[];
  /** Linha de contexto no topo: "Prazo · linha 3". */
  titulo?: string;
  onFechar: () => void;
};

/**
 * Menu do botão direito da planilha.
 *
 * O menu nativo do navegador oferece "recarregar" e "ver código-fonte" — nada
 * que sirva para quem está olhando uma célula. As ações que fazem sentido ali
 * (o histórico daquela célula, limpar, excluir a linha) não tinham lugar
 * nenhum: estavam num modal que mostra a planilha inteira, ou não existiam.
 *
 * ---------------------------------------------------------------------
 * Por que a posição é corrigida depois de medir
 * ---------------------------------------------------------------------
 * Abrir sempre em (x, y) faz o menu vazar pela direita e por baixo quando o
 * clique é perto da borda — e a última opção da lista, que costuma ser a mais
 * destrutiva, fica fora da tela. Medir depois de montar e espelhar para o outro
 * lado é o que qualquer menu nativo faz, e é barato: uma passada de layout.
 */
const MenuContexto = ({ x, y, itens, titulo, onFechar }: Props) => {
  const caixa = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y, pronto: false });

  useLayoutEffect(() => {
    const el = caixa.current;

    if (!el) return;

    const { width, height } = el.getBoundingClientRect();
    const margem = 8;

    setPos({
      x: x + width + margem > window.innerWidth ? Math.max(margem, x - width) : x,
      y: y + height + margem > window.innerHeight ? Math.max(margem, y - height) : y,
      pronto: true,
    });
  }, [x, y]);

  useEffect(() => {
    /* `contextmenu` também fecha: clicar com o direito em outra célula deve
       mover o menu, não empilhar dois. */
    const fora = () => onFechar();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();

    document.addEventListener("mousedown", fora);
    document.addEventListener("contextmenu", fora);
    document.addEventListener("scroll", fora, true);
    document.addEventListener("keydown", tecla);

    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("contextmenu", fora);
      document.removeEventListener("scroll", fora, true);
      document.removeEventListener("keydown", tecla);
    };
  }, [onFechar]);

  return (
    <AnimatePresence>
      <motion.div
        ref={caixa}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: pos.pronto ? 1 : 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
        /* `onMouseDown` parado aqui: sem isso o ouvinte de "clique fora" fecha o
           menu antes de o clique chegar no item. */
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        style={{ left: pos.x, top: pos.y, transformOrigin: "top left" }}
        className="fixed z-[100] min-w-[13rem] overflow-hidden rounded-xl border border-fg/[0.1] bg-surface py-1 shadow-2xl backdrop-blur"
      >
        {titulo && (
          <p className="truncate border-b border-fg/[0.06] px-3 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.1em] text-faint">
            {titulo}
          </p>
        )}

        {itens.map((item) => {
          const Icone = item.icone;

          return (
            <div key={item.id}>
              {item.separar && <div className="my-1 h-px bg-fg/[0.06]" />}

              <button
                onClick={() => {
                  if (item.desabilitado) return;

                  onFechar();
                  item.onClick();
                }}
                disabled={item.desabilitado}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition-colors disabled:opacity-40 ${
                  item.perigo ? "text-danger hover:bg-danger/10" : "text-mist hover:bg-fg/[0.06] hover:text-ink"
                }`}
              >
                {Icone && <Icone size={13} className="shrink-0" />}
                {item.rotulo}
              </button>
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};

export default MenuContexto;
