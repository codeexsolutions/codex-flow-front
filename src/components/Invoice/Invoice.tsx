import { useEffect, useMemo, useRef, useState } from "react";
import HeaderInterprise from "../Headers/HeaderInterprise";

import { formatDate, formatDateHour } from "../../utils/date";
import { formatCurrency } from "../../utils/formatCurrency";

import ProductType from "../../types/ProductType";
import PaymentType from "../../types/PaymentType";

import NoteService from "../../services/note.service";
import ProductService from "../../services/product.service";

import CurrencyInput from "../Input/CurrencyInput";
import { Modal } from "../Modal";

import { handleDownload } from "../Buttons/DownloadButton";

import { useAlert } from "../Alert/Alert";

import { CreditCard, DollarSign, Download, PackageSearch, Plus, Receipt, Save, Trash2, Wallet, X } from "lucide-react";
import { clientePedido, itemPedido, novoPedidoDto, pedidoCliente, pedidoUpdate } from "../../types/InvoiceType";
import { Skeleton, SkeletonInvoiceCard, SkeletonInvoiceHeader, SkeletonInvoiceRow, SkeletonProductList, SkeletonSummary } from "../ui";

const gerarUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

type InvoiceProps = {
  id?: string;
  clienteId?: string;
  nome?: string;
};

const TIPOS_PAGAMENTO = ["Dinheiro", "Pix", "Cheque", "Débito", "Negociação", "Crédito"];

const STATUS_STYLE: Record<string, string> = {
  ABERTO: "bg-[#ba7517]/25 text-[#fac775] ring-[#fac775]/25",
  FECHADO: "bg-[#0f6e56]/30 text-[#5dcaa5] ring-[#5dcaa5]/25",
  PAGO: "bg-[#0f6e56]/30 text-[#5dcaa5] ring-[#5dcaa5]/25",
  CANCELADO: "bg-[#a22d2d]/25 text-[#f09595] ring-[#f09595]/25",
};

const Invoice = ({ id, clienteId, nome }: InvoiceProps) => {
  const alert = useAlert();
  const notaRef = useRef<HTMLDivElement>(null);

  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingPedido, setLoadingPedido] = useState(!!id);

  const [products, setProducts] = useState<ProductType[]>([]);

  const [pedido, setPedido] = useState<pedidoCliente>();
  const [itens, setItens] = useState<itemPedido[]>([]);

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
      .then((response: clientePedido) => {
        if (!response) {
          alert.error("Pedido não encontrado", "Não localizamos esse pedido no sistema.");
          return;
        }

        setPedido(response.pedido);
        setItens((response.pedido.itensPedido ?? []).map((item: itemPedido) => ({ ...item })));
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

  const atualizarLinha = (uid: string, patch: Partial<itemPedido>) => setItens((prev) => prev.map((l) => (l.itemPedidoId === uid ? { ...l, ...patch } : l)));

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

  const update = async (pedidoId: string) => {
    try {
      const payload: pedidoUpdate = {
        clienteId,
        itensPedido: itens.map((item) => ({
          produtoId: item.produto.produtoId,
          quantidade: item.quantidadeItem,
          valorVenda: item.valorVendaItem,
        })),
      };

      console.log("Payload update:", payload); // ← deixe temporariamente
      await NoteService.update(payload, pedidoId);
      alert.success("Nota Alterada!", "Nota alterada com sucesso!");
    } catch (error) {
      console.error("Erro no update:", error);
      alert.error("Erro", "Não foi possível alterar a nota.");
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    try {
      const payload: novoPedidoDto = {
        clienteId: clienteId,
        itensPedido: itens.map((item) => ({
          produtoId: item.produto.produtoId,
          quantidade: item.quantidadeItem,
          valorVenda: item.valorVendaItem,
        })),
      };

      console.log(payload);
      await NoteService.create(payload);

      alert.success("Nota Criada!", "Nota salva com sucesso!");
    } catch (error) {
      console.error(error);
      alert.error("Erro", "Não foi possível salvar a nota.");
    } finally {
      setSaving(false);
    }
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
    } catch (error) {
      console.log(error);
    }
  };

  const handleExcluirNota = async () => {
    if (!id) return;

    try {
      await NoteService.delete(id);
      setModalExcluir(false);
      alert.success("Nota excluída!", "A nota foi removida com sucesso.");
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
  const labelResumo = "block text-[11px] uppercase tracking-[0.08em] text-[#6b66a0]";
  const valorResumo = "mt-1 block truncate text-sm font-medium text-[#ece9ff]";
  const campoBase = "h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-[#e8e4ff] placeholder-[#8a85b4] outline-none transition-colors";

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
        accent="#5dcaa5"
      >
        <div className="space-y-3">
          <div className="relative">
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome do produto..." className={`${campoBase} pl-9 focus:border-[#5dcaa5]/60 focus:bg-white/[0.06]`} />
            <PackageSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a85b4]" />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loadingProdutos ? (
              <SkeletonProductList rows={6} />
            ) : produtosFiltrados.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#8a85b4]">Nenhum produto encontrado</p>
            ) : (
              <ul className="space-y-1">
                {produtosFiltrados.map((p: ProductType) => (
                  <li key={String(p.id)}>
                    <button onClick={() => adicionarProduto(p)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.1]">
                      <span className="min-w-0 truncate text-sm text-[#e8e4ff]">{p.nome}</span>
                      <span className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-xs tabular-nums text-[#8a85b4]">{formatCurrency(Number(p.valorVenda) || 0)}</span>
                        <Plus size={14} className="text-[#5dcaa5]" />
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
      <Modal open={modalPagamentos} onClose={() => setModalPagamentos(false)} title="Pagamentos" subtitle="Lance os pagamentos recebidos" accent="#7c6ef5">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} className={`${campoBase} appearance-none pl-9 focus:border-[#7c6ef5]/60`}>
                <option disabled value="" className="text-gray-800">
                  Tipo de pagamento
                </option>
                {TIPOS_PAGAMENTO.map((op) => (
                  <option key={op} value={op} className="text-gray-800">
                    {op}
                  </option>
                ))}
              </select>
              <CreditCard size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a85b4]" />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="number" min={0} step="0.01" inputMode="decimal" placeholder="Valor" value={valorPagamento === 0 ? "" : valorPagamento} onChange={(e) => setValorPagamento(Number(e.target.value) || 0)} className={`${campoBase} pl-9 tabular-nums focus:border-[#7c6ef5]/60`} />
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a85b4]" />
              </div>

              <button onClick={handleAdicionarPagamento} disabled={!tipoPagamento || valorPagamento <= 0} className="grid h-11 w-12 flex-shrink-0 place-items-center rounded-xl bg-[#7c6ef5] text-white transition-colors hover:bg-[#8d80f7] disabled:cursor-not-allowed disabled:opacity-40">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-[#8a85b4]">
              <Wallet size={26} className="mb-2 opacity-50" />
              Nenhum pagamento lançado
            </div>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {payments.map(({ type, value, date }, index) => (
                <li key={`${type}-${index}-${value}`} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-white/[0.05]">
                      <Receipt size={15} className="text-[#8a85b4]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-sm capitalize text-[#e8e4ff]">{type}</span>
                      <span className="block text-xs text-[#8a85b4]">{formatDateHour(date)}</span>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums text-[#e8e4ff]">{formatCurrency(value)}</span>
                    <button onClick={() => removerPagamento(index)} className="grid h-7 w-7 place-items-center rounded-lg text-[#8a85b4] transition-colors hover:bg-[#a22d2d]/25 hover:text-[#f09595]">
                      <X size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
            <div>
              <span className="block text-xs text-[#8a85b4]">Total pago</span>
              <span className="text-sm tabular-nums text-[#e8e4ff]">{formatCurrency(totalPago)}</span>
            </div>
            <div className="text-right">
              <span className="block text-xs text-[#8a85b4]">Pendente</span>
              <span className={`text-sm tabular-nums ${pendente > 0 ? "text-[#fac775]" : "text-[#5dcaa5]"}`}>{formatCurrency(pendente)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ============ MODAL: EXCLUIR NOTA ============ */}
      <Modal open={modalExcluir} onClose={() => setModalExcluir(false)} title="Excluir nota" subtitle="Essa ação não pode ser desfeita" accent="#f09595" maxWidth="max-w-sm">
        <p className="text-sm text-[#c9c4ef]">Deseja realmente excluir esta nota?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setModalExcluir(false)} className="h-10 rounded-xl bg-white/[0.05] px-4 text-sm text-[#e8e4ff] transition-colors hover:bg-white/[0.1]">
            Cancelar
          </button>
          <button onClick={handleExcluirNota} className="h-10 rounded-xl bg-[#a22d2d] px-4 text-sm text-white transition-colors hover:bg-[#c53737]">
            Excluir
          </button>
        </div>
      </Modal>

      {/* ============ NOTA ============ */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[#15132a] ring-1 ring-white/[0.06]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {loadingPedido ? (
              <Skeleton className="h-5 w-24 rounded-full" />
            ) : statusPedido ? (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium tracking-wide ring-1 ${STATUS_STYLE[statusPedido] ?? "bg-white/[0.05] text-[#8a85b4] ring-white/[0.08]"}`}>{statusPedido}</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#7c6ef5]/[0.12] px-3 py-1 text-[11px] font-medium tracking-wide text-[#9b8ff5] ring-1 ring-[#7c6ef5]/25">NOVA NOTA</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button title="Adicionar produto" onClick={() => setModalProdutos(true)} className={`${botaoToolbar} bg-[#5dcaa5]/[0.1] text-[#5dcaa5] ring-[#5dcaa5]/20 hover:bg-[#5dcaa5] hover:text-[#0d2b22]`}>
              <PackageSearch size={19} />
            </button>

            <button title="Pagamentos" onClick={() => setModalPagamentos(true)} className={`relative ${botaoToolbar} bg-[#7c6ef5]/[0.1] text-[#9b8ff5] ring-[#7c6ef5]/20 hover:bg-[#7c6ef5] hover:text-white`}>
              <Wallet size={19} />
              {total > 0 && pendente > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#fac775] ring-2 ring-[#15132a]" />}
            </button>

            <button title="Baixar nota" onClick={() => handleDownload(notaRef)} className={`${botaoToolbar} bg-[#c084fc]/[0.1] text-[#c084fc] ring-[#c084fc]/20 hover:bg-[#c084fc] hover:text-[#2a1440]`}>
              <Download size={19} />
            </button>

            <button title="Excluir nota" onClick={() => (id ? setModalExcluir(true) : alert.warning("Nota não salva", "Essa nota ainda não foi salva no sistema."))} className={`${botaoToolbar} bg-[#f09595]/[0.1] text-[#f09595] ring-[#f09595]/20 hover:bg-[#a22d2d] hover:text-white`}>
              <Trash2 size={19} />
            </button>
          </div>
        </div>

        {/* Conteúdo rolável (área capturada no download) */}
        <div className="flex-1 overflow-y-auto">
          <div ref={notaRef} className="flex w-full flex-col bg-[#15132a]">
            {/* Cabeçalho */}
            <div className="border-b border-white/[0.05] p-5">
              {loadingPedido ? (
                <SkeletonInvoiceHeader />
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <HeaderInterprise />
                  <div className="md:text-right">
                    <h2 className="text-xl leading-none tracking-tight text-[#ece9ff] md:text-2xl">Nota de Venda</h2>
                    <p className="mt-1.5 text-sm text-[#8a85b4]">Data: {formatDate(new Date(pedido?.dataPedido ?? Date.now()))}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Cliente */}
            <div className="grid gap-3 px-5 pt-5 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[#6b66a0]">Cliente</label>
                {loadingPedido ? (
                  <Skeleton className="h-11 rounded-xl" />
                ) : (
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-[#e8e4ff]">
                    <span className="text-[#6b66a0]">👤</span>
                    <span className="truncate">{nomeCliente || "Nome do cliente"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* itens — tabela (desktop) */}
            <div className="hidden px-5 pt-4 md:block">
              <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                <div className="max-h-[42vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[#1a1833]">
                      <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.08em] text-[#6b66a0]">
                        <td className="px-3 py-2.5 text-left">Produto</td>
                        <td className="px-3 py-2.5 text-left">Qtde</td>
                        <td className="px-3 py-2.5 text-left">V. Unit</td>
                        <td className="px-3 py-2.5 text-left">Subtotal</td>
                        <td className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {loadingPedido ? (
                        Array.from({ length: 4 }).map((_, i) => <SkeletonInvoiceRow key={i} />)
                      ) : itens.length > 0 ? (
                        itens.map((item) => (
                          <tr key={item.itemPedidoId} className="transition-colors duration-150 hover:bg-white/[0.03]">
                            <td className="max-w-[280px] p-2 align-middle">
                              <p className="truncate px-1 text-[#e8e4ff]" title={item.produto.nomeProduto}>
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
                                className="h-10 w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 text-center tabular-nums text-[#e8e4ff] outline-none transition-colors focus:border-[#7c6ef5]/60 focus:bg-white/[0.05]"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <CurrencyInput value={item.valorVendaItem * 100} onChange={(cents) => atualizarLinha(item.itemPedidoId, { valorVendaItem: cents / 100 })} />
                            </td>
                            <td className="p-2 align-middle">
                              <p className="flex h-10 items-center rounded-lg bg-white/[0.03] px-3 tabular-nums text-[#e8e4ff]">{formatCurrency(item.valorVendaItem * item.quantidadeItem)}</p>
                            </td>
                            <td className="p-2 text-center align-middle">
                              <button title="Remover produto" onClick={() => removerProduto(item.itemPedidoId)} className="grid h-9 w-9 place-items-center rounded-lg text-[#6b66a0] transition-colors hover:bg-[#a22d2d]/25 hover:text-[#f09595]">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#8a85b4]">
                            <p className="text-sm">Nenhum produto na nota</p>
                            <button onClick={() => setModalProdutos(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-white/[0.12] px-4 py-2 text-sm text-[#8a85b4] transition-colors hover:border-[#5dcaa5]/60 hover:text-[#5dcaa5]">
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
                  <div key={item.itemPedidoId} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm leading-snug text-[#e8e4ff]">{item.produto.nomeProduto}</p>
                      <button onClick={() => removerProduto(item.itemPedidoId)} className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[#a22d2d]/20 text-[#f09595] transition-colors active:bg-[#a22d2d]/40">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8a85b4]">Quantidade</label>
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
                          className="h-10 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 text-center tabular-nums text-[#e8e4ff] outline-none transition-colors focus:border-[#7c6ef5]/60"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8a85b4]">Valor unitário</label>
                        <CurrencyInput value={item.valorVendaItem * 100} onChange={(cents) => atualizarLinha(item.itemPedidoId, { valorVendaItem: cents / 100 })} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                      <span className="text-xs text-[#8a85b4]">Subtotal</span>
                      <span className="text-sm tabular-nums text-[#e8e4ff]">{formatCurrency(item.valorVendaItem * item.quantidadeItem)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.12] py-10 text-center text-sm text-[#8a85b4]">Nenhum produto na nota</div>
              )}

              {!loadingPedido && (
                <button onClick={() => setModalProdutos(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] py-3 text-sm text-[#8a85b4] transition-colors active:border-[#5dcaa5] active:text-[#5dcaa5]">
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
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <span className={labelResumo}>T. Bruto</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(total)}</span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <span className={labelResumo}>Desconto</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(0)}</span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <span className={labelResumo}>T. Líquido</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(total)}</span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <span className={labelResumo}>T. Pago</span>
                    <span className={`${valorResumo} tabular-nums`}>{formatCurrency(totalPago)}</span>
                  </div>

                  <div className={`rounded-xl border p-3 ${pendente > 0 ? "border-[#fac775]/20 bg-[#ba7517]/[0.12]" : "border-[#5dcaa5]/20 bg-[#0f6e56]/[0.12]"}`}>
                    <span className={`block text-[11px] uppercase tracking-[0.08em] ${pendente > 0 ? "text-[#fac775]" : "text-[#5dcaa5]"}`}>Pendente</span>
                    <span className={`mt-1 block truncate text-sm font-medium tabular-nums ${pendente > 0 ? "text-[#fac775]" : "text-[#5dcaa5]"}`}>{formatCurrency(pendente)}</span>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <span className={labelResumo}>F. Pagamento</span>
                    <span className={valorResumo}>{formaPagamento}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-[#15132a] px-4 py-3">
          <div className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-[#6b66a0]">Total da nota</span>
            {loadingPedido ? <Skeleton className="mt-1 h-7 w-32" /> : <span className="block truncate text-xl tabular-nums text-[#ece9ff] md:text-2xl">{formatCurrency(total)}</span>}
          </div>

          <button
            onClick={handleSalvar}
            disabled={salvarDesabilitado || saving || loadingPedido}
            className="flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7c6ef5] px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#8d80f7] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
