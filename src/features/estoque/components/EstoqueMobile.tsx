import { Search, X, Plus, Package, Eye, EyeOff, AlertTriangle, FolderTree } from "lucide-react";

import { formatNumber } from "@/shared/utils/format";
import { useDinheiroVisivel } from "@/shared/session/valoresVisiveis";
import { SEM_CATEGORIA, type NivelEstoque } from "@/shared/domain/produto";

export type FiltroEstoque = "todos" | "disponivel" | "baixo" | "esgotado";

export type TipoEstoque = "tudo" | "PRODUTO" | "SERVICO";

export type ProdutoItem = {
  id: string;
  nome: string;
  descricao?: string;
  imagem?: string;
  valorVenda: number;
  quantidade: number;
  /**
   * Vem de `nivelEstoque` — inclusive `ilimitado`, que é o item que não conta
   * unidades (serviço, encomenda). Antes ele chegava aqui como `esgotado`,
   * porque a quantidade era zero, e o card ficava vermelho dizendo "Esgotado"
   * sobre um serviço que ninguém precisa repor.
   */
  nivel: NivelEstoque;
  /** Selo ao lado do nome — sem ele, dois tamanhos do mesmo item se confundem. */
  tamanho?: string;
  tipo?: "PRODUTO" | "SERVICO";
  /** Nome da categoria. Vazio aparece como "Sem categoria", não some. */
  categoria?: string | null;
  /** Cor cadastrada da categoria. `null` = tom neutro do tema. */
  categoriaCor?: string | null;
};

type Props = {
  produtos: ProdutoItem[];
  valorEstoque: number;
  unidades: number;
  emFalta: number;
  estoqueBaixo: number;
  busca: string;
  onBusca: (v: string) => void;
  filtro: FiltroEstoque;
  onFiltro: (f: FiltroEstoque) => void;
  /**
   * Produto ou serviço — dimensão SEPARADA da situação do estoque.
   *
   * Os dois recortes respondem perguntas diferentes ("o que é isto" e "quanto
   * tem"), e misturá-los na mesma fileira de chips criaria combinações sem
   * sentido: "Serviços" e "Esgotado" ao mesmo tempo desliga um pelo outro, já
   * que serviço não conta estoque. Em duas fileiras, cada uma filtra o que
   * sabe filtrar.
   */
  tipo: TipoEstoque;
  onTipo: (t: TipoEstoque) => void;
  carregando: boolean;
  onAbrir: (p: ProdutoItem) => void;
  onNovo: () => void;
  /** Abre o painel de categorias — o mesmo do desktop, na mesma moldura. */
  onCategorias: () => void;
};

const TIPOS: { id: TipoEstoque; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "PRODUTO", label: "Produtos" },
  { id: "SERVICO", label: "Serviços" },
];

const FILTROS: { id: FiltroEstoque; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "baixo", label: "Baixo" },
  { id: "esgotado", label: "Esgotado" },
  { id: "disponivel", label: "Em estoque" },
];

const NIVEL: Record<NivelEstoque, { cls: string; texto: (q: number) => string }> = {
  esgotado: { cls: "text-danger", texto: () => "Esgotado" },
  baixo: { cls: "text-warning", texto: (q) => `${formatNumber(q)} un.` },
  disponivel: { cls: "text-mist", texto: (q) => `${formatNumber(q)} un.` },
  /* Sem número: mostrar "0 un." para um serviço é pior do que não mostrar
     nada — parece falta de estoque de algo que não tem estoque. */
  ilimitado: { cls: "text-faint", texto: () => "Sem controle" },
};

/**
 * Estoque no celular.
 *
 * O herói é o **valor parado em mercadoria** — a pergunta que o dono faz sobre
 * estoque é quanto dinheiro está ali, não quantas linhas existem.
 *
 * Logo abaixo, os dois números que **exigem ação**: em falta e estoque baixo.
 * Cada um é um botão que aplica o filtro correspondente — ver o problema e
 * chegar até ele são o mesmo toque.
 */
const EstoqueMobile = ({
  produtos,
  valorEstoque,
  unidades,
  emFalta,
  estoqueBaixo,
  busca,
  onBusca,
  filtro,
  onFiltro,
  tipo,
  onTipo,
  carregando,
  onAbrir,
  onNovo,
  onCategorias,
}: Props) => {
  const { mostrar, alternar, dinheiro } = useDinheiroVisivel();


  return (
    <div className="flex min-h-full flex-col pb-4">
      {/* ---------- Topo ---------- */}
      <div className="safe-top flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[12.5px] text-mist">Valor em estoque</p>
          <p className="mt-1 text-[34px] leading-none tracking-tight text-ink">{dinheiro(valorEstoque)}</p>
          <p className="mt-1.5 text-[12.5px] text-faint">
            {formatNumber(unidades)} {unidades === 1 ? "unidade" : "unidades"} · {formatNumber(produtos.length)} na lista
          </p>
        </div>

        {/* Duas ações de tela, não de item: esconder valores e organizar as
            gavetas do catálogo. Ficam no topo, longe do botão de cadastrar —
            que é a ação de todo dia e mora fixo no rodapé. */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onCategorias}
            aria-label="Categorias"
            className="flex h-10 w-10 items-center justify-center rounded-full text-mist transition-colors hover:bg-fg/[0.06]"
          >
            <FolderTree size={18} />
          </button>

          <button
            type="button"
            onClick={alternar}
            aria-label={mostrar ? "Esconder valores" : "Mostrar valores"}
            className="flex h-10 w-10 items-center justify-center rounded-full text-mist transition-colors hover:bg-fg/[0.06]"
          >
            {mostrar ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
      </div>

      {/* ---------- O que exige ação ---------- */}
      <div className="mt-4 flex gap-3 px-5">
        <button
          type="button"
          onClick={() => onFiltro("esgotado")}
          className={`min-w-0 flex-1 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
            emFalta > 0 ? "border-danger/25 bg-danger/[0.06] active:bg-danger/[0.12]" : "border-fg/[0.07]"
          }`}
        >
          <span className="block text-[11px] text-faint">Em falta</span>
          <span className={`mt-0.5 block text-[19px] leading-none ${emFalta > 0 ? "text-danger" : "text-mist"}`}>{formatNumber(emFalta)}</span>
        </button>

        <button
          type="button"
          onClick={() => onFiltro("baixo")}
          className={`min-w-0 flex-1 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
            estoqueBaixo > 0 ? "border-warning/25 bg-warning/[0.06] active:bg-warning/[0.12]" : "border-fg/[0.07]"
          }`}
        >
          <span className="block text-[11px] text-faint">Estoque baixo</span>
          <span className={`mt-0.5 block text-[19px] leading-none ${estoqueBaixo > 0 ? "text-warning" : "text-mist"}`}>{formatNumber(estoqueBaixo)}</span>
        </button>
      </div>

      {/* ---------- Busca ---------- */}
      <div className="mt-4 px-5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-4 focus-within:border-accent/50">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar produto"
            /* 16px evita o zoom automático do iOS ao focar. */
            className="w-full flex-1 bg-transparent py-3 text-[16px] text-ink outline-none placeholder:text-faint"
          />
          {busca && (
            <button type="button" onClick={() => onBusca("")} aria-label="Limpar busca" className="shrink-0 text-muted">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ---------- Tipo ---------- */}
      {/* Segmentado, e não chips soltos: as três opções são excludentes e
          cobrem o total, então elas formam um controle só. */}
      <div className="mt-3 px-5">
        <div className="flex items-center gap-1 rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-1">
          {TIPOS.map((t) => {
            const on = tipo === t.id;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTipo(t.id)}
                aria-pressed={on}
                className={`min-h-[34px] flex-1 rounded-lg text-[12.5px] transition-colors ${
                  on ? "bg-accent text-white" : "text-mist active:bg-fg/[0.05]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- Situação ---------- */}
      <div className="mt-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTROS.map((f) => {
          const on = filtro === f.id;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFiltro(f.id)}
              aria-pressed={on}
              className={`min-h-[38px] shrink-0 rounded-full border px-4 text-[13px] transition-colors ${
                on ? "border-accent bg-accent text-white" : "border-fg/[0.1] text-mist active:bg-fg/[0.05]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ---------- Lista ---------- */}
      <div className="mt-4 flex-1 px-5">
        {carregando ? (
          <p className="py-16 text-center text-[13px] text-faint">Carregando produtos…</p>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-fg/[0.08] bg-fg/[0.03] text-faint">
              <Package size={22} />
            </span>
            <p className="text-[14px] text-ink">{busca.trim() ? "Nenhum produto encontrado" : filtro !== "todos" ? "Nada neste filtro" : "Nenhum produto cadastrado"}</p>
            <p className="max-w-[250px] text-[12.5px] leading-relaxed text-faint">
              {busca.trim() ? "Tente outro nome." : filtro !== "todos" ? "Troque o filtro para ver os demais." : "Cadastre o primeiro para poder vender no PDV."}
            </p>
            {!busca.trim() && filtro === "todos" && (
              <button type="button" onClick={onNovo} className="mt-1 min-h-[44px] rounded-2xl bg-accent px-5 text-[14px] text-white transition-all active:scale-[0.99]">
                Cadastrar primeiro produto
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {produtos.map((p) => {
              const n = NIVEL[p.nivel];

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAbrir(p)}
                  className="flex min-h-[68px] items-center gap-3 border-b border-fg/[0.05] py-3 text-left transition-colors active:bg-fg/[0.04]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-fg/[0.08] bg-fg/[0.03]">
                    {p.imagem ? <img src={p.imagem} alt="" className="h-full w-full object-cover" /> : <Package size={17} className="text-muted" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[14.5px] text-ink">{p.nome}</span>
                      {p.tamanho && (
                        <span className="shrink-0 rounded bg-fg/[0.07] px-1.5 py-px text-[10px] leading-[16px] text-mist">{p.tamanho}</span>
                      )}
                      {p.tipo === "SERVICO" && (
                        <span className="shrink-0 rounded bg-accent/[0.12] px-1.5 py-px text-[10px] leading-[16px] text-accent-soft">serviço</span>
                      )}
                    </span>
                    {/*
                      A categoria divide a linha com a quantidade em vez de
                      virar um selo ao lado do nome.
                      Selo junto do nome disputaria espaço com tamanho e
                      "serviço", e num aparelho de 360px o nome do produto —
                      que é o que a pessoa procura — seria o primeiro a ser
                      cortado. Aqui embaixo há linha inteira, e a categoria
                      fica em tom apagado para não competir com o aviso de
                      estoque, que é o que exige ação.
                    */}
                    <span className="flex items-center gap-1.5 truncate text-[12px]">
                      <span className={`flex shrink-0 items-center gap-1 ${n.cls}`}>
                        {(p.nivel === "baixo" || p.nivel === "esgotado") && <AlertTriangle size={11} className="shrink-0" />}
                        {n.texto(p.quantidade)}
                      </span>

                      <span className="shrink-0 text-faint">·</span>

                      <span className="inline-flex min-w-0 items-center gap-1 text-faint">
                        {p.categoria && (
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg/30"
                            style={p.categoriaCor ? { background: p.categoriaCor } : undefined}
                          />
                        )}
                        <span className="truncate">{p.categoria || SEM_CATEGORIA}</span>
                      </span>
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-[14.5px] tabular-nums text-ink">{dinheiro(p.valorVenda)}</span>
                    <span className="block text-[11px] text-faint">venda</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- Ação primária ---------- */}
      <button
        type="button"
        onClick={onNovo}
        className="fixed right-5 z-[90] flex h-14 items-center gap-2 rounded-full bg-accent px-5 text-[15px] text-white shadow-[0_12px_32px_-8px_rgb(var(--accent))] transition-transform active:scale-95"
        style={{ bottom: "calc(72px + env(safe-area-inset-bottom) + 12px)" }}
      >
        <Plus size={20} />
        Novo produto
      </button>
    </div>
  );
};

export default EstoqueMobile;
