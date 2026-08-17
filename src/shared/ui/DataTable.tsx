import { Children } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import Dica from "@/shared/ui/Dica";

export type Coluna<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
};

const MIN_TABLE_WIDTH = 720;

export const TabelaCard = ({
  title,
  icon,
  count,
  countLabel,
  onAdd,
  addLabel = "Adicionar",
  controles,
  filters,
  children,
  footer,
  bodyRef,
  minWidth = MIN_TABLE_WIDTH,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  countLabel?: string;
  onAdd?: () => void;
  addLabel?: string;
  /**
   * Busca e filtros da lista — um grupo só, empurrado para a ponta oposta ao
   * título.
   *
   * Juntos porque as três coisas fazem o mesmo trabalho (restringir a lista) e
   * separá-las pelas duas pontas obrigava o olho a atravessar a barra para
   * montar um filtro só. Longe do título porque o título é o que a lista É, e
   * os controles são o que se faz com ela: encostados, viram um bloco de texto
   * e caixas sem hierarquia nenhuma.
   */
  controles?: ReactNode;
  /** Controles à direita, colados no botão de criar. */
  filters?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Referência do corpo rolável.
   *
   * Serve ao `useAutoPageSize`: é a altura DESTE elemento que decide quantas
   * linhas cabem na página.
   */
  bodyRef?: Ref<HTMLDivElement>;
  minWidth?: number;
}) => (
  <section className="card glass-sheen flex min-h-[220px] min-w-0 flex-1 flex-col overflow-hidden">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2.5 border-b border-fg/[0.07] px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
        {icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] text-ink">{title}</h2>
          {count !== undefined && (
            <p className="text-[11px] text-faint">
              {count} {countLabel ?? (count === 1 ? "registro" : "registros")}
            </p>
          )}
        </div>

        {/* `ml-auto` come a sobra da linha: o título fica na ponta esquerda e
            o grupo de controles na direita, sem depender de o cartão ter
            `filters` ou botão de criar para empurrá-lo. */}
        {controles && <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{controles}</div>}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {filters}
        {onAdd && (
          <button type="button" onClick={onAdd} className="focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-accent-soft to-accent px-3 py-2 text-[12.5px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]">
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </button>
        )}
      </div>
    </header>

    <div ref={bodyRef} className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-0 sm:[min-width:var(--tabela-min)]" style={{ "--tabela-min": `${minWidth}px` } as CSSProperties}>
        {children}
      </div>
    </div>

    {footer && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-fg/[0.06] px-4 py-2.5 text-[12px] text-faint">{footer}</div>}
  </section>
);

const alignCls = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function TabelaHead<T>({ colunas, cols }: { colunas: Coluna<T>[]; cols: string }) {
  return (
    <div className={`sticky top-0 z-10 hidden ${cols} gap-2 border-b border-fg/[0.07] bg-surface/80 px-4 py-2 text-[10.5px] uppercase tracking-wider text-faint backdrop-blur sm:grid`}>
      {colunas.map((c) => (
        <span key={c.id} className={alignCls[c.align ?? "left"]}>
          {c.header}
        </span>
      ))}
    </div>
  );
}

export function TabelaRow<T>({ colunas, cols, row, onClick }: { colunas: Coluna<T>[]; cols: string; row: T; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  const [principal, ...demais] = colunas;
  const visiveis = demais.filter((c) => Boolean(c.header));

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`group relative block w-full border-b border-fg/[0.04] text-left text-[12.5px] text-ink transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-accent before:opacity-0 before:transition-opacity ${onClick ? "cursor-pointer hover:bg-fg/[0.035] hover:before:opacity-100" : ""}`}
    >
      <span className={`hidden ${cols} items-center gap-2 px-4 py-2.5 sm:grid`}>
        {colunas.map((c) => (
          <span key={c.id} className={`min-w-0 truncate ${alignCls[c.align ?? "left"]}`}>
            {c.cell(row)}
          </span>
        ))}
      </span>

      {/* Cartão — celular */}
      <span className="flex flex-col gap-1.5 px-4 py-3 sm:hidden">
        {principal && <span className="min-w-0 truncate text-[13px] text-ink">{principal.cell(row)}</span>}

        {visiveis.map((c) => (
          <span key={c.id} className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-faint">{c.header}</span>
            <span className="min-w-0 truncate text-right text-[12.5px]">{c.cell(row)}</span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Lista de altura fixa

   O outro formato de tabela do sistema, usado por Clientes e Estoque: as
   linhas têm altura constante, o corpo não rola e o que não couber vai para a
   próxima página (ver `useAutoPageSize`). As três peças abaixo eram copiadas
   nas duas telas — as classes do cabeçalho, da linha e das linhas-fantasma
   eram idênticas byte a byte, e só as células mudavam.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Cabeçalho das colunas — só no desktop.
 *
 * No celular a linha vira cartão e cada valor já vem com o próprio rótulo ao
 * lado (ver `ListaLinha`). Um cabeçalho de seis colunas acima de cartões
 * empilhados não rotula nada: fica sobrando no topo, desalinhado do conteúdo.
 */
export const ListaCabecalho = ({ cols, children }: { cols: string; children: ReactNode }) => (
  <div className={`hidden shrink-0 ${cols} border-b border-fg/[0.06] bg-fg/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted sm:grid`}>{children}</div>
);

/**
 * Linha da lista. `onClick` a torna um `<button>` — abrir o registro é a ação
 * principal dessas telas, e um `<div>` com `onClick` não recebe foco nem
 * responde ao Enter.
 *
 * `acoes` são os botões da própria linha (ligar, editar, o que a tela tiver).
 * Eles ficam FORA do botão da linha: botão dentro de botão é HTML inválido, e
 * na prática o clique no ícone dispararia também a navegação da linha — a
 * pessoa pediria "editar" e receberia outra tela.
 *
 * ---------------------------------------------------------------------------
 * A MESMA linha vira cartão no celular
 * ---------------------------------------------------------------------------
 * Não existe versão de celular desta lista em outro arquivo, e é deliberado:
 * era assim que o Estoque e os Clientes tinham duas implementações da mesma
 * tela, e mexer numa não mexia na outra. Um filtro novo no desktop
 * simplesmente não chegava ao telefone.
 *
 * Abaixo de `sm` a grade de colunas viraria seis colunas de 40px. Então ela é
 * trocada por um cartão: a primeira célula (a identidade — nome e apoio) fica
 * em cima, e as demais viram pares "rótulo · valor". Os rótulos vêm de
 * `rotulos`, os MESMOS que a tela passa ao `ListaCabecalho` — uma lista só por
 * tela, para o cabeçalho do desktop e o cartão do celular nunca divergirem.
 *
 * A altura fixa também é só do desktop: ela existe para as linhas-fantasma
 * segurarem o rodapé de paginação. No cartão, o conteúdo manda.
 */
export const ListaLinha = ({
  cols,
  altura,
  rotulos,
  onClick,
  ariaLabel,
  acoes,
  destaque,
  children,
}: {
  cols: string;
  altura: number;
  /**
   * Rótulo de cada célula, na ordem das colunas — o que o cartão do celular
   * escreve antes de cada valor. A primeira posição é a identidade e não
   * recebe rótulo; posição vazia esconde a célula no cartão.
   */
  rotulos?: (string | undefined)[];
  onClick?: () => void;
  ariaLabel?: string;
  acoes?: ReactNode;
  /**
   * Fundo de aviso na linha inteira — vencida, crítica, o que a tela chamar
   * de urgente. É um tom lavado de propósito: a linha precisa saltar ao correr
   * o olho pela lista sem ficar ilegível quando se para nela.
   */
  destaque?: "danger" | "warning";
  children: ReactNode;
}) => {
  const Tag = onClick ? "button" : "div";

  const fundo = destaque === "danger" ? "bg-danger/[0.055] hover:bg-danger/[0.09]" : destaque === "warning" ? "bg-warning/[0.05] hover:bg-warning/[0.085]" : "hover:bg-fg/[0.03]";
  const marca = destaque === "danger" ? "before:bg-danger" : destaque === "warning" ? "before:bg-warning" : "before:bg-accent";

  /* As células como array: é o que permite pareá-las com os rótulos no cartão.
     Os mesmos elementos são desenhados nos dois lugares — só um deles está
     visível a cada largura, então não há trabalho duplicado na tela. */
  const celulas = Children.toArray(children);
  const [identidade, ...resto] = celulas;

  const linha = (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, "aria-label": ariaLabel } : {})}
      /* `h-auto` no celular e a altura fixa só a partir de `sm`: a altura vem
         por variável porque valor de `style` não aceita breakpoint. */
      className={`group relative block h-auto w-full border-b border-fg/[0.04] text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:transition-opacity hover:before:opacity-100 sm:h-[var(--linha-altura)] ${fundo} ${marca} ${destaque ? "before:opacity-100" : "before:opacity-0"}`}
      style={{ "--linha-altura": `${altura}px` } as CSSProperties}
    >
      {/* Grade — desktop */}
      <span className={`hidden h-full ${cols} items-center px-5 sm:grid`}>{children}</span>

      {/* Cartão — celular */}
      <span className="flex flex-col gap-2 px-4 py-3 sm:hidden">
        <span className="min-w-0">{identidade}</span>

        {resto.map((celula, i) => {
          const rotulo = rotulos?.[i + 1];

          /* Sem rótulo, a célula não entra: é o caso da coluna que só reserva
             a largura das ações, que no cartão não existe. */
          if (!rotulo) return null;

          return (
            <span key={i} className="flex items-baseline justify-between gap-3">
              <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-faint">{rotulo}</span>
              <span className="min-w-0 text-right">{celula}</span>
            </span>
          );
        })}
      </span>
    </Tag>
  );

  if (!acoes) return linha;

  return (
    /* `group` também aqui: as ações são irmãs do botão da linha, e o
       `group-hover` delas precisa de um ancestral comum aos dois. */
    <div className="group relative" style={{ "--linha-altura": `${altura}px` } as CSSProperties}>
      {linha}

      {/*
        No desktop as ações se sobrepõem à direita e só acendem no hover.
        No celular não existe hover — e um botão que só aparece ao passar o
        dedo é um botão que ninguém encontra. Então elas ficam de pé, numa
        faixa própria no pé do cartão.
      */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center pr-4 sm:flex">
        <div className="pointer-events-auto flex items-center gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          {acoes}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 border-b border-fg/[0.04] px-4 pb-3 sm:hidden">{acoes}</div>
    </div>
  );
};

/**
 * Botão de ícone de uma linha de tabela.
 *
 * Alvo de 30px com o ícone em 14: menor que isso vira alvo de mira no
 * trackpad. Quem responde "o que este ícone faz" é a `Dica` — tooltip do tema,
 * imediato, em vez do `title` do navegador (lento, cinza e recortado pelo
 * `overflow` da tabela).
 */
export const ListaAcao = ({
  icon,
  label,
  onClick,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "success";
}) => (
  <Dica texto={label}>
    <button
      type="button"
      aria-label={label}
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
      className={`focus-ring flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg border border-fg/[0.08] bg-surface/90 transition-colors hover:bg-fg/[0.08] ${
        tone === "success" ? "text-success hover:text-success" : "text-mist hover:text-ink"
      }`}
    >
      {icon}
    </button>
  </Dica>
);

/**
 * Linhas vazias que completam a página.
 *
 * Sem elas o rodapé sobe e desce conforme a última página tem duas ou dez
 * linhas — e a paginação vira um alvo que se move entre um clique e outro.
 *
 * Só no desktop: elas servem à lista de ALTURA FIXA. No celular as linhas são
 * cartões de altura variável e a lista rola, então uma fileira de retângulos
 * vazios no fim seria só espaço morto para o dedo atravessar.
 */
export const ListaFantasmas = ({ quantidade, altura }: { quantidade: number; altura: number }) => (
  <>
    {Array.from({ length: quantidade }).map((_, i) => (
      <div key={`fantasma-${i}`} aria-hidden className="hidden border-b border-fg/[0.04] sm:block" style={{ height: altura }} />
    ))}
  </>
);

/**
 * Rodapé de paginação das listas.
 *
 * Estava copiado em quatro telas — Clientes, Estoque, o extrato de faturas e o
 * histórico de pedidos do cliente — com quatro variações de espaçamento e dois
 * jeitos diferentes de desabilitar as setas. Aqui é um só; o que muda entre as
 * telas é o `resumo` da esquerda ("12 clientes", "Mostrando 1–8 de 11", o
 * ticket médio), que cada uma escreve do seu jeito.
 */
/**
 * Só as setas e o "3 / 7".
 *
 * Separado do rodapé porque nem toda tela quer uma barra própria para paginar:
 * a lista de vendas já tem um rodapé com os totais, e empilhar duas faixas
 * seria gastar altura para dizer duas coisas que cabem na mesma linha.
 */
export const ControlesPagina = ({ pagina, totalPaginas, onPagina }: { pagina: number; totalPaginas: number; onPagina: (p: number) => void }) => {
  const botao =
    "focus-ring flex cursor-pointer items-center gap-1 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-2.5 py-1.5 text-mist transition-colors hover:bg-fg/[0.08] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center gap-2 text-[11px] text-faint">
      <button type="button" disabled={pagina <= 1} onClick={() => onPagina(Math.max(1, pagina - 1))} aria-label="Página anterior" className={botao}>
        <ChevronLeft className="h-3.5 w-3.5" /> Anterior
      </button>

      <span className="px-1 tabular-nums">
        {pagina} / {totalPaginas}
      </span>

      <button type="button" disabled={pagina >= totalPaginas} onClick={() => onPagina(Math.min(totalPaginas, pagina + 1))} aria-label="Próxima página" className={botao}>
        Próxima <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export const TabelaPaginacao = ({
  pagina,
  totalPaginas,
  onPagina,
  resumo,
}: {
  pagina: number;
  totalPaginas: number;
  onPagina: (p: number) => void;
  resumo?: ReactNode;
}) => (
  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-fg/[0.06] bg-fg/[0.02] px-5 py-3 text-[11px] text-faint">
    <div className="min-w-0">{resumo}</div>
    <ControlesPagina pagina={pagina} totalPaginas={totalPaginas} onPagina={onPagina} />
  </div>
);

export const TabelaVazia = ({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) => (
  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2.5 px-6 py-10 text-center">
    {icon && <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-fg/[0.07] bg-fg/[0.03] text-faint">{icon}</span>}
    <p className="text-[13px] text-mist">{title}</p>
    {description && <p className="max-w-[280px] text-[11.5px] leading-relaxed text-faint">{description}</p>}
    {action}
  </div>
);
