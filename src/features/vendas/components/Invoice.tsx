import { useEffect, useMemo, useRef, useState } from "react";
import HeaderInterprise from "@/shared/ui/HeaderInterprise";

import { formatDate, formatDateTime } from "@/shared/utils/date";
import { formatCurrency } from "@/shared/utils/currency";

import ProductType from "@/shared/domain/produto";
import PaymentType from "@/shared/domain/pagamento";

import NoteService from "@/features/vendas/services/note.service";
import ProductService from "@/features/estoque/services/product.service";

import CurrencyInput from "@/shared/ui/inputs/CurrencyInput";
import { Modal } from "@/shared/ui/Modal";

import { handleDownload } from "@/shared/ui/DownloadButton";

import { useAlert } from "@/shared/ui/Alert";

import { CreditCard, DollarSign, Download, PackageSearch, Plus, Receipt, Save, Trash2, Wallet, X } from "lucide-react";
import type { PedidoClienteType, ItemPedidoType, NovoPedidoDto, PedidoType, PedidoUpdateDto } from "@/shared/domain/pedido";
import { Skeleton, SkeletonInvoiceCard, SkeletonInvoiceHeader, SkeletonInvoiceRow, SkeletonProductList, SkeletonSummary } from "@/shared/ui/skeleton";

const gerarUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

type InvoiceProps = {
  id?: string;
  clienteId?: string;
  nome?: string;
  /** Chamado após o servidor confirmar a gravação — o pai fecha e recarrega. */
  onSaved?: () => void;
};

const TIPOS_PAGAMENTO = ["Dinheiro", "Pix", "Cheque", "Débito", "Negociação", "Crédito"];

const STATUS_STYLE: Record<string, string> = {
  ABERTO: "bg-warning/25 text-warning ring-warning/25",
  FECHADO: "bg-success/30 text-success ring-success/25",
  PAGO: "bg-success/30 text-success ring-success/25",
  CANCELADO: "bg-danger/25 text-danger ring-danger/25",
};

const Invoice = ({ id, clienteId, nome, onSaved }: InvoiceProps) => {
  const alert = useAlert();
  const notaRef = useRef<HTMLDivElement>(null);

  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingPedido, setLoadingPedido] = useState(!!id);

  const [products, setProducts] = useState<ProductType[]>([]);

  const [pedido, setPedido] = useState<PedidoType>();
  const [itens, setItens] = useState<ItemPedidoType[]>([]);

  const [payments, setPayments] = useState<PaymentType[]>([]);

  const [busca, setBusca] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState("");
  const [valorPagamento, setValorPagamento] = useState(0);

  const [saving, setSaving] = useState(false);

  const [modalProdutos, setModalProdutos] = useState(false);
  const [modalPagamentos, setModalPagamentos] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);

  useEffect(() => {
    ProductService.getAll()
      .then(({ data }) => setProducts(data.data ?? []))
      .catch(() => {
        alert.error("Erro ao carregar", "Não foi possível carregar os produtos.");
      })
      .finally(() => setLoadingProdutos(false));
  }, []);

  useEffect(() => {
    if (!id) return;

    NoteService.getById(id)
      .then((response: PedidoClienteType) => {
        if (!response) {
          alert.error("Pedido não encontrado", "Não localizamos esse pedido no sistema.");
          return;
        }

        setPedido(response.pedido);
        setItens((response.pedido.itensPedido ?? []).map((item: ItemPedidoType) => ({ ...item })));
      })
      .catch(() => {
        alert.error("Erro ao carregar", "Não foi possível carregar o pedido.");
      })
      .finally(() => setLoadingPedido(false));
  }, [id]);

  const adicionarProduto = (produtoHandle: ProductType) => {
    setItens((prev) => [
      ...prev,
      {
        itemPedidoId: gerarUID(),
        quantidadeItem: 1,
        valorVendaItem: produtoHandle.valorVenda,
        produto: {
          nomeProduto: produtoHandle.nome,
          produtoId: produtoHandle.id,
          valorProduto: produtoHandle.valorVenda,
        },
      },
    ]);

    alert.toast("success", "Produto adicionado!", undefined, { position: "bottom-right", timer: 2000 });
  };

  const atualizarLinha = (uid: string, patch: Partial<ItemPedidoType>) => setItens((prev) => prev.map((l) => (l.itemPedidoId === uid ? { ...l, ...patch } : l)));

  const removerProduto = (uid: string) => setItens((prev) => prev.filter((l) => l.itemPedidoId !== uid));

  const handleAdicionarPagamento = () => {
    if (!tipoPagamento || valorPagamento <= 0) return;

    setPayments((prev) => [...prev, { type: tipoPagamento, value: valorPagamento, date: new Date() }]);
    setTipoPagamento("");
    setValorPagamento(0);
  };

  const removerPagamento = (index: number) => setPayments((prev) => prev.filter((_, i) => i !== index));

  const clienteFinal = clienteId;
  const nomeCliente = nome;

  const montarItens = () =>
    itens.map((item) => ({
      produtoId: item.produto.produtoId,
      quantidade: item.quantidadeItem,
      valorVenda: item.valorVendaItem,
    }));

  const update = async (pedidoId: string) => {
    const payload: PedidoUpdateDto = { clienteId, itensPedido: montarItens() };

    // O `await` aqui é essencial: sem ele o sucesso era anunciado antes da
    // resposta do servidor e a listagem recarregava com dado velho.
    await NoteService.update(payload, pedidoId);
    alert.success("Nota alterada!", "As alterações foram salvas.");
  };

  const create = async () => {
    const payload: NovoPedidoDto = { clienteId, itensPedido: montarItens() };

    await NoteService.create(payload);
    alert.success("Nota criada!", "A venda foi registrada com sucesso.");
  };

  const handleSalvar = async () => {
    if (!clienteFinal) {
      alert.warning("Sem cliente", "Você não pode gerar uma nota sem cliente.");
      return;
    }
    if (itens.length === 0) {
      alert.warning("Nota vazia", "Adicione pelo menos um produto.");
      return;
    }
    if (itens.every((l) => l.quantidadeItem <= 0)) {
      alert.warning("Quantidade inválida", "Informe a quantidade dos produtos.");
      return;
    }

    setSaving(true);

    try {
      if (id) {
        await update(id);
      } else {
        await create();
      }
      // Só avisa o pai depois que o servidor confirmou — é isso que garante
      // que a lista recarregue já com os dados novos.
      onSaved?.();
    } catch (error) {
      console.error("Erro ao salvar nota:", error);
      alert.error("Erro ao salvar", "Não foi possível salvar a nota. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleExcluirNota = async () => {
    if (!id) return;

    try {
      await NoteService.delete(id);
      setModalExcluir(false);
      alert.success("Nota excluída!", "A nota foi removida com sucesso.");
      onSaved?.();
    } catch {
      alert.error("Erro ao excluir", "Não foi possível excluir a nota.");
    }
  };

  const total = useMemo(() => itens.reduce((acc, l) => acc + l.valorVendaItem * l.quantidadeItem, 0), [itens]);

  const produtosFiltrados = useMemo(() => products.filter((p) => p.nome?.toLowerCase().includes(busca.toLowerCase())), [products, busca]);

  const totalPago = payments.reduce((acc, { value }) => acc + Number(value), 0);
  const pendente = Math.max(total - totalPago, 0);

  const formaPagamento = payments.length > 0 ? (payments.every(({ type }) => type === payments[0].type) ? payments[0].type : "Misto") : "Não consta";

  const salvarDesabilitado = !clienteFinal || itens.length === 0;
  const statusPedido = pedido?.pedidoStatus;

  const botaoToolbar = "grid h-10 w-10 place-items-center rounded-xl ring-1 transition-colors duration-200 active:scale-95";
  const labelResumo = "block text-[11px] uppercase tracking-[0.08em] text-faint";
  const valorResumo = "mt-1 block truncate text-sm text-ink";
  const campoBase = "h-11 w-full rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 text-sm text-ink placeholder-mist outline-none transition-colors";

  return (
    <div className="flex h-full flex-col">
      {/* ============ MODAL: PRODUTOS ============ */}
      <Modal
        open={modalProdutos}
        onClose={() => {
          setModalProdutos(false);
          setBusca("");
        }}
        title="Adicionar produto"
        subtitle="Toque em um produto para incluir na nota"
        accent="rgb(var(--success))"
      >
        <div className="space-y-3">
          <div className="relative">
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome do produto..." className={`${campoBase} pl-9 focus:border-success/60 focus:bg-fg/[0.06]`} />
            <PackageSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loadingProdutos ? (
              <SkeletonProductList rows={6} />
            ) : produtosFiltrados.length === 0 ? (
              <p className="py-10 text-center text-sm text-mist">Nenhum produto encontrado</p>
            ) : (
              <ul className="space-y-1">
                {produtosFiltrados.map((p: ProductType) => (
                  <li key={String(p.id)}>
                    <button onClick={() => adicionarProduto(p)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-fg/[0.06] active:bg-fg/[0.1]">
                      <span className="min-w-0 truncate text-sm text-ink">{p.nome}</span>
                      <span className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-xs tabular-nums text-mist">{formatCurrency(Number(p.valorVenda) || 0)}</span>
                        <Plus size={14} className="text-success" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      {/* ============ MODAL: PAGAMENTOS ============ */}
      <Modal open={modalPagamentos} onClose={() => setModalPagamentos(false)} title="Pagamentos" subtitle="Lance os pagamentos recebidos" accent="rgb(var(--accent))">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} className={`${campoBase} appearance-none pl-9 focus:border-accent/60`}>
                <option disabled value="" className="text-gray-800">
                  Tipo de pagamento
                </option>
                {TIPOS_PAGAMENTO.map((op) => (
                  <option key={op} value={op} className="text-gray-800">
                    {op}
                  </option>
                ))}
              </select>
              <CreditCard size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="number" min={0} step="0.01" inputMode="decimal" placeholder="Valor" value={valorPagamento === 0 ? "" : valorPagamento} onChange={(e) => setValorPagamento(Number(e.target.value) || 0)} className={`${campoBase} pl-9 tabular-nums focus:border-accent/60`} />
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
              </div>

              <button onClick={handleAdicionarPagamento} disabled={!tipoPagamento || valorPagamento <= 0} className="grid h-11 w-12 flex-shrink-0 place-items-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-mist">
              <Wallet size={26} className="mb-2 opacity-50" />
              Nenhum pagamento lançado
            </div>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {payments.map(({ type, value, date }, index) => (
                <li key={`${type}-${index}-${value}`} className="flex items-center justify-between rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-fg/[0.05]">
                      <Receipt size={15} className="text-mist" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-sm capitalize text-ink">{type}</span>
                      <span className="block text-xs text-mist">{formatDateTime(date)}</span>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums text-ink">{formatCurrency(value)}</span>
                    <button onClick={() => removerPagamento(index)} className="grid h-7 w-7 place-items-center rounded-lg text-mist transition-colors hover:bg-danger/25 hover:text-danger">
                      <X size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-fg/[0.06] pt-3">
            <div>
              <span className="block text-xs text-mist">Total pago</span>
              <span className="text-sm tabular-nums text-ink">{formatCurrency(totalPago)}</span>
            </div>
            <div className="text-right">
              <span className="block text-xs text-mist">Pendente</span>
              <span className={`text-sm tabular-nums ${pendente > 0 ? "text-warning" : "text-success"}`}>{formatCurrency(pendente)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ============ MODAL: EXCLUIR NOTA ============ */}
      <Modal open={modalExcluir} onClose={() => setModalExcluir(false)} title="Excluir nota" subtitle="Essa ação não pode ser desfeita" accent="rgb(var(--danger))" maxWidth="max-w-sm">
        <p className="text-sm text-mist">Deseja realmente excluir esta nota?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setModalExcluir(false)} className="h-10 rounded-xl bg-fg/[0.05] px-4 text-sm text-ink transition-colors hover:bg-fg/[0.1]">
            Cancelar
          </button>
          <button onClick={handleExcluirNota} className="h-10 rounded-xl bg-danger px-4 text-sm text-white transition-colors hover:bg-danger">
            Excluir
          </button>
        </div>
      </Modal>

      {/* ============ NOTA ============ */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-fg/[0.06]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fg/[0.05] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {loadingPedido ? (
              <Skeleton className="h-5 w-24 rounded-full" />
            ) : statusPedido ? (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] tracking-wide ring-1 ${STATUS_STYLE[statusPedido] ?? "bg-fg/[0.05] text-mist ring-fg/[0.08]"}`}>{statusPedido}</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-accent/[0.12] px-3 py-1 text-[11px] tracking-wide text-accent-soft ring-1 ring-accent/25">NOVA NOTA</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button title="Adicionar produto" onClick={() => setModalProdutos(true)} className={`${botaoToolbar} bg-success/[0.1] text-success ring-success/20 hover:bg-success hover:text-success`}>
              <PackageSearch size={19} />
            </button>

            <button title="Pagamentos" onClick={() => setModalPagamentos(true)} className={`relative ${botaoToolbar} bg-accent/[0.1] text-accent-soft ring-accent/20 hover:bg-accent hover:text-white`}>
              <Wallet size={19} />
              {total > 0 && pendente > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-surface" />}
            </button>

            <button title="Baixar nota" onClick={() => handleDownload(notaRef)} className={`${botaoToolbar} bg-accent-soft/[0.1] text-accent-soft ring-accent-soft/20 hover:bg-accent-soft hover:text-accent`}>
              <Download size={19} />
            </button>

            <button title="Excluir nota" onClick={() => (id ? setModalExcluir(true) : alert.warning("Nota não salva", "Essa nota ainda não foi salva no sistema."))} className={`${botaoToolbar} bg-danger/[0.1] text-danger ring-danger/20 hover:bg-danger hover:text-white`}>
              <Trash2 size={19} />
            </button>
          </div>
        </div>

        {/* Conteúdo rolável (área capturada no download) */}
        <div className="flex-1 overflow-y-auto">
          <div ref={notaRef} className="flex w-full flex-col bg-surface">
            {/* Cabeçalho */}
            <div className="border-b border-fg/[0.05] p-5">
              {loadingPedido ? (
                <SkeletonInvoiceHeader />
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <HeaderInterprise />
                  <div className="md:text-right">
                    <h2 className="text-xl leading-none tracking-tight text-ink md:text-2xl">Nota de Venda</h2>
                    <p className="mt-1.5 text-sm text-mist">Data: {formatDate(new Date(pedido?.dataPedido ?? Date.now()))}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Cliente */}
            <div className="grid gap-3 px-5 pt-5 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">Cliente</label>
                {loadingPedido ? (
                  <Skeleton className="h-11 rounded-xl" />
                ) : (
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-fg/[0.06] bg-fg/[0.04] px-3 text-sm text-ink">
                    <span className="text-faint">👤</span>
                    <span className="truncate">{nomeCliente || "Nome do cliente"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* itens — tabela (desktop) */}
            <div className="hidden px-5 pt-4 md:block">
              <div className="overflow-hidden rounded-xl border border-fg/[0.06]">
                <div className="max-h-[42vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-surface-raised">
                      <tr className="border-b border-fg/[0.06] text-[11px] uppercase tracking-[0.08em] text-faint">
                        <td className="px-3 py-2.5 text-left">Produto</td>
                        <td className="px-3 py-2.5 text-left">Qtde</td>
                        <td className="px-3 py-2.5 text-left">V. Unit</td>
                        <td className="px-3 py-2.5 text-left">Subtotal</td>
                        <td className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fg/[0.05]">
                      {loadingPedido ? (
                        Array.from({ length: 4 }).map((_, i) => <SkeletonInvoiceRow key={i} />)
                      ) : itens.length > 0 ? (
                        itens.map((item) => (
                          <tr key={item.itemPedidoId} className="transition-colors duration-150 hover:bg-fg/[0.03]">
                            <td className="max-w-[280px] p-2 align-middle">
                              <p className="truncate px-1 text-ink" title={item.produto.nomeProduto}>
                                {item.produto.nomeProduto}
                              </p>
                            </td>
                            <td className="p-2 align-middle">
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={item.quantidadeItem}
                                onChange={(e) =>
                                  atualizarLinha(item.itemPedidoId, {
                                    quantidadeItem: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="h-10 w-20 rounded-lg border border-fg/[0.06] bg-fg/[0.03] px-2 text-center tabular-nums text-ink outline-none transition-colors focus:border-accent/60 focus:bg-fg/[0.05]"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <CurrencyInput value={item.valorVendaItem * 100} onChange={(cents) => atualizarLinha(item.itemPedidoId, { valorVendaItem: cents / 100 })} />
                            </td>
                            <td className="p-2 align-middle">
                              <p className="flex h-10 items-center rounded-lg bg-fg/[0.03] px-3 tabular-nums text-ink">{formatCurrency(item.valorVendaItem * item.quantidadeItem)}</p>
                            </td>
                            <td className="p-2 text-center align-middle">
                              <button title="Remover produto" onClick={() => removerProduto(item.itemPedidoId)} className="grid h-9 w-9 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/25 hover:text-danger">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-mist">
                            <p className="text-sm">Nenhum produto na nota</p>
                            <button onClick={() => setModalProdutos(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-fg/[0.12] px-4 py-2 text-sm text-mist transition-colors hover:border-success/60 hover:text-success">
                              <Plus size={16} /> Adicionar produto
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* itens — cards (mobile) */}
            <div className="space-y-3 px-5 pt-4 md:hidden">
              {loadingPedido ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonInvoiceCard key={i} />)
              ) : itens.length > 0 ? (
                itens.map((item) => (
                  <div key={item.itemPedidoId} className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm leading-snug text-ink">{item.produto.nomeProduto}</p>
                      <button onClick={() => removerProduto(item.itemPedidoId)} className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-danger/20 text-danger transition-colors active:bg-danger/40">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-mist">Quantidade</label>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={item.quantidadeItem}
                          onChange={(e) =>
                            atualizarLinha(item.itemPedidoId, {
                              quantidadeItem: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-10 w-full rounded-lg border border-fg/[0.06] bg-fg/[0.03] px-2 text-center tabular-nums text-ink outline-none transition-colors focus:border-accent/60"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-mist">Valor unitário</label>
                        <CurrencyInput value={item.valorVendaItem * 100} onChange={(cents) => atualizarLinha(item.itemPedidoId, { valorVendaItem: cents / 100 })} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-lg bg-fg/[0.03] px-3 py-2">
                      <span className="text-xs text-mist">Subtotal</span>
                      <span className="text-sm tabular-nums text-ink">{formatCurrency(item.valorVendaItem * item.quantidadeItem)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-fg/[0.12] py-10 text-center text-sm text-mist">Nenhum produto na nota</div>
              )}

              {!loadingPedido && (
                <button onClick={() => setModalProdutos(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-fg/[0.12] py-3 text-sm text-mist transition-colors active:border-success active:text-success">
                  <Plus size={16} /> Adicionar produto
                </button>
              )}
            </div>

            {/* Resumo */}
            <div className="p-5">
              {loadingPedido ? (
                <SkeletonSummary />
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={labelResumo}>T. Bruto</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(total)}</span>
                  </div>

                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={labelResumo}>Desconto</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(0)}</span>
                  </div>

                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={labelResumo}>T. Líquido</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(total)}</span>
                  </div>

                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={labelResumo}>T. Pago</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(totalPago)}</span>
                  </div>

                  <div className={`rounded-xl border p-3 ${pendente > 0 ? "border-warning/20 bg-warning/[0.12]" : "border-success/20 bg-success/[0.12]"}`}>
                    <span className={`block text-[11px] uppercase tracking-[0.08em] ${pendente > 0 ? "text-warning" : "text-success"}`}>Pendente</span>
                    <span className={`mt-1 block truncate text-sm tabular-nums ${pendente > 0 ? "text-warning" : "text-success"}`}>{formatCurrency(pendente)}</span>
                  </div>

                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={labelResumo}>F. Pagamento</span>
                    <span className={valorResumo}>{formaPagamento}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-fg/[0.06] bg-surface px-4 py-3">
          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-faint">Total da nota</span>
            {loadingPedido ? <Skeleton className="mt-1 h-7 w-32" /> : <span className="block truncate text-xl tabular-nums text-ink md:text-2xl">{formatCurrency(total)}</span>}
          </div>

          <button
            onClick={handleSalvar}
            disabled={salvarDesabilitado || saving || loadingPedido}
            className="flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm text-white transition-colors duration-200 hover:bg-accent-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={18} />
            {saving ? "Salvando..." : !id ? "Gerar Nota" : "Salvar Alterações"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Invoice;
