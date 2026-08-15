import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

import Suspenso from "@/shared/ui/Suspenso";

/**
 * Seletor do sistema.
 *
 * O `<select>` do navegador não tem conserto: a lista é desenhada pelo sistema
 * operacional, ignora o tema (fundo branco no modo escuro), não aceita
 * contagem nem marcador ao lado da opção, e fica com uma seta cinza que não é
 * de lugar nenhum. Nas telas de filtro isso aparece — dois seletores nativos ao
 * lado de botões do tema pareciam pedaços de outro site.
 *
 * Este mantém a semântica de um seletor (rótulo, opção marcada, teclado
 * completo) e o desenho do resto do sistema. A lista abre por `Suspenso`, então
 * funciona dentro de cartão com `overflow-hidden` — que é justamente onde os
 * filtros ficam.
 */

export type OpcaoSelect = {
  valor: string;
  label: string;
  /** Quantos registros a opção deixa passar — some quando não vem. */
  contagem?: number;
  /**
   * Ponto de alerta ao lado do rótulo. Só quando há motivo de verdade: um
   * aviso sempre aceso deixa de ser aviso em uma semana.
   */
  alerta?: boolean;
};

type Props = {
  valor: string;
  onChange: (v: string) => void;
  opcoes: OpcaoSelect[];
  /** Ícone à esquerda, dentro do botão. */
  icone?: ReactNode;
  /** O que aparece quando a opção escolhida não tem rótulo próprio. */
  placeholder?: string;
  "aria-label": string;
  /** Largura do botão. A lista acompanha. */
  className?: string;
};

const Select = ({ valor, onChange, opcoes, icone, placeholder = "Selecionar", "aria-label": ariaLabel, className = "" }: Props) => {
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const botao = useRef<HTMLButtonElement>(null);

  const escolhida = opcoes.find((o) => o.valor === valor);
  const temAlerta = opcoes.some((o) => o.alerta && o.valor !== valor);

  /* Ao abrir, o cursor do teclado começa na opção que já está marcada — e não
     no topo, que faria a primeira seta pular para longe do valor atual. */
  useEffect(() => {
    if (aberto) setIndice(Math.max(0, opcoes.findIndex((o) => o.valor === valor)));
  }, [aberto, opcoes, valor]);

  const escolher = (v: string) => {
    onChange(v);
    setAberto(false);
    botao.current?.focus();
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setAberto(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => (i + 1) % opcoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => (i - 1 + opcoes.length) % opcoes.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const alvo = opcoes[indice];
      if (alvo) escolher(alvo.valor);
    } else if (e.key === "Tab") {
      setAberto(false);
    }
  };

  return (
    <>
      <button
        ref={botao}
        type="button"
        role="combobox"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setAberto((v) => !v)}
        onKeyDown={aoTeclar}
        className={`focus-ring flex h-[38px] cursor-pointer items-center gap-2 rounded-xl border bg-fg/[0.04] px-3 text-[12.5px] transition-colors ${
          aberto ? "border-accent/60 text-ink" : "border-fg/[0.08] text-mist hover:border-fg/[0.16] hover:text-ink"
        } ${className}`}
      >
        {icone && <span className="shrink-0 text-muted">{icone}</span>}

        <span className="min-w-0 flex-1 truncate text-left">{escolhida?.label ?? placeholder}</span>

        {/* O ponto sobe para o botão quando o alerta está numa opção fechada:
            fechado, o seletor é a única coisa visível do filtro. */}
        {temAlerta && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}

        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
      </button>

      <Suspenso aberto={aberto} onFechar={() => setAberto(false)} ancora={botao} largura="ancora" alturaMax={320}>
        <ul role="listbox" aria-label={ariaLabel}>
          {opcoes.map((o, i) => {
            const marcada = o.valor === valor;

            return (
              <li key={o.valor} role="option" aria-selected={marcada}>
                <button
                  type="button"
                  onClick={() => escolher(o.valor)}
                  onMouseEnter={() => setIndice(i)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                    i === indice ? "bg-accent/[0.12] text-ink" : "text-mist"
                  }`}
                >
                  <span className={`grid h-4 w-4 shrink-0 place-items-center ${marcada ? "text-accent-soft" : "text-transparent"}`}>
                    <Check size={13} />
                  </span>

                  <span className="min-w-0 flex-1 truncate">{o.label}</span>

                  {o.alerta && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}

                  {o.contagem !== undefined && (
                    <span className={`shrink-0 tabular-nums text-[11.5px] ${marcada ? "text-accent-soft" : "text-faint"}`}>{o.contagem}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Suspenso>
    </>
  );
};

export default Select;
