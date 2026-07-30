import { useEffect, useMemo, useRef, useState } from "react";
import HeaderInterprise from "@/shared/ui/HeaderInterprise";

import { formatDate } from "@/shared/utils/date";
import { formatCurrency } from "@/shared/utils/currency";

import ProductType from "@/shared/domain/produto";
import type { PedidoClienteType, ItemPedidoType, NovoPedidoDto, PedidoUpdateDto } from "@/shared/domain/pedido";

import NoteService from "@/features/vendas/services/note.service";
import ProductService from "@/features/estoque/services/product.service";

import MoneyInput from "@/shared/ui/inputs/MoneyInput";
import { Modal } from "@/shared/ui/Modal";
import { handleDownload } from "@/shared/ui/DownloadButton";
import { useAlert } from "@/shared/ui/Alert";
import PixSection from "@/features/vendas/components/PixSection";

import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";

import { CreditCard, Download, PackageSearch, Plus, Receipt, Save, Trash2, Wallet, X, QrCode, Check, Loader2, Banknote } from "lucide-react";
import { Skeleton, SkeletonInvoiceCard, SkeletonInvoiceHeader, SkeletonInvoiceRow, SkeletonProductList, SkeletonSummary } from "@/shared/ui/skeleton";

import { getPixSettings, savePixSettings, isPixConfigured, generatePixPayload, type PixKeyType } from "@/shared/utils/pix";

const gerarUID = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

type InvoiceProps = {
  id?: string;
  clienteId?: string;
  nome?: string;
  onSaved?: () => void;
};

const TIPOS_PAGAMENTO = ["Dinheiro", "Pix", "Cheque", "Débito", "Negociação", "Crédito"];

const STATUS_STYLE: Record<string, string> = {
  ABERTO: "bg-warning/25 text-warning ring-warning/25",
  PENDENTE: "bg-warning/25 text-warning ring-warning/25",
  FECHADO: "bg-success/30 text-success ring-success/25",
  PAGO: "bg-success/30 text-success ring-success/25",
  CANCELADO: "bg-danger/25 text-danger ring-danger/25",
};

const PIX_KEY_TYPES: { id: PixKeyType; label: string }[] = [
  { id: "cpf", label: "CPF" },
  { id: "cnpj", label: "CNPJ" },
  { id: "phone", label: "Telefone" },
  { id: "email", label: "E-mail" },
  { id: "random", label: "Chave aleatória" },
];

type PagamentoType = {
  id: string;
  tipo: string;
  valor: number;
  dataPagamento: string;
};

const Invoice = ({ id, clienteId, nome, onSaved }: InvoiceProps) => {
  const alert = useAlert();
  const notaRef = useRef<HTMLDivElement>(null);

  /* ─── Loading states ─── */
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [loadingPedido, setLoadingPedido] = useState(!!id);
  const [savingNote, setSavingNote] = useState(false);

  /* ─── Dados ─── */
  const [products, setProducts] = useState<ProductType[]>([]);
  const [pedido, setPedido] = useState<PedidoClienteType | null>(null);
  const [itens, setItens] = useState<ItemPedidoType[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoType[]>([]);

  /* ─── UI state ─── */
  const [busca, setBusca] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState("");
  const [valorPagamento, setValorPagamento] = useState(0);
  const [modalProdutos, setModalProdutos] = useState(false);
  const [modalPagamentos, setModalPagamentos] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [modalPixConfig, setModalPixConfig] = useState(false);

  /* ─── PIX settings ─── */
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [pixOwner, setPixOwner] = useState("");
  const [pixCity, setPixCity] = useState("");

  const pixConfig = Boolean(pixOwner && pixKey && pixCity);

  /* ─── Carrega config PIX salva ─── */
  useEffect(() => {
    const saved = getPixSettings();
    if (saved) {
      setPixKey(saved.key);
      setPixKeyType(saved.keyType);
      setPixOwner(saved.ownerName);
      setPixCity(saved.city);
    }
  }, []);

  /* ─── Carrega produtos ─── */
  useEffect(() => {
    ProductService.getAll()
      .then(({ data }) => setProducts(data.data ?? []))
      .catch((err) => alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível carregar os produtos.")))
      .finally(() => setLoadingProdutos(false));
  }, []);

  /* ─── Carrega pedido ─── */
  useEffect(() => {
    if (!id) return;
    console.log("CUIDA'");

    NoteService.getById(id)
      .then((pedidoData) => {
        if (!pedidoData) {
          alert.error("Pedido não encontrado", "Não localizamos esse pedido no sistema.");
          return;
        }
        setPedido(pedidoData);
    
        const itensOriginais = pedidoData.pedido.itensPedido && pedidoData.pedido.itensPedido.length > 0 ? pedidoData.pedido.itensPedido : (pedidoData.pedido.itensPedido ?? []);
        setItens(itensOriginais.map((item: ItemPedidoType) => ({ ...item })));
      })
      .catch((err) => alert.error(getErrorTitle(err), extractErrorMessage(err, "Erro ao carregar o pedido.")))
      .finally(() => setLoadingPedido(false));
  }, [id]);

  /* ─── Salvar config PIX ─── */
  const salvarPixConfig = () => {
    if (!pixKey || !pixOwner || !pixCity) {
      alert.warning("Preencha todos os campos", "Chave PIX, nome e cidade são obrigatórios.");
      return;
    }
    savePixSettings({ key: pixKey, keyType: pixKeyType, ownerName: pixOwner, city: pixCity });
    setModalPixConfig(false);
    alert.success("Chave PIX salva!", "A configuração foi salva no navegador.");
  };

  /* ─── Produtos ─── */
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

  const produtosFiltrados = useMemo(() => products.filter((p) => p.nome?.toLowerCase().includes(busca.toLowerCase())), [products, busca]);

  /* ─── Totais ─── */
  const totalLiquido = useMemo(() => itens.reduce((acc, l) => acc + l.valorVendaItem * l.quantidadeItem, 0), [itens]);
  const totalBruto = useMemo(() => itens.reduce((acc, l) => acc + l.produto.valorProduto * l.quantidadeItem, 0), [itens]);
  const totalDesconto = Math.max(totalBruto - totalLiquido, 0);
  const total = totalLiquido;
  const temDesconto = totalDesconto > 0 && totalBruto > 0;

  const totalPago = useMemo(() => pagamentos.reduce((acc, p) => acc + Number(p.valor), 0), [pagamentos]);
  const pendente = Math.max(total - totalPago, 0);
  const formaPagamento = pagamentos.length > 0 ? (pagamentos.every((p) => p.tipo === pagamentos[0].tipo) ? pagamentos[0].tipo : "Misto") : "Não consta";

  /* ─── PIX payload ─── */
  const pixPayload = useMemo(() => {
    const settings = getPixSettings();
    if (!settings || total <= 0) return "";
    return generatePixPayload({
      pixKey: settings.key,
      pixKeyType: settings.keyType,
      merchantName: settings.ownerName,
      merchantCity: settings.city,
      amount: total,
      transactionId: id || `nota-${Date.now()}`,
      description: "Nota de venda",
    });
  }, [total, id]);

  /* ─── Nota CRUD ─── */
  const montarItens = () =>
    itens.map((item) => ({
      produtoId: item.produto.produtoId,
      quantidade: item.quantidadeItem,
      valorVenda: item.valorVendaItem,
    }));

  const handleSalvar = async () => {
    if (!clienteId) {
      alert.warning("Sem cliente", "Selecione um cliente para emitir a nota.");
      return;
    }
    if (itens.length === 0) {
      alert.warning("Nota vazia", "Adicione ao menos um produto à nota.");
      return;
    }
    if (itens.every((l) => l.quantidadeItem <= 0)) {
      alert.warning("Quantidade inválida", "Informe a quantidade dos produtos.");
      return;
    }

    // Exige configurar PIX antes da primeira nota
    if (!id && !isPixConfigured()) {
      setModalPixConfig(true);
      return;
    }

    setSavingNote(true);
    try {
      if (id) {
        // UPDATE — usa PedidoUpdateDto
        console.log("oiii'")
        const payload: PedidoUpdateDto = { clienteId, itensPedido: montarItens() };
        await NoteService.update(payload, id);
        alert.success("Nota alterada!", "As alterações foram salvas com sucesso.");
      } else {
        // CREATE — usa NovoPedidoDto
        const payload: NovoPedidoDto = { clienteId, itensPedido: montarItens() };
        await NoteService.create(payload);
        alert.success("Nota criada!", "A venda foi registrada com sucesso.");
      }
      onSaved?.();
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Erro ao salvar a nota. Tente novamente."));
    } finally {
      setSavingNote(false);
    }
  };

  const handleExcluir = async () => {
    if (!id) return;
    try {
      await NoteService.delete(id);
      setModalExcluir(false);
      alert.success("Nota excluída!", "A nota foi removida permanentemente.");
      onSaved?.();
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível excluir a nota."));
    }
  };

  /* ─── Pagamentos: local state (fallback se API não existir) ─── */
  const gerarIdPagamento = () => `pag-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const handleAdicionarPagamento = () => {
    if (!tipoPagamento || valorPagamento <= 0) return;
    if (!id) {
      alert.warning("Salve a nota primeiro", "A nota precisa ser salva antes de registrar pagamentos.");
      return;
    }

    const novoPagamento: PagamentoType = {
      id: gerarIdPagamento(),
      tipo: tipoPagamento,
      valor: valorPagamento,
      dataPagamento: new Date().toISOString(),
    };

    setPagamentos((prev) => [...prev, novoPagamento]);
    setTipoPagamento("");
    setValorPagamento(0);
    alert.toast("success", "Pagamento registrado!", undefined, { position: "bottom-right", timer: 2000 });
  };

  const handleRemoverPagamento = (pagamentoId: string) => {
    setPagamentos((prev) => prev.filter((p) => p.id !== pagamentoId));
    alert.toast("success", "Pagamento removido!", undefined, { position: "bottom-right", timer: 2000 });
  };

  const statusPedido = pedido?.pedido?.pedidoStatus;

  const salvarDesabilitado = !clienteId || itens.length === 0;

  /* ─── Classes repetidas ─── */
  const btnToolbar = "grid h-10 w-10 place-items-center rounded-xl ring-1 transition-colors duration-200 active:scale-95";
  const lblResumo = "block text-[11px] uppercase tracking-[0.08em] text-faint";
  const valResumo = "mt-1 block truncate text-sm text-ink";
  const campoBase = "h-11 w-full rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 text-sm text-ink placeholder-mist outline-none transition-colors focus:border-accent/60 focus:bg-fg/[0.06]";

  return (
    <div className="flex h-full flex-col">
      {/* ════════════ MODAL: CONFIG PIX ════════════ */}
      <Modal open={modalPixConfig} onClose={() => setModalPixConfig(false)} title="Configurar PIX" subtitle="Informe sua chave para receber pagamentos" accent="rgb(var(--accent))" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-[12px] leading-relaxed text-mist">Esta chave será usada para gerar o QR Code na nota. Os dados ficam salvos no navegador.</p>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-[0.08em] text-faint">Tipo de chave</label>
            <div className="flex flex-wrap gap-1.5">
              {PIX_KEY_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPixKeyType(t.id)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${pixKeyType === t.id ? "border-accent/50 bg-accent/15 text-accent-soft" : "border-fg/[0.08] text-mist hover:border-fg/[0.15]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder={pixKeyType === "phone" ? "+55 11 99999-9999" : pixKeyType === "email" ? "email@exemplo.com" : "000.000.000-00"} className={campoBase} />
          <input value={pixOwner} onChange={(e) => setPixOwner(e.target.value)} placeholder="Nome do titular" className={campoBase} />
          <input value={pixCity} onChange={(e) => setPixCity(e.target.value)} placeholder="Cidade" className={campoBase} />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setModalPixConfig(false)} className="flex-1 cursor-pointer rounded-xl border border-fg/[0.08] bg-fg/[0.04] py-2.5 text-sm text-mist transition-colors hover:bg-fg/[0.08]">
              Cancelar
            </button>
            <button type="button" onClick={salvarPixConfig} className="flex-1 cursor-pointer rounded-xl bg-accent py-2.5 text-sm text-white transition-all hover:brightness-110">
              Salvar
            </button>
          </div>
        </div>
      </Modal>

      {/* ════════════ MODAL: PRODUTOS ════════════ */}
      <Modal
        open={modalProdutos}
        onClose={() => {
          setModalProdutos(false);
          setBusca("");
        }}
        title="Adicionar produto"
        subtitle="Toque para incluir na nota"
        accent="rgb(var(--success))"
      >
        <div className="space-y-3">
          <div className="relative">
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className={`${campoBase} pl-9 focus:border-success/60`} />
            <PackageSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loadingProdutos ? (
              <SkeletonProductList rows={6} />
            ) : produtosFiltrados.length === 0 ? (
              <p className="py-10 text-center text-sm text-mist">Nenhum produto encontrado</p>
            ) : (
              <ul className="space-y-1">
                {produtosFiltrados.map((p) => (
                  <li key={String(p.id)}>
                    <button onClick={() => adicionarProduto(p)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-fg/[0.06]">
                      <span className="min-w-0 truncate text-sm text-ink">{p.nome}</span>
                      <span className="flex items-center gap-2">
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

      {/* ════════════ MODAL: PAGAMENTOS ════════════ */}
      <Modal open={modalPagamentos} onClose={() => setModalPagamentos(false)} title="Pagamentos" subtitle="Registre os pagamentos recebidos" accent="rgb(var(--accent))">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value)} className={`${campoBase} appearance-none pl-9`}>
                <option disabled value="">
                  Tipo de pagamento
                </option>
                {TIPOS_PAGAMENTO.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <CreditCard size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MoneyInput value={valorPagamento} onChange={setValorPagamento} placeholder="R$ 0,00" withIcon className={`${campoBase} pl-9`} />
                <Banknote size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
              </div>
              <button onClick={handleAdicionarPagamento} disabled={!tipoPagamento || valorPagamento <= 0 || !id} className="grid h-11 w-12 shrink-0 place-items-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-soft disabled:opacity-40">
                <Plus size={16} />
              </button>
            </div>
            {!id && <p className="text-[11px] text-warning">Salve a nota primeiro para registrar pagamentos.</p>}
          </div>

          {pagamentos.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-sm text-mist">
              <Wallet size={26} className="mb-2 opacity-50" />
              Nenhum pagamento registrado
            </div>
          ) : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">
              {pagamentos.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fg/[0.05]">
                      <Receipt size={15} className="text-mist" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate text-sm capitalize text-ink">{p.tipo}</span>
                      <span className="block text-xs text-mist">{formatDate(p.dataPagamento, "-")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums text-ink">{formatCurrency(p.valor)}</span>
                    <button onClick={() => handleRemoverPagamento(p.id)} className="grid h-7 w-7 place-items-center rounded-lg text-mist transition-colors hover:bg-danger/25 hover:text-danger">
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

      {/* ════════════ MODAL: EXCLUIR ════════════ */}
      <Modal open={modalExcluir} onClose={() => setModalExcluir(false)} title="Excluir nota" subtitle="Essa ação não pode ser desfeita" accent="rgb(var(--danger))" maxWidth="max-w-sm">
        <p className="text-sm text-mist">Deseja realmente excluir esta nota?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setModalExcluir(false)} className="h-10 rounded-xl bg-fg/[0.05] px-4 text-sm text-ink transition-colors hover:bg-fg/[0.1]">
            Cancelar
          </button>
          <button onClick={handleExcluir} className="h-10 rounded-xl bg-danger px-4 text-sm text-white transition-colors hover:bg-danger">
            Excluir
          </button>
        </div>
      </Modal>

      {/* ════════════ NOTA ════════════ */}
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-fg/[0.06]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fg/[0.05] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {loadingPedido ? (
              <Skeleton className="h-5 w-24 rounded-full" />
            ) : statusPedido ? (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] tracking-wide ring-1 ${STATUS_STYLE[statusPedido] ?? "bg-fg/[0.05] text-mist"}`}>{statusPedido}</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-accent/[0.12] px-3 py-1 text-[11px] text-accent-soft ring-1 ring-accent/25">NOVA NOTA</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button title={pixConfig ? "PIX configurado" : "Configurar PIX"} onClick={() => setModalPixConfig(true)} className={`${btnToolbar} ${pixConfig ? "bg-success/[0.1] text-success ring-success/20" : "bg-accent/[0.1] text-accent-soft ring-accent/20"}`}>
              {pixConfig ? <Check size={19} /> : <QrCode size={19} />}
            </button>
            <button title="Adicionar produto" onClick={() => setModalProdutos(true)} className={`${btnToolbar} bg-success/[0.1] text-success ring-success/20 hover:bg-success hover:text-success`}>
              <PackageSearch size={19} />
            </button>
            <button title="Pagamentos" onClick={() => setModalPagamentos(true)} className={`relative ${btnToolbar} bg-accent/[0.1] text-accent-soft ring-accent/20 hover:bg-accent hover:text-white`}>
              <Wallet size={19} />
              {total > 0 && pendente > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-surface" />}
            </button>
            <button title="Baixar nota" onClick={() => handleDownload(notaRef)} className={`${btnToolbar} bg-accent-soft/[0.1] text-accent-soft ring-accent-soft/20 hover:bg-accent-soft hover:text-accent`}>
              <Download size={19} />
            </button>
            <button title="Excluir" onClick={() => (id ? setModalExcluir(true) : alert.warning("Nota não salva", "Essa nota não foi salva."))} className={`${btnToolbar} bg-danger/[0.1] text-danger ring-danger/20 hover:bg-danger hover:text-white`}>
              <Trash2 size={19} />
            </button>
          </div>
        </div>

        {/* Conteúdo da nota (capturado no PNG) */}
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
                    <h2 className="text-xl leading-none text-ink md:text-2xl">Nota de Venda</h2>
                    <p className="mt-1.5 text-sm text-mist">Data: {formatDate(pedido?.pedido?.dataPedido ?? new Date())}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Cliente */}
            <div className="px-5 pt-5">
              <label className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">Cliente</label>
              {loadingPedido ? (
                <Skeleton className="h-11 rounded-xl" />
              ) : (
                <div className="flex h-11 items-center gap-2 rounded-xl border border-fg/[0.06] bg-fg/[0.04] px-3 text-sm text-ink">
                  <span>👤</span>
                  <span className="truncate">{pedido?.nomeCliente || nome || "Nome do cliente"}</span>
                </div>
              )}
            </div>

            {/* Tabela de itens */}
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
                          <tr key={item.itemPedidoId} className="transition-colors hover:bg-fg/[0.03]">
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
                                onChange={(e) => atualizarLinha(item.itemPedidoId, { quantidadeItem: Math.max(0, Number(e.target.value) || 0) })}
                                className="h-10 w-20 rounded-lg border border-fg/[0.06] bg-fg/[0.03] px-2 text-center tabular-nums text-ink outline-none focus:border-accent/60"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <div className="flex items-center gap-1.5">
                                <MoneyInput value={item.valorVendaItem} onChange={(v) => atualizarLinha(item.itemPedidoId, { valorVendaItem: v })} className="h-10 w-28 rounded-lg border border-fg/[0.06] bg-fg/[0.03] px-2 text-center tabular-nums text-ink outline-none focus:border-accent/60" />
                                {item.valorVendaItem !== item.produto.valorProduto && <span className="text-[10px] text-mist line-through">{formatCurrency(item.produto.valorProduto)}</span>}
                              </div>
                            </td>
                            <td className="p-2 align-middle">
                              <p className="flex h-10 items-center rounded-lg bg-fg/[0.03] px-3 tabular-nums text-ink">{formatCurrency(item.valorVendaItem * item.quantidadeItem)}</p>
                            </td>
                            <td className="p-2 text-center align-middle">
                              <button title="Remover" onClick={() => removerProduto(item.itemPedidoId)} className="grid h-9 w-9 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/25 hover:text-danger">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-mist">
                            <p className="text-sm">Nenhum produto na nota</p>
                            <button onClick={() => setModalProdutos(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-fg/[0.12] px-4 py-2 text-sm text-mist hover:border-success/60 hover:text-success">
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

            {/* Mobile */}
            <div className="space-y-3 px-5 pt-4 md:hidden">
              {loadingPedido ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonInvoiceCard key={i} />)
              ) : itens.length > 0 ? (
                itens.map((item) => (
                  <div key={item.itemPedidoId} className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm text-ink">{item.produto.nomeProduto}</p>
                      <button onClick={() => removerProduto(item.itemPedidoId)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger/20 text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-mist">Qtde</label>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={item.quantidadeItem}
                          onChange={(e) => atualizarLinha(item.itemPedidoId, { quantidadeItem: Math.max(0, Number(e.target.value) || 0) })}
                          className="h-10 w-full rounded-lg border border-fg/[0.06] bg-fg/[0.03] px-2 text-center tabular-nums text-ink outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-mist">V. Unit</label>
                        <div className="flex items-center gap-1.5">
                          <MoneyInput value={item.valorVendaItem} onChange={(v) => atualizarLinha(item.itemPedidoId, { valorVendaItem: v })} className="h-10 w-full rounded-lg border border-fg/[0.06] bg-fg/[0.03] px-2 text-center tabular-nums text-ink outline-none" />
                          {item.valorVendaItem !== item.produto.valorProduto && <span className="text-[10px] text-mist line-through">{formatCurrency(item.produto.valorProduto)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-fg/[0.03] px-3 py-2">
                      <span className="text-xs text-mist">Subtotal</span>
                      <span className="text-sm tabular-nums text-ink">{formatCurrency(item.valorVendaItem * item.quantidadeItem)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-fg/[0.12] py-10 text-center text-sm text-mist">Nenhum produto</div>
              )}
              {!loadingPedido && (
                <button onClick={() => setModalProdutos(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-fg/[0.12] py-3 text-sm text-mist hover:border-success hover:text-success">
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
                    <span className={lblResumo}>T. Bruto</span>
                    <span className={`${valResumo} tabular-nums`}>{formatCurrency(totalBruto)}</span>
                  </div>
                  <div className={`rounded-xl border p-3 ${temDesconto ? "border-warning/20 bg-warning/[0.12]" : "border-fg/[0.06] bg-fg/[0.03]"}`}>
                    <span className={`${lblResumo} ${temDesconto ? "text-warning" : "text-faint"}`}>Desconto</span>
                    <span className={`mt-1 block truncate text-sm tabular-nums ${temDesconto ? "text-warning" : "text-ink"}`}>{temDesconto ? `- ${formatCurrency(totalDesconto)}` : formatCurrency(0)}</span>
                  </div>
                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={lblResumo}>T. Líquido</span>
                    <span className={`${valResumo} tabular-nums`}>{formatCurrency(totalLiquido)}</span>
                  </div>
                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={lblResumo}>T. Pago</span>
                    <span className={`${valResumo} tabular-nums`}>{formatCurrency(totalPago)}</span>
                  </div>
                  <button onClick={() => setModalPagamentos(true)} className={`rounded-xl border p-3 text-left transition-colors hover:bg-fg/[0.06] ${pendente > 0 ? "border-warning/20 bg-warning/[0.12]" : "border-success/20 bg-success/[0.12]"}`}>
                    <span className={`${lblResumo} ${pendente > 0 ? "text-warning" : "text-success"}`}>Pendente</span>
                    <span className={`mt-1 block truncate text-sm tabular-nums ${pendente > 0 ? "text-warning" : "text-success"}`}>{formatCurrency(pendente)}</span>
                  </button>
                  <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-3">
                    <span className={lblResumo}>F. Pagamento</span>
                    <span className={valResumo}>{formaPagamento}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── PIX → componente separado ─── */}
          <PixSection pixPayload={pixPayload} />
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-fg/[0.06] bg-surface px-4 py-3">
          <div className="min-w-0">
            <span className={lblResumo}>Total da nota</span>
            {loadingPedido ? <Skeleton className="mt-1 h-7 w-32" /> : <span className="block truncate text-xl tabular-nums text-ink md:text-2xl">{formatCurrency(total)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModalPagamentos(true)} disabled={loadingPedido} className="flex h-12 items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.1] px-4 text-sm text-accent-soft transition-colors hover:bg-accent/20 disabled:opacity-40">
              <Wallet size={18} /> Pagamento
              {pendente > 0 && <span className="ml-1 rounded-full bg-warning/25 px-1.5 py-0.5 text-[10px] text-warning">{formatCurrency(pendente)}</span>}
            </button>
            <button onClick={handleSalvar} disabled={salvarDesabilitado || savingNote || loadingPedido} className="flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-sm text-white transition-all hover:bg-accent-soft active:scale-[0.98] disabled:opacity-40">
              {savingNote ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {savingNote ? "Salvando..." : !id ? "Gerar Nota" : "Salvar"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Invoice;
