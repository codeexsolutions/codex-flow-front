import { useEffect, useMemo, useRef, useState } from "react";
import HeaderInterprise from "../Headers/HeaderInterprise";

import { formatDate, formatDateHour } from "../../utils/date";
import { formatCurrency } from "../../utils/formatCurrency";

import ProductType from "../../types/ProductType";
import PaymentType from "../../types/PaymentType";
import InvoiceType, { NovoPedidoType, PedidoClienteType } from "../../types/InvoiceType";

import NoteService from "../../services/note.service";
import ProductService from "../../services/product.service";

import CurrencyInput from "../Input/CurrencyInput";
import { Modal } from "../Modal";

import { handleDownload } from "../Buttons/DownloadButton";

import { useAlert } from "../Alert/Alert";

import { CreditCard, DollarSign, Download, PackageSearch, Plus, Receipt, Save, Trash2, Wallet, X } from "lucide-react";

const gerarUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

type LinhaPedido = {
  uid: string;
  produtoId: string;
  nome: string;
  valorVenda: number;
  quantidade: number;
};

type InvoiceProps = {
  /** pedidoId da API — agora é um UUID (string), não number */
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

  const [products, setProducts] = useState<ProductType[]>([]);
  const [pedidoInfo, setPedidoInfo] = useState<PedidoClienteType | null>(null);

  const [linhas, setLinhas] = useState<LinhaPedido[]>([]);
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
        setProducts([]);
        alert.error("Erro ao carregar", "Não foi possível carregar os produtos.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega o pedido (GET /pedidos/) e mapeia itensPedido -> linhas editáveis
  useEffect(() => {
    if (!id) return;

    NoteService.getById(id)
      .then((registro:any) => {
        if (!registro) {
          alert.error("Pedido não encontrado", "Não localizamos esse pedido no sistema.");
          return;
        }

        setPedidoInfo(registro);

        setLinhas(
          (registro.pedido?.itensPedido ?? []).map((item:any) => ({
            uid: gerarUID(),
            produtoId: String(item.produto.produtoId),
            nome: item.produto.nomeProduto,
            valorVenda: Number(item.valorVendaItem) || Number(item.produto.valorProduto) || 0,
            quantidade: Number(item.quantidadeItem) || 0,
          })),
        );
      })
      .catch(() => alert.error("Erro ao carregar", "Não foi possível carregar o pedido."));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const adicionarProduto = (produto: ProductType) => {
    setLinhas((prev) => [
      ...prev,
      {
        uid: gerarUID(),
        produtoId: String(produto.id),
        nome: produto.nome,
        valorVenda: Number(produto.valorVenda) || 0,
        quantidade: 1,
      },
    ]);
    // toast (não bloqueante) porque dispara a cada clique em produto
    alert.toast("success", "Produto adicionado!", undefined, { position: "bottom-right", timer: 2000 });
  };

  const atualizarLinha = (uid: string, patch: Partial<LinhaPedido>) => setLinhas((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));

  const removerProduto = (uid: string) => setLinhas((prev) => prev.filter((l) => l.uid !== uid));

  const handleAdicionarPagamento = () => {
    if (!tipoPagamento || valorPagamento <= 0) return;

    setPayments((prev) => [...prev, { type: tipoPagamento, value: valorPagamento, date: new Date() }]);
    setTipoPagamento("");
    setValorPagamento(0);
  };

  const removerPagamento = (index: number) => setPayments((prev) => prev.filter((_, i) => i !== index));

  const clienteFinal = clienteId || pedidoInfo?.clienteId;
  const nomeCliente = nome || pedidoInfo?.nomeCliente;

  const handleSalvar = async () => {
    if (!clienteFinal) {
      alert.warning("Sem cliente", "Você não pode gerar uma nota sem cliente.");
      return;
    }

    if (linhas.length === 0) {
      alert.warning("Nota vazia", "Adicione pelo menos um produto.");
      return;
    }

    if (linhas.every((l) => l.quantidade <= 0)) {
      alert.warning("Quantidade inválida", "Informe a quantidade dos produtos.");
      return;
    }

    const itensMapeados = linhas.map((l) => ({
      produtoId: l.produtoId,
      quantidade: Number(l.quantidade) || 0,
      valorVenda: Number(l.valorVenda) || 0,
    }));

    setSaving(true);
    try {
      if (!id) {
        // API de criação (novoPedidoDto) espera o campo "itensPedido"
        const novoPedidoPayload: NovoPedidoType = {
          clienteId: clienteFinal,
          itensPedido: itensMapeados,
        };
        await NoteService.create(novoPedidoPayload);
      } else {
        // API de alteração (pedidoUpdate) espera o campo "produtosPedido"
        const atualizarPayload: InvoiceType = {
          clienteId: clienteFinal,
          produtosPedido: itensMapeados,
        };
        await NoteService.update({ ...atualizarPayload }, id);
      }
      alert.success("Nota salva!", "A nota foi salva com sucesso.");
    } catch {
      alert.error("Erro ao salvar", "Não foi possível salvar a nota.");
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
    } catch {
      alert.error("Erro ao excluir", "Não foi possível excluir a nota.");
    }
  };

  const total = useMemo(() => linhas.reduce((acc, l) => acc + l.valorVenda * l.quantidade, 0), [linhas]);

  const produtosFiltrados = useMemo(() => products.filter((p) => p.nome?.toLowerCase().includes(busca.toLowerCase())), [products, busca]);

  const totalPago = payments.reduce((acc, { value }) => acc + Number(value), 0);
  const pendente = Math.max(total - totalPago, 0);

  const formaPagamento = payments.length > 0 ? (payments.every(({ type }) => type === payments[0].type) ? payments[0].type : "Misto") : "Não consta";

  const salvarDesabilitado = !clienteFinal || linhas.length === 0;
  const statusPedido = pedidoInfo?.pedido.pedidoStatus ?? "";

  const botaoToolbar = "grid h-10 w-10 place-items-center rounded-lg transition-all duration-200 active:scale-95";
  const labelResumo = "block text-[11px] uppercase tracking-wide text-[#6b66a0]";
  const valorResumo = "mt-0.5 block truncate text-sm text-[#ece9ff]";

  return (
    <div className="flex h-full flex-col">
      {/* ============ MODAL: ADICIONAR PRODUTO ============ */}
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
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome do produto..." className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-3 text-sm text-[#e8e4ff] placeholder-[#8a85b4] outline-none focus:border-[#5dcaa5]" />
            <PackageSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a85b4]" />
          </div>

          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {produtosFiltrados.length === 0 ? (
              <li className="py-8 text-center text-sm text-[#8a85b4]">Nenhum produto encontrado</li>
            ) : (
              produtosFiltrados.map((produto) => (
                <li key={String(produto.id)}>
                  <button onClick={() => adicionarProduto(produto)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07] active:bg-white/[0.12]">
                    <span className="min-w-0 truncate text-sm text-[#e8e4ff]">{produto.nome}</span>
                    <span className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-xs text-[#8a85b4]">{formatCurrency(Number(produto.valorVenda) || 0)}</span>
                      <Plus size={14} className="text-[#5dcaa5]" />
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>

      {/* ============ MODAL: PAGAMENTOS ============ */}
      <Modal open={modalPagamentos} onClose={() => setModalPagamentos(false)} title="Pagamentos" subtitle="Lance os pagamentos recebidos" accent="#7c6ef5">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} className="h-11 w-full appearance-none rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-3 text-sm text-[#e8e4ff] outline-none focus:border-[#7c6ef5]">
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
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Valor"
                  value={valorPagamento === 0 ? "" : valorPagamento}
                  onChange={(e) => setValorPagamento(Number(e.target.value) || 0)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-3 text-sm text-[#e8e4ff] placeholder-[#8a85b4] outline-none focus:border-[#7c6ef5]"
                />
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a85b4]" />
              </div>

              <button onClick={handleAdicionarPagamento} disabled={!tipoPagamento || valorPagamento <= 0} className="grid h-11 w-12 flex-shrink-0 place-items-center rounded-lg bg-[#7c6ef5] text-white transition hover:bg-[#8d80f7] disabled:cursor-not-allowed disabled:opacity-40">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-[#8a85b4]">
              <Wallet size={26} className="mb-2 opacity-60" />
              Nenhum pagamento lançado
            </div>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {payments.map(({ type, value, date }, index) => (
                <li key={`${type}-${index}-${value}`} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white/[0.06]">
                      <Receipt size={15} className="text-[#8a85b4]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-sm capitalize text-[#e8e4ff]">{type}</span>
                      <span className="block text-xs text-[#8a85b4]">{formatDateHour(date)}</span>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-sm text-[#e8e4ff]">{formatCurrency(value)}</span>
                    <button onClick={() => removerPagamento(index)} className="grid h-6 w-6 place-items-center rounded-md text-[#8a85b4] transition-colors hover:bg-white/[0.1] hover:text-[#f09595]">
                      <X size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3">
            <div>
              <span className="block text-xs text-[#8a85b4]">Total pago</span>
              <span className="text-sm text-[#e8e4ff]">{formatCurrency(totalPago)}</span>
            </div>
            <div className="text-right">
              <span className="block text-xs text-[#8a85b4]">Pendente</span>
              <span className={`text-sm ${pendente > 0 ? "text-[#fac775]" : "text-[#5dcaa5]"}`}>{formatCurrency(pendente)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ============ MODAL: EXCLUIR NOTA ============ */}
      <Modal open={modalExcluir} onClose={() => setModalExcluir(false)} title="Excluir nota" subtitle="Essa ação não pode ser desfeita" accent="#f09595" maxWidth="max-w-sm">
        <p className="text-sm text-[#c9c4ef]">Deseja realmente excluir esta nota?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setModalExcluir(false)} className="h-10 rounded-lg bg-white/[0.06] px-4 text-sm text-[#e8e4ff] transition-colors hover:bg-white/[0.12]">
            Cancelar
          </button>
          <button onClick={handleExcluirNota} className="h-10 rounded-lg bg-[#a22d2d] px-4 text-sm text-white transition-colors hover:bg-[#c53737]">
            Excluir
          </button>
        </div>
      </Modal>

      {/* ============ NOTA ============ */}
      <div className="flex h-full flex-col overflow-hidden rounded-md bg-[#15132a] shadow-sm ring-1 ring-white/[0.08]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {statusPedido ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${STATUS_STYLE[statusPedido] ?? "bg-white/[0.06] text-[#8a85b4] ring-white/[0.08]"}`}>{statusPedido}</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#7c6ef5]/[0.15] px-2.5 py-0.5 text-[11px] text-[#9b8ff5] ring-1 ring-[#7c6ef5]/25">NOVA NOTA</span>
            )}
            {pedidoInfo && <span className="hidden truncate text-xs text-[#6b66a0] sm:inline">#{pedidoInfo.pedido.pedidoId.slice(0, 8)}</span>}
          </div>

          <div className="flex items-center gap-1.5">
            <button title="Adicionar produto" onClick={() => setModalProdutos(true)} className={`${botaoToolbar} bg-[#5dcaa5]/[0.15] text-[#5dcaa5] hover:bg-[#5dcaa5] hover:text-white`}>
              <PackageSearch size={20} />
            </button>

            <button title="Pagamentos" onClick={() => setModalPagamentos(true)} className={`relative ${botaoToolbar} bg-[#7c6ef5]/[0.15] text-[#9b8ff5] hover:bg-[#7c6ef5] hover:text-white`}>
              <Wallet size={20} />
              {total > 0 && pendente > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#fac775] ring-2 ring-[#15132a]" />}
            </button>

            <button title="Baixar nota" onClick={() => handleDownload(notaRef)} className={`${botaoToolbar} bg-[#c084fc]/[0.15] text-[#c084fc] hover:bg-[#c084fc] hover:text-white`}>
              <Download size={20} />
            </button>

            <button title="Excluir nota" onClick={() => (id ? setModalExcluir(true) : alert.warning("Nota não salva", "Essa nota ainda não foi salva no sistema."))} className={`${botaoToolbar} bg-[#f09595]/[0.15] text-[#f09595] hover:bg-[#a22d2d] hover:text-white`}>
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo rolável (área capturada no download) */}
        <div className="flex-1 overflow-y-auto">
          <div ref={notaRef} className="flex w-full flex-col bg-[#15132a]">
            {/* Cabeçalho */}
            <div className="border-b border-white/[0.06] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <HeaderInterprise />
                <div className="md:text-right">
                  <h2 className="text-xl leading-none text-[#ece9ff] md:text-2xl">Nota de Venda</h2>
                  <p className="mt-1 text-sm text-[#8a85b4]">
                    Data: <span>{formatDate(new Date(pedidoInfo?.pedido.dataPedido ?? Date.now()))}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Cliente + Observações */}
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="mb-1 text-xs text-[#8a85b4]">Cliente</label>
                <div className="flex h-11 items-center gap-2 rounded border border-white/[0.08] bg-white/[0.05] px-3 text-sm text-[#e8e4ff]">
                  <span className="text-[#6b66a0]">👤</span>
                  <span className="truncate">{nomeCliente || "Nome do cliente"}</span>
                </div>
              </div>
            </div>

            {/* Itens — tabela (desktop) */}
            <div className="hidden px-4 pb-2 md:block">
              <div className="overflow-hidden rounded-md border border-white/[0.08]">
                <div className="max-h-[42vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white/[0.03]">
                      <tr className="border-b border-white/[0.06] text-[#8a85b4]">
                        <td className="p-3 text-left">PRODUTO</td>
                        <td className="p-3 text-left">QTDE</td>
                        <td className="p-3 text-left">V. UNIT</td>
                        <td className="p-3 text-left">SUBTOTAL</td>
                        <td className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.length > 0 ? (
                        linhas.map((linha, i) => (
                          <tr key={linha.uid} className={`border-b border-white/[0.06] transition-colors duration-150 hover:bg-[#7c6ef5]/[0.08] ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}`}>
                            <td className="max-w-[280px] p-2 align-middle">
                              <p className="truncate text-[#e8e4ff]" title={linha.nome}>
                                {linha.nome}
                              </p>
                            </td>
                            <td className="p-2 align-middle">
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={linha.quantidade}
                                onChange={(e) =>
                                  atualizarLinha(linha.uid, {
                                    quantidade: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="h-10 w-20 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 text-center text-[#e8e4ff] focus:outline-none focus:ring-2 focus:ring-[#7c6ef5]"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <CurrencyInput value={linha.valorVenda * 100} onChange={(cents) => atualizarLinha(linha.uid, { valorVenda: cents / 100 })} />
                            </td>
                            <td className="p-2 align-middle">
                              <p className="flex h-10 items-center rounded-md bg-white/[0.03] px-2 text-[#e8e4ff] ring-1 ring-white/[0.08]">{formatCurrency(linha.valorVenda * linha.quantidade)}</p>
                            </td>
                            <td className="p-2 text-center align-middle">
                              <button title="Remover produto" onClick={() => removerProduto(linha.uid)} className="grid h-9 w-9 place-items-center rounded-lg text-[#6b66a0] transition-colors hover:bg-[#a22d2d]/25 hover:text-[#f09595]">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-[#8a85b4]">
                            <p>Adicione produtos à nota</p>
                            <button onClick={() => setModalProdutos(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/[0.15] px-4 py-2 text-sm text-[#8a85b4] transition-colors hover:border-[#5dcaa5] hover:text-[#5dcaa5]">
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

            {/* Itens — cards (mobile) */}
            <div className="space-y-3 px-4 pb-2 md:hidden">
              {linhas.length > 0 ? (
                linhas.map((linha) => (
                  <div key={linha.uid} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-[#e8e4ff]">{linha.nome}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#6b66a0]">{linha.produtoId}</p>
                      </div>
                      <button onClick={() => removerProduto(linha.uid)} className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[#a22d2d]/25 text-[#f09595] transition-colors active:bg-[#a22d2d]/40">
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
                          value={linha.quantidade}
                          onChange={(e) =>
                            atualizarLinha(linha.uid, {
                              quantidade: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-10 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-2 text-center text-[#e8e4ff] focus:outline-none focus:ring-2 focus:ring-[#7c6ef5]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#8a85b4]">Valor unitário</label>
                        <CurrencyInput value={linha.valorVenda * 100} onChange={(cents) => atualizarLinha(linha.uid, { valorVenda: cents / 100 })} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-2">
                      <span className="text-xs text-[#8a85b4]">Subtotal</span>
                      <span className="text-sm text-[#e8e4ff]">{formatCurrency(linha.valorVenda * linha.quantidade)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/[0.15] py-10 text-center text-sm text-[#8a85b4]">Adicione produtos à nota</div>
              )}

              <button onClick={() => setModalProdutos(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.15] py-3 text-sm text-[#8a85b4] transition-colors active:border-[#5dcaa5] active:text-[#5dcaa5]">
                <Plus size={16} /> Adicionar produto
              </button>
            </div>

            {/* Resumo */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <span className={labelResumo}>T. Bruto</span>
                  <span className={valorResumo}>{formatCurrency(total)}</span>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <span className={labelResumo}>Desconto</span>
                  <span className={valorResumo}>{formatCurrency(0)}</span>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <span className={labelResumo}>T. Líquido</span>
                  <span className={valorResumo}>{formatCurrency(total)}</span>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <span className={labelResumo}>T. Pago</span>
                  <span className={valorResumo}>{formatCurrency(totalPago)}</span>
                </div>

                <div className={`rounded-lg border p-3 ${pendente > 0 ? "border-[#fac775]/25 bg-[#ba7517]/[0.15]" : "border-[#5dcaa5]/25 bg-[#0f6e56]/[0.15]"}`}>
                  <span className={`block text-[11px] uppercase tracking-wide ${pendente > 0 ? "text-[#fac775]" : "text-[#5dcaa5]"}`}>Pendente</span>
                  <span className={`mt-0.5 block truncate text-sm ${pendente > 0 ? "text-[#fac775]" : "text-[#5dcaa5]"}`}>{formatCurrency(pendente)}</span>
                </div>

                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                  <span className={labelResumo}>F. Pagamento</span>
                  <span className={valorResumo}>{formaPagamento}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-[#15132a] p-3">
          <div className="min-w-0">
            <span className="block text-xs text-[#8a85b4]">Total da nota</span>
            <span className="block truncate text-xl text-[#ece9ff] md:text-2xl">{formatCurrency(total)}</span>
          </div>

          <button
            onClick={handleSalvar}
            disabled={salvarDesabilitado || saving}
            className="flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded bg-gradient-to-r from-[#7c6ef5] to-[#8b7bf7] px-5 text-sm text-white shadow-md transition-all duration-200 hover:from-[#8d80f7] hover:to-[#9b8ff5] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
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
