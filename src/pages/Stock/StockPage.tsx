import { useEffect, useMemo, useRef, useState } from "react";
import { Tags, PackagePlus, Search, Package, AlertTriangle, ChevronLeft, ChevronRight, RotateCw, Boxes, Wallet } from "lucide-react";
import ProductType from "../../types/ProductType";
import ProductService from "../../services/product.service";
import { ProductForm } from "./components/Form/product.form";
import { ProductFormData } from "./components/Schema/product.schema";
import { Modal } from "../../components/Modal";
import HeaderPage from "../../components/Headers/HeaderPage";
import { useAlert } from "../../components/Alert/Alert";
import { formatNumber, toPercent } from "../../utils/format";

const SEARCH_DEBOUNCE = 250;
const LOW_STOCK = 5;

const ROW_HEIGHT = 63.3; // altura de cada linha em px (deve ficar >= altura visual real)
const MIN_PER_PAGE = 5;
const FALLBACK_PER_PAGE = 10;

type ModalType = "registrar" | "editar" | "entrada" | "saida" | null;

type Filtro = "todos" | "disponivel" | "baixo" | "esgotado";
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "disponivel", label: "Em estoque" },
  { value: "baixo", label: "Baixo" },
  { value: "esgotado", label: "Esgotado" },
];

const COLS = "grid-cols-[1fr_120px_120px_90px_130px]";

const brl = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a22d2d]/40 bg-[#a22d2d]/20 px-2.5 py-1 text-[11px] font-medium text-[#f0a5a5]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#f0a5a5]" /> Esgotado
      </span>
    );
  if (level === "baixo")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8a6d1f]/50 bg-[#8a6d1f]/20 px-2.5 py-1 text-[11px] font-medium text-[#e0b955]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e0b955]" /> Baixo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0f6e56]/40 bg-[#0f6e56]/20 px-2.5 py-1 text-[11px] font-medium text-[#5dcaa5]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#5dcaa5]" /> Em estoque
    </span>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`grid ${COLS} items-center border-b border-white/[0.04] px-5`} style={{ height: ROW_HEIGHT }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-white/[0.05]" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-32 rounded bg-white/[0.06]" />
              <div className="h-2 w-40 rounded bg-white/[0.04]" />
            </div>
          </div>
          <div className="ml-auto h-3 w-16 rounded bg-white/[0.05]" />
          <div className="ml-auto h-3 w-16 rounded bg-white/[0.05]" />
          <div className="ml-auto h-3 w-10 rounded bg-white/[0.05]" />
          <div className="h-5 w-20 rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

const Estoque = () => {
  const alert = useAlert();

  const [products, setProducts] = useState<ProductType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(FALLBACK_PER_PAGE);

  const [modal, setModal] = useState<ModalType>(null);
  const fechar = () => setModal(null);

  const bodyRef = useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const calc = () => {
      const h = el.clientHeight;
      if (h <= 0) return;
      const rows = Math.max(MIN_PER_PAGE, Math.floor(h / ROW_HEIGHT));
      setPerPage((prev) => (prev === rows ? prev : rows));
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleCreateProduct = async (data: ProductFormData) => {
    setError(null);
    try {
      await ProductService.create(data);
      fechar();
      await load();
      alert.success("Produto cadastrado!", "O produto foi adicionado ao estoque.");
    } catch {
      alert.error("Erro ao cadastrar", "Não foi possível cadastrar o produto.");
    }
  };

  const handleUpdateProduct = async (data) => {
    if (!selectedProduct?.id) return;
    setError(null);
    try {
      await ProductService.update({ id: selectedProduct.id, ...data });
      fechar();
      await load();
      alert.success("Produto atualizado!", "As alterações foram salvas.");
    } catch {
      alert.error("Erro ao atualizar", "Não foi possível salvar as alterações.");
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct?.id) return;
    setError(null);
    try {
      // await ProductService.delete(selectedProduct.id);
      fechar();
      await load();
      alert.success("Produto excluído!", "O produto foi removido do estoque.");
    } catch {
      alert.error("Erro ao excluir", "Não foi possível excluir o produto.");
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

  const hasFilters = Boolean(search) || filtro !== "todos";

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0e0d1a] text-[#e8e4ff]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,110,245,0.16),transparent_70%)]" />

      {/* Cabeçalho — componente compartilhado */}
      <HeaderPage
        icon={<Tags className="h-5 w-5" />}
        title="Estoque"
        subtitle={`${formatNumber(stats.total)} ${stats.total === 1 ? "produto cadastrado" : "produtos cadastrados"}`}
        actions={
          <button
            onClick={() => setModal("registrar")}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(124,110,245,0.7)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <PackagePlus className="h-4 w-4" />
            Novo produto
          </button>
        }
      />

      {/* Conteúdo — ocupa o resto exato da viewport */}
      <main className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-5 py-5 lg:px-8 lg:py-6">
        {error && (
          <div className="flex shrink-0 items-center justify-between gap-2.5 rounded-xl border border-[#a22d2d]/40 bg-[#a22d2d]/15 px-4 py-3 text-[13px] text-[#f0a5a5]">
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button onClick={load} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#f0a5a5]/30 px-2.5 py-1 text-[12px] font-medium text-[#f0a5a5] transition-colors hover:bg-[#f0a5a5]/10">
              <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Grid principal: tabela + lateral, ambos esticados até o fim */}
        <section className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch">
          {/* Card da tabela — altura fixa da viewport */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#15132a]">
            {/* Toolbar do card */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6ef5]/[0.15]">
                  <Package className="h-4 w-4 text-[#9b8ff5]" />
                </div>
                <div>
                  <h2 className="text-[13px] font-medium text-[#e8e4ff]">Todos os produtos</h2>
                  <p className="text-[11px] text-[#6f6a93]">
                    {formatNumber(filtered.length)} {filtered.length === 1 ? "resultado" : "resultados"}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 transition-colors focus-within:border-[#7c6ef5]/60 focus-within:bg-white/[0.06] sm:max-w-xs">
                  <Search className="h-4 w-4 text-[#4e4a72]" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, descrição ou ID…" aria-label="Buscar produtos" className="flex-1 bg-transparent py-2 text-[13px] text-[#e8e4ff] outline-none placeholder:text-[#6f6a93]" />
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
                  {FILTROS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFiltro(opt.value)}
                      aria-pressed={filtro === opt.value}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${filtro === opt.value ? "bg-[#7c6ef5] text-white shadow-[0_4px_14px_-4px_rgba(124,110,245,0.8)]" : "text-[#8a85b4] hover:text-[#e8e4ff]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cabeçalho de colunas */}
            <div className={`grid shrink-0 ${COLS} border-b border-white/[0.06] bg-white/[0.02] px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#4e4a72]`}>
              <p>Produto</p>
              <p className="text-right">Compra</p>
              <p className="text-right">Venda</p>
              <p className="text-right">Qtd.</p>
              <p className="text-right">Estoque</p>
            </div>

            {/* Corpo: sem scroll — o que não cabe vai pra próxima página */}
            <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
              {loading ? (
                <SkeletonRows count={perPage} />
              ) : filtered.length === 0 ? (
                <div className="flex h-full items-center justify-center py-10">
                  <div className="flex max-w-xs flex-col items-center gap-3 text-center text-[#6f6a93]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#b7b2d8]">Nenhum produto encontrado</p>
                      <p className="mt-0.5 text-[11px]">{hasFilters ? "Ajuste a busca ou os filtros." : "Comece cadastrando seu primeiro produto."}</p>
                    </div>
                    {!hasFilters && (
                      <button onClick={() => setModal("registrar")} className="mt-1 cursor-pointer rounded-xl bg-[#7c6ef5] px-3.5 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#8b7bf7]">
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
                      className={`group relative grid w-full ${COLS} items-center border-b border-white/[0.04] px-5 text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:bg-[#7c6ef5] before:opacity-0 before:transition-opacity hover:bg-white/[0.03] hover:before:opacity-100`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#7c6ef5]/25 bg-gradient-to-br from-[#7c6ef5]/25 to-[#a78bfa]/10">
                          {product.imagem ? <img src={product.imagem} alt={product.nome} className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-[#b7aef9]" />}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[13px] font-medium text-[#e8e4ff]">{product.nome}</span>
                          <span className="truncate text-[11px] text-[#6f6a93]">{product.descricao || `#${product.id}`}</span>
                        </div>
                      </div>
                      <span className="text-right text-[12px] tabular-nums text-[#8a85b4]">{brl(product.valorCompra)}</span>
                      <span className="text-right text-[12px] font-medium tabular-nums text-[#e8e4ff]">{brl(product.valorVenda)}</span>
                      <span className="text-right text-[12px] tabular-nums text-[#8a85b4]">{product.quantidade ?? 0}</span>
                      <span className="flex justify-end">
                        <StockBadge quantidade={product.quantidade} />
                      </span>
                    </button>
                  ))}

                  {/* Linhas vazias pra preencher o espaço quando a página não enche */}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`} aria-hidden className="border-b border-white/[0.04]" style={{ height: ROW_HEIGHT }} />
                  ))}
                </>
              )}
            </div>

            {/* Rodapé / paginação */}
            <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-5 py-3 text-[11px] text-[#6f6a93]">
              <p>
                {formatNumber(filtered.length)} {filtered.length === 1 ? "produto" : "produtos"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[#b7b2d8] transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </button>
                <span className="px-1 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[#b7b2d8] transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Lateral: valor + composição */}
          <aside className="flex flex-col gap-4 xl:w-[340px]">
            {/* Valor do estoque */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#15132a] p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6ef5]/[0.15]">
                  <Wallet className="h-4 w-4 text-[#9b8ff5]" />
                </div>
                <h2 className="text-[13px] font-medium text-[#e8e4ff]">Valor do estoque</h2>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-[#f1eeff] tabular-nums">{brl(stats.valorEstoque)}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#6f6a93]">
                <Boxes className="h-3.5 w-3.5" />
                <span className="tabular-nums">{formatNumber(stats.unidades)}</span> unidades em <span className="tabular-nums">{formatNumber(stats.total)}</span> itens
              </div>
            </div>

            {/* Composição do estoque */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#15132a] p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6ef5]/[0.15]">
                  <Package className="h-4 w-4 text-[#9b8ff5]" />
                </div>
                <h2 className="text-[13px] font-medium text-[#e8e4ff]">Composição do estoque</h2>
              </div>

              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="bg-gradient-to-r from-[#0f6e56] to-[#5dcaa5] transition-all" style={{ width: `${pctDisponivel}%` }} />
                <div className="bg-[#e0b955] transition-all" style={{ width: `${pctBaixo}%` }} />
                <div className="bg-[#a22d2d] transition-all" style={{ width: `${pctEsgotado}%` }} />
              </div>

              <div className="mt-3.5 flex flex-col gap-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#5dcaa5]" />
                    <span className="text-[#8a85b4]">Em estoque</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium text-[#e8e4ff]">{formatNumber(stats.disponiveis)}</span> <span className="text-[#6f6a93]">({pctDisponivel}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#e0b955]" />
                    <span className="text-[#8a85b4]">Baixo</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium text-[#e8e4ff]">{formatNumber(stats.baixos)}</span> <span className="text-[#6f6a93]">({pctBaixo}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#a22d2d]" />
                    <span className="text-[#8a85b4]">Esgotado</span>
                  </span>
                  <span className="tabular-nums">
                    <span className="font-medium text-[#e8e4ff]">{formatNumber(stats.esgotados)}</span> <span className="text-[#6f6a93]">({pctEsgotado}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* Modais */}
      <Modal open={modal === "registrar"} onClose={fechar} title="Novo produto" subtitle="Preencha os dados do produto a cadastrar">
        <ProductForm submitText="Criar produto" onCancel={fechar} onSubmit={handleCreateProduct} />
      </Modal>

      <Modal open={modal === "editar"} onClose={fechar} title="Editar produto" subtitle="Atualize os dados do produto">
        <ProductForm
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
