import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Users, UserRound, Package, ShoppingCart, Wallet, BarChart3, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CICLO_LABEL, type Plano } from "@/features/assinatura/types/assinatura.types";
import { formatCurrencyFromCents } from "@/shared/utils/currency";
import { formatNumber } from "@/shared/utils/format";

type Props = {
  planos: Plano[];
  selecionado: string;
  onSelecionar: (codigo: string) => void;
};

const limite = (v: number | null) => (v === null ? "Ilimitado" : formatNumber(v));

/** Mesmas linhas da página inicial, na mesma ordem — quem viu lá reconhece aqui. */
const linhas = (p: Plano): [string, boolean, LucideIcon][] => [
  [`${limite(p.limiteUsuarios)} ${p.limiteUsuarios === 1 ? "usuário" : "usuários"}`, true, Users],
  [`${limite(p.limiteClientes)} clientes`, true, UserRound],
  [`${limite(p.limiteProdutos)} produtos`, true, Package],
  [`${limite(p.limitePedidosMes)} pedidos por mês`, true, ShoppingCart],
  ["Módulo financeiro", Boolean(p.recursos?.financeiro), Wallet],
  ["Relatórios gerenciais", Boolean(p.recursos?.relatorios), BarChart3],
  ["Suporte por WhatsApp", Boolean(p.recursos?.suporteWhatsapp), MessageCircle],
];

/**
 * Escolha do plano em carrossel.
 *
 * Os cartões são os mesmos da página inicial — altos, com preço grande e a
 * lista inteira de recursos, inclusive os que o plano não tem, riscados. Empilhar
 * três desses num formulário de cinco etapas afundava o botão de continuar;
 * lado a lado eles não cabem na coluna. O carrossel resolve os dois: cartão
 * inteiro visível, um de cada vez, com o vizinho espiando na borda para deixar
 * claro que há mais.
 *
 * A rolagem é nativa com `scroll-snap` — funciona com dedo, trackpad e roda do
 * mouse sem JavaScript nenhum. As setas e os pontos são para quem usa mouse ou
 * teclado. O `<input type="radio">` continua real, só que escondido: é o que
 * mantém as setas do teclado e a validação do formulário funcionando.
 */
const CarrosselPlanos = ({ planos, selecionado, onSelecionar }: Props) => {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  /* Qual cartão está no centro — alimenta os pontos e o estado das setas. */
  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;

    const aoRolar = () => {
      const meio = trilho.scrollLeft + trilho.clientWidth / 2;
      const filhos = Array.from(trilho.children) as HTMLElement[];

      let maisProximo = 0;
      let menorDistancia = Infinity;

      filhos.forEach((filho, i) => {
        const centro = filho.offsetLeft + filho.offsetWidth / 2;
        const d = Math.abs(centro - meio);

        if (d < menorDistancia) {
          menorDistancia = d;
          maisProximo = i;
        }
      });

      setAtivo(maisProximo);
    };

    trilho.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();

    return () => trilho.removeEventListener("scroll", aoRolar);
  }, [planos.length]);

  const irPara = (i: number) => {
    const trilho = trilhoRef.current;
    const alvo = trilho?.children[i] as HTMLElement | undefined;
    if (!trilho || !alvo) return;

    trilho.scrollTo({ left: alvo.offsetLeft - trilho.offsetLeft, behavior: "smooth" });
  };

  /* O plano escolhido entra em foco: escolher pela seta e não ver o cartão é
     confuso, e vice-versa. */
  useEffect(() => {
    const i = planos.findIndex((p) => p.codigo === selecionado);
    if (i >= 0) irPara(i);
    // Só quando a seleção muda por fora (ex.: plano vindo da URL).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionado, planos.length]);

  return (
    <div className="relative">
      <div
        ref={trilhoRef}
        /* `pt-3`: o selo do cartão fica meio passo acima da borda, e
           `overflow-x-auto` também recorta na vertical — sem essa folga ele
           saía cortado pela metade. */
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 pb-2 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {planos.map((plano) => {
          const marcado = selecionado === plano.codigo;

          return (
            <label
              key={plano.id}
              className={`relative flex w-[85%] shrink-0 snap-center cursor-pointer flex-col rounded-2xl border p-4 transition-all sm:w-[calc(50%-0.375rem)] ${
                marcado
                  ? "border-accent bg-gradient-to-b from-accent/[0.12] to-fg/[0.02] shadow-[0_20px_50px_-28px_rgb(var(--accent))] ring-2 ring-accent/25"
                  : plano.destaque
                    ? "border-accent/40 bg-gradient-to-b from-accent/[0.06] to-fg/[0.02]"
                    : "border-fg/[0.08] bg-fg/[0.02] hover:border-fg/[0.18]"
              }`}
            >
              <input type="radio" name="plano-carrossel" value={plano.codigo} checked={marcado} onChange={() => onSelecionar(plano.codigo)} className="sr-only" />

              {plano.destaque && !marcado && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white shadow-[0_6px_16px_-4px_rgb(var(--accent))]">Mais escolhido</span>
              )}

              {marcado && (
                <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white shadow-[0_6px_16px_-4px_rgb(var(--accent))]">
                  <Check size={11} />
                  Escolhido
                </span>
              )}

              <h3 className="text-[17px] font-bold text-ink">{plano.nome}</h3>

              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-[27px] font-extrabold leading-none tracking-tight text-ink">{formatCurrencyFromCents(plano.precoCentavos)}</span>
                <span className="text-[12px] text-faint">{CICLO_LABEL[plano.ciclo]}</span>
              </p>

              <p className="mt-2 min-h-[32px] text-[12px] font-light leading-relaxed text-mist">{plano.descricao}</p>

              <ul className="mt-3 grid flex-1 gap-1.5 border-t border-fg/[0.06] pt-3">
                {linhas(plano).map(([texto, tem, Icone]) => (
                  <li key={texto} className={`flex items-start gap-2 text-[12px] ${tem ? "text-ink" : "text-muted line-through decoration-fg/20"}`}>
                    <span className={`mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md ${tem ? "bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/25" : "bg-fg/[0.04] text-muted"}`}>
                      <Icone size={11} />
                    </span>
                    {texto}
                  </li>
                ))}
              </ul>

              <span
                className={`mt-3.5 flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-[12.5px] transition-all ${
                  marcado ? "bg-accent text-white" : "border border-fg/[0.12] text-ink"
                }`}
              >
                {marcado ? (
                  <>
                    <Check size={15} /> Plano escolhido
                  </>
                ) : (
                  `Escolher ${plano.nome}`
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* Navegação: só aparece quando há mais de um cartão. */}
      {planos.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => irPara(Math.max(0, ativo - 1))}
            disabled={ativo === 0}
            aria-label="Plano anterior"
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-fg/[0.1] text-mist transition-colors hover:text-ink disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="flex items-center gap-1.5">
            {planos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => irPara(i)}
                aria-label={`Ver ${p.nome}`}
                className={`h-1.5 rounded-full transition-all ${i === ativo ? "w-5 bg-accent" : "w-1.5 bg-fg/[0.16] hover:bg-fg/30"}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => irPara(Math.min(planos.length - 1, ativo + 1))}
            disabled={ativo === planos.length - 1}
            aria-label="Próximo plano"
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-fg/[0.1] text-mist transition-colors hover:text-ink disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CarrosselPlanos;
