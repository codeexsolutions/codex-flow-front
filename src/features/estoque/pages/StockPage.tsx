import { useEffect, useMemo, useState } from "react";
import { Tags, PackagePlus, Search, Package, AlertTriangle, ChevronLeft, ChevronRight, RotateCw, Boxes, Wallet } from "lucide-react";
import ProductType from "@/shared/domain/produto";
import ProductService from "@/features/estoque/services/product.service";
import { ProdutoForm } from "@/features/estoque/components/ProdutoForm";
import { ProductFormData } from "@/features/estoque/schema/product.schema";
import { Modal } from "@/shared/ui/Modal";
import HeaderPage from "@/shared/ui/HeaderPage";
import { PageBody } from "@/shared/ui/PageShell";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatNumber, toPercent } from "@/shared/utils/format";
import useVendaStore from "@/features/vendas/store/venda.store";
import { estaCancelado } from "@/shared/domain/pedido";
import { TrendingUp } from "lucide-react";
import { formatCurrency as brl } from "@/shared/utils/currency";
import { SkeletonTableRows, SkeletonIdentityCell } from "@/shared/ui/skeleton";
import { useAutoPageSize, ROW_HEIGHT } from "@/shared/hooks/useAutoPageSize";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

const LOW_STOCK = 5;

type ModalType = "registrar" | "editar" | "entrada" | "saida" | null;

type Filtro = "todos" | "disponivel" | "baixo" | "esgotado";
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "disponivel", label: "Em estoque" },
  { value: "baixo", label: "Baixo" },
  { value: "esgotado", label: "Esgotado" },
];

/**
 * A última coluna é um vão flexível: sem ela o "1fr" do produto engolia toda a
 * largura e grudava preços e estoque na borda direita do monitor, com um
 * buraco no meio da linha. Assim as colunas ficam agrupadas à esquerda e a
 * sobra de tela fica do lado de fora dos dados.
 */
const COLS = "grid-cols-[minmax(200px,420px)_120px_120px_90px_130px_minmax(0,1fr)]";
/** Soma das colunas fixas + folga para a coluna flexível: abaixo disso a tabela rola. */
const TABLE_MIN_WIDTH = 660;

type StockLevel = "disponivel" | "baixo" | "esgotado";
function stockLevel(qtd?: number): StockLevel {
  const q = qtd ?? 0;
  if (q <= 0) return "esgotado";
  if (q <= LOW_STOCK) return "baixo";
  return "disponivel";
}

function StockBadge({ quantidade }: { quantidade?: number }) {
  const level = stockLevel(quantidade);
  if (level === "esgotado")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/20 px-2.5 py-1 text-[11px] text-danger">
        <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Esgotado
      </span>
    );
  if (level === "baixo")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/50 bg-warning/20 px-2.5 py-1 text-[11px] text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Baixo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/20 px-2.5 py-1 text-[11px] text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Em estoque
    </span>
  );
}

const SkeletonRows = ({ count }: { count: number }) => (
  <SkeletonTableRows count={count} cols={COLS} rowHeight={ROW_HEIGHT}>
    <SkeletonIdentityCell />
    <div className="ml-auto h-3 w-16 rounded bg-fg/[0.05]" />
    <div className="ml-auto h-3 w-16 rounded bg-fg/[0.05]" />
    <div className="ml-auto h-3 w-10 rounded bg-fg/[0.05]" />
    <div className="h-5 w-20 rounded-full bg-fg/[0.05]" />
    <div />
  </SkeletonTableRows>
);

const Estoque = () => {
  const alert = useAlert();

  const [products, setProducts] = useState<ProductType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalType>(null);
  const fechar = () => setModal(null);

  const { bodyRef, perPage } = useAutoPageSize<HTMLDivElement>();

  const vendas = useVendaStore((s) => s.vendas);
  const fetchVendas = useVendaStore((s) => s.fetchVendas);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ProductService.getAll();
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setProducts(list as ProductType[]);
    } catch {
      setError("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchVendas();
  }, [fetchVendas]);

  const handleCreateProduct = async (data: ProductFormData) => {
    setError(null);
    try {
      await ProductService.create(data);
      fechar();
      await load();
      alert.success("Produto cadastrado!", "O produto foi adicionado ao estoque.");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível cadastrar o produto."));
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!selectedProduct?.id) return;
    setError(null);
    try {
      await ProductService.update({ id: selectedProduct.id, ...data });
      fechar();
      await load();
      alert.success("Produto atualizado!", "As alterações foram salvas.");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível salvar as alterações."));
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct?.id) return;
    setError(null);
    try {
      await ProductService.remove(selectedProduct.id);
      fechar();
      await load();
      alert.success("Produto excluído!", "O produto foi removido do estoque.");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível excluir o produto."));
    }
  };

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return products.filter((p) => {
      const level = stockLevel(p.quantidade);
      const matchFiltro = filtro === "todos" || filtro === level;
      if (!matchFiltro) return false;
      if (!q) return true;

      const matchNome = p.nome?.toLowerCase().includes(q);
      const matchDesc = p.descricao?.toLowerCase().includes(q);
      const matchId = String(p.id ?? "").includes(q);
      return matchNome || matchDesc || matchId;
    });
  }, [products, debouncedSearch, filtro]);

  const stats = useMemo(() => {
    const total = products.length;
    const esgotados = products.filter((p) => stockLevel(p.quantidade) === "esgotado").length;
    const baixos = products.filter((p) => stockLevel(p.quantidade) === "baixo").length;
    const disponiveis = total - esgotados - baixos;
    const unidades = products.reduce((acc, p) => acc + (p.quantidade ?? 0), 0);
    const valorEstoque = products.reduce((acc, p) => acc + (p.valorCompra ?? 0) * (p.quantidade ?? 0), 0);
    return { total, esgotados, baixos, disponiveis, unidades, valorEstoque };
  }, [products]);

  const pctDisponivel = toPercent(stats.disponiveis, stats.total);
  const pctBaixo = toPercent(stats.baixos, stats.total);
  const pctEsgotado = toPercent(stats.esgotados, stats.total);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const emptySlots = Math.max(0, perPage - pageItems.length);

  useEffect(() => setPage(1), [debouncedSearch, filtro]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Ranking por unidades efetivamente vendidas (ignora pedidos cancelados).
  const maisVendidos = useMemo(() => {
    const mapa = new Map<string, number>();
    vendas.forEach((v) => {
      if (estaCancelado(v)) return;
      (v.pedido.itensPedido ?? []).forEach((item) => {
        const nome = item.produto?.nomeProduto;
        if (!nome) return;
        mapa.set(nome, (mapa.get(nome) ?? 0) + Number(item.quantidadeItem || 0));
      });
    });
    return Array.from(mapa, ([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [vendas]);

  const maiorVenda = maisVendidos[0]?.qtd ?? 0;

  const hasFilters = Boolean(search) || filtro !== "todos";

  return (
    <div className="aurora relative flex h-full w-full flex-col overflow-hidden text-ink">
      <HeaderPage icon={<Tags className="h-5 w-5" />} title="Estoque" subtitle={`${formatNumber(stats.total)} ${stats.total === 1 ? "produto cadastrado" : "produtos cadastrados"}`} />

      {/* Conteúdo — ocupa o resto exato da viewport */}
      <PageBody>
        {error && (
          <div className="flex shrink-0 items-center justify-between gap-2.5 rounded-xl border border-danger/40 bg-danger/15 px-4 py-3 text-[13px] text-danger">
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button onClick={load} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-danger/30 px-2.5 py-1 text-[12px] text-danger transition-colors hover:bg-danger/10">
              <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Grid principal: tabela + lateral, ambos esticados até o fim */}
        <section className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Card da tabela — altura fixa da viewport */}
          <div className="flex min-h-[260px] min-w-0 flex-1 flex-col overflow-hidden card glass-sheen rounded-lg">
            {/* Toolbar do card */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-fg/[0.06] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.15]">
                  <Package className="h-4 w-4 text-accent-soft" />
                </div>
                <div>
                  <h2 className="text-[13px] text-ink">Todos os produtos</h2>
                  <p className="text-[11px] text-faint">
                    {formatNumber(filtered.length)} {filtered.length === 1 ? "resultado" : "resultados"}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-3 transition-colors focus-within:border-accent/60 focus-within:bg-fg/[0.06] sm:max-w-xs">
                  <Search className="h-4 w-4 text-muted" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, descrição ou ID…" aria-label="Buscar produtos" className="flex-1 bg-transparent py-2 text-[13px] text-ink outline-none placeholder:text-faint" />
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-fg/[0.07] bg-fg/[0.03] p-1">
                  {FILTROS.map((opt) => (
                    <button key={opt.value} onClick={() => setFiltro(opt.value)} aria-pressed={filtro === opt.value} className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12px] transition-colors ${filtro === opt.value ? "bg-accent text-white shadow-glow" : "text-mist hover:text-ink"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setModal("registrar")}
                  className="focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-accent-soft to-accent px-3 py-2 text-[12.5px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Novo produto
                </button>
              </div>
            </div>

            {/* Colunas + linhas rolam juntas na horizontal quando a tela é estreita. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
              <div className="flex min-h-0 flex-1 flex-col" style={{ minWidth: TABLE_MIN_WIDTH }}>
                {/* Cabeçalho de colunas */}
                <div className={`grid shrink-0 ${COLS} border-b border-fg/[0.06] bg-fg/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted`}>
                  <p>Produto</p>
                  <p className="text-right">Compra</p>
                  <p className="text-right">Venda</p>
                  <p className="text-right">Qtd.</p>
                  <p className="text-right">Estoque</p>
                  <p aria-hidden />
                </div>

                {/* Corpo: sem scroll — o que não cabe vai pra próxima página */}
                <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
                  {loading ? (
                    <SkeletonRows count={perPage} />
                  ) : filtered.length === 0 ? (
                    <div className="flex h-full items-center justify-center py-10">
                      <div className="flex max-w-xs flex-col items-center gap-3 text-center text-faint">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fg/[0.06] bg-fg/[0.03]">
                          <Package className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[13px] text-mist">Nenhum produto encontrado</p>
                          <p className="mt-0.5 text-[11px]">{hasFilters ? "Ajuste a busca ou os filtros." : "Comece cadastrando seu primeiro produto."}</p>
                        </div>
                        {!hasFilters && (
                          <button onClick={() => setModal("registrar")} className="mt-1 cursor-pointer rounded-xl bg-accent px-3.5 py-2 text-[12px] text-white transition-colors hover:bg-accent">
                            Cadastrar primeiro produto
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {pageItems.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            setModal("editar");
                          }}
                          aria-label={`Editar produto ${product.nome}`}
                          className={`group relative grid w-full ${COLS} items-center border-b border-fg/[0.04] px-5 text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:bg-accent before:opacity-0 before:transition-opacity hover:bg-fg/[0.03] hover:before:opacity-100`}
                          style={{ height: ROW_HEIGHT }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/25 to-accent-soft/10">
                              {product.imagem ? <img src={product.imagem} alt={product.nome} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-accent-soft" />}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-[13px] text-ink">{product.nome}</span>
                              <span className="truncate text-[11px] text-faint">{product.descricao || `#${product.id}`}</span>
                            </div>
                          </div>
                          <span className="text-right text-[12px] tabular-nums text-mist">{brl(product.valorCompra)}</span>
                          <span className="text-right text-[12px] tabular-nums text-ink">{brl(product.valorVenda)}</span>
                          <span className="text-right text-[12px] tabular-nums text-mist">{product.quantidade ?? 0}</span>
                          <span className="flex justify-end">
                            <StockBadge quantidade={product.quantidade} />
                          </span>
                          <span aria-hidden />
                        </button>
                      ))}

                      {/* Linhas vazias pra preencher o espaço quando a página não enche */}
                      {Array.from({ length: emptySlots }).map((_, i) => (
                        <div key={`empty-${i}`} aria-hidden className="border-b border-fg/[0.04]" style={{ height: ROW_HEIGHT }} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé / paginação */}
            <div className="flex shrink-0 items-center justify-between border-t border-fg/[0.06] bg-fg/[0.02] px-5 py-3 text-[11px] text-faint">
              <p>
                {formatNumber(filtered.length)} {filtered.length === 1 ? "produto" : "produtos"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-2.5 py-1.5 text-mist transition-colors hover:bg-fg/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </button>
                <span className="px-1 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-2.5 py-1.5 text-mist transition-colors hover:bg-fg/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Lateral: valor + composição */}
          <aside className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Valor do estoque */}
            <div className="card glass-sheen rounded-lg p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.15]">
                  <Wallet className="h-4 w-4 text-accent-soft" />
                </div>
                <h2 className="text-[13px] text-ink">Valor do estoque</h2>
              </div>
              <p className="text-2xl tracking-tight text-ink tabular-nums">{brl(stats.valorEstoque)}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-faint">
                <Boxes className="h-3.5 w-3.5" />
                <span className="tabular-nums">{formatNumber(stats.unidades)}</span> unidades em <span className="tabular-nums">{formatNumber(stats.total)}</span> itens
              </div>
            </div>

            {/* Composição do estoque */}
            <div className="card glass-sheen rounded-lg p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.15]">
                  <Package className="h-4 w-4 text-accent-soft" />
                </div>
                <h2 className="text-[13px] text-ink">Composição do estoque</h2>
              </div>

              <div className="flex h-2.5 overflow-hidden rounded-full bg-fg/[0.05]">
                <div className="bg-gradient-to-r from-success to-success transition-all" style={{ width: `${pctDisponivel}%` }} />
                <div className="bg-warning transition-all" style={{ width: `${pctBaixo}%` }} />
                <div className="bg-danger transition-all" style={{ width: `${pctEsgotado}%` }} />
              </div>

              <div className="mt-3.5 flex flex-col gap-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-mist">Em estoque</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="text-ink">{formatNumber(stats.disponiveis)}</span> <span className="text-faint">({pctDisponivel}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    <span className="text-mist">Baixo</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="text-ink">{formatNumber(stats.baixos)}</span> <span className="text-faint">({pctBaixo}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-danger" />
                    <span className="text-mist">Esgotado</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="text-ink">{formatNumber(stats.esgotados)}</span> <span className="text-faint">({pctEsgotado}%)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Produtos mais vendidos */}
            <div className="card glass-sheen flex flex-col rounded-lg p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/[0.15] ring-1 ring-inset ring-accent/20">
                  <TrendingUp className="h-4 w-4 text-accent-soft" />
                </div>
                <h2 className="text-[13px] text-ink">Mais vendidos</h2>
              </div>

              {maisVendidos.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-faint">Ainda sem vendas registradas.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {maisVendidos.map((p) => (
                    <div key={p.nome} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2 text-[12px]">
                        <span className="min-w-0 truncate text-mist">{p.nome}</span>
                        <span className="nums shrink-0 text-ink">{formatNumber(p.qtd)} un.</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.05]">
                        <div className="h-full rounded-full bg-gradient-to-r from-accent-soft to-accent transition-all" style={{ width: `${maiorVenda ? (p.qtd / maiorVenda) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      </PageBody>

      {/* Modais */}
      <Modal open={modal === "registrar"} onClose={fechar} title="Novo produto" subtitle="Preencha os dados do produto a cadastrar">
        <ProdutoForm submitText="Criar produto" onCancel={fechar} onSubmit={handleCreateProduct} />
      </Modal>

      <Modal open={modal === "editar"} onClose={fechar} title="Editar produto" subtitle="Atualize os dados do produto">
        <ProdutoForm
          submitText="Salvar alterações"
          onCancel={fechar}
          onDelete={handleDeleteProduct}
          defaultValues={{
            nome: selectedProduct?.nome,
            valorCompra: selectedProduct?.valorCompra,
            valorVenda: selectedProduct?.valorVenda,
            quantidade: selectedProduct?.quantidade,
            descricao: selectedProduct?.descricao,
            imagem: selectedProduct?.imagem,
          }}
          onSubmit={handleUpdateProduct}
        />
      </Modal>
    </div>
  );
};

export default Estoque;
