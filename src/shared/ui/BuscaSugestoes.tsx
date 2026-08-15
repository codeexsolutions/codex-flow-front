import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Loader2, Search, X } from "lucide-react";

import Suspenso from "@/shared/ui/Suspenso";

/**
 * Campo de busca com sugestões — o mesmo comportamento da busca de produtos da
 * nota, generalizado.
 *
 * O que faz dele diferente de um `<input>` com filtro: enquanto se digita, a
 * lupa vira um spinner e a lista só aparece quando a digitação para. O filtro é
 * local e instantâneo, então sem essa pausa curta a lista pisca e se reordena a
 * cada letra, e o olho não acompanha. Com ela, a busca vira um movimento só:
 * digita, carrega, aparece.
 *
 * O texto continua filtrando a tela por conta própria — escolher uma sugestão é
 * um atalho para o nome exato, não a única forma de buscar.
 */

export type Sugestao = {
  id: string;
  label: string;
  /** Linha de apoio: quantas notas, o documento, o que a tela tiver. */
  sub?: string;
};

type Props = {
  valor: string;
  onValor: (v: string) => void;
  /** Universo de onde saem as sugestões. O filtro por texto é feito aqui. */
  sugestoes: Sugestao[];
  onEscolher: (s: Sugestao) => void;
  placeholder?: string;
  "aria-label": string;
  className?: string;
  /** Quantas sugestões mostrar de uma vez. */
  limite?: number;
};

/** Espera antes de mostrar o resultado. Ver a nota no topo do arquivo. */
const ESPERA_MS = 180;

const BuscaSugestoes = ({
  valor,
  onValor,
  sugestoes,
  onEscolher,
  placeholder = "Buscar…",
  "aria-label": ariaLabel,
  className = "",
  limite = 8,
}: Props) => {
  const [procurando, setProcurando] = useState(false);
  const [indice, setIndice] = useState(0);
  const [focado, setFocado] = useState(false);

  const caixa = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const termo = valor.trim().toLowerCase();

  /* Enquanto `procurando`, a lista não é calculada: é o que faz a animação de
     carregamento aparecer em vez de o resultado saltar pronto. */
  const achados = useMemo(() => {
    if (!termo || procurando) return [];
    return sugestoes.filter((s) => s.label.toLowerCase().includes(termo)).slice(0, limite);
  }, [sugestoes, termo, procurando, limite]);

  /* Cada tecla reinicia a espera — só para de "procurar" quando a digitação
     para. */
  useEffect(() => {
    if (!termo) {
      setProcurando(false);
      return;
    }

    setProcurando(true);
    const t = setTimeout(() => setProcurando(false), ESPERA_MS);

    return () => clearTimeout(t);
  }, [termo]);

  /* Termo novo, cursor de volta ao topo: manter o índice antigo deixaria o
     destaque num item que não existe mais na lista. */
  useEffect(() => setIndice(0), [termo]);

  const escolher = (s: Sugestao) => {
    onEscolher(s);
    setFocado(false);
    input.current?.blur();
  };

  const limpar = () => {
    onValor("");
    input.current?.focus();
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (valor) onValor("");
      else input.current?.blur();
      return;
    }

    if (achados.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => (i + 1) % achados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => (i - 1 + achados.length) % achados.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const alvo = achados[indice] ?? achados[0];
      if (alvo) escolher(alvo);
    }
  };

  const abrir = focado && Boolean(termo) && !procurando && achados.length > 0;

  return (
    <div ref={caixa} className={`relative ${className}`}>
      <div
        className={`flex h-[38px] items-center gap-2 rounded-xl border bg-fg/[0.04] pl-3 pr-1.5 transition-colors ${
          focado ? "border-accent/60" : "border-fg/[0.08] hover:border-fg/[0.16]"
        }`}
      >
        {/* O ícone vira spinner enquanto procura: o mesmo lugar responde pela
            busca parada e pela busca em andamento, sem a linha pular de
            largura. */}
        <span className="grid h-4 w-4 shrink-0 place-items-center">
          <AnimatePresence mode="wait" initial={false}>
            {procurando ? (
              <motion.span key="load" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>
                <Loader2 size={14} className="animate-spin text-accent-soft" />
              </motion.span>
            ) : (
              <motion.span key="lupa" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>
                <Search size={14} className="text-muted" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <input
          ref={input}
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          onFocus={() => setFocado(true)}
          /* Sem `onBlur` fechando a lista: o clique numa sugestão tira o foco
             do campo antes de o `click` chegar, e a escolha se perderia. Quem
             fecha no clique fora é o `Suspenso`. */
          onKeyDown={aoTeclar}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-faint"
        />

        {/* A dica de teclado só aparece quando há o que escolher. */}
        {abrir && (
          <span className="hidden shrink-0 items-center gap-1 text-[10.5px] text-faint lg:flex">
            <CornerDownLeft size={10} /> escolhe
          </span>
        )}

        {valor && (
          <button
            type="button"
            onClick={limpar}
            aria-label="Limpar busca"
            className="focus-ring grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-lg text-faint transition-colors hover:bg-fg/[0.08] hover:text-ink"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Barra de progresso fina sob o campo — o "procurando". */}
      <AnimatePresence>
        {procurando && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-3 top-full mt-0.5 h-[2px] overflow-hidden rounded-full bg-fg/[0.06]">
            <motion.div className="h-full w-1/3 rounded-full bg-accent" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} />
          </motion.div>
        )}
      </AnimatePresence>

      <Suspenso aberto={abrir} onFechar={() => setFocado(false)} ancora={caixa} largura="ancora" alturaMax={280}>
        <ul>
          {achados.map((s, i) => (
            <motion.li key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.025 * i, duration: 0.14, ease: "easeOut" }}>
              <button
                type="button"
                onClick={() => escolher(s)}
                onMouseEnter={() => setIndice(i)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  i === indice ? "bg-accent/[0.12]" : ""
                }`}
              >
                <span className="min-w-0 truncate text-[12.5px] text-ink">{s.label}</span>
                {s.sub && <span className="shrink-0 text-[11px] tabular-nums text-faint">{s.sub}</span>}
              </button>
            </motion.li>
          ))}
        </ul>
      </Suspenso>
    </div>
  );
};

export default BuscaSugestoes;
