import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ShoppingCart, Plus, Receipt, UserCheck, DollarSign, Wallet, AlertCircle, Hash, TrendingUp, CalendarDays, ChevronRight, Search, UserPlus, PackagePlus, FileText } from "lucide-react";

import { useNavigate } from "react-router-dom";

import Invoice from "@/features/vendas/components/Invoice";
import { PageScreen, PageToolbar, PrimaryAction, GhostAction } from "@/shared/ui/PageShell";
import Sheet from "@/shared/ui/Sheet";
import PDVMobile, { type VendaResumo } from "@/features/vendas/components/PDVMobile";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import useAuth from "@/features/auth/store/auth.store";

import useVendaStore from "@/features/vendas/store/venda.store";
import useClienteStore from "@/features/clientes/store/cliente.store";
import useSincronizacao from "@/shared/realtime/useSincronizacao";
import ClienteForm from "@/features/clientes/components/ClienteForm";
import { ProdutoForm } from "@/features/estoque/components/ProdutoForm";
import ProductService from "@/features/estoque/services/product.service";
import type { ProductFormData } from "@/features/estoque/schema/product.schema";
import type { ClienteFormData } from "@/features/clientes/schema/cliente.schema";
import { Modal } from "@/shared/ui/Modal";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatCurrency } from "@/shared/utils/currency";

import { estaAberto as estaAberta, totalDoPedido } from "@/shared/domain/pedido";
import { formatTime as horaVenda, formatDate as dataVenda, isSameDay as ehHoje, isSameMonth as ehDesteMes } from "@/shared/utils/date";
import { getInitials as iniciais, formatDocument } from "@/shared/utils/format";
import { TabsPdv } from "@/features/vendas/components/TabsPdv";
import { Selo } from "@/shared/ui/StatusBadge";

// Só o essencial: quem é o cliente e (se existir) qual pedido.
/* `clienteId` opcional: orçamento é montado para nome livre, sem cadastro. */
type NotaAberta = { id?: string; clienteId?: string; nome?: string; orcamento?: boolean };

/* --------------------------- Componentes locais --------------------------- */

const TONES = {
  accent: "bg-accent/[0.15] text-accent-soft ring-accent/20",
  success: "bg-success/15 text-success ring-success/20",
  warning: "bg-warning/15 text-warning ring-warning/20",
  neutral: "bg-fg/[0.06] text-mist ring-fg/10",
} as const;

const Kpi = ({ icon, label, value, tone = "neutral" }: { icon: ReactNode; label: string; value: string; tone?: keyof typeof TONES }) => (
  <div className="card-interactive glass-sheen p-4">
    <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset ${TONES[tone]}`}>{icon}</div>
    <p className="text-[11px] text-faint">{label}</p>
    <p className="nums mt-0.5 text-xl tracking-tight text-ink">{value}</p>
  </div>
);

const TOM_PAGAMENTO = { PAGA: "sucesso", PARCIAL: "info", ABERTA: "alerta" } as const;
const ROTULO_PAGAMENTO = { PAGA: "Pago", PARCIAL: "Parcial", ABERTA: "Em aberto" } as const;

const StatusBadge = ({ status }: { status: keyof typeof TOM_PAGAMENTO }) => (
  <Selo tom={TOM_PAGAMENTO[status]}>{ROTULO_PAGAMENTO[status]}</Selo>
);

const Avatar = ({ name, size = "md" }: { name?: string; size?: "sm" | "md" }) => {
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-[11px]";
  return <div className={`flex ${dim} shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-gradient-to-br from-accent/30 to-accent-soft/10 text-accent-soft`}>{iniciais(name)}</div>;
};

/**
 * Deriva o status de pagamento pelo valor já pago (não só pelo status do
 * pedido) — assim uma nota com pagamento parcial aparece como "Parcial",
 * não como "Em aberto" cheio.
 */
const statusPagamentoVenda = (v: { pedido: { valorPago?: number } }, total: number): "ABERTA" | "PARCIAL" | "PAGA" => {
  const pago = Number(v.pedido.valorPago ?? 0);
  if (pago <= 0) return "ABERTA";
  if (pago >= total) return "PAGA";
  return "PARCIAL";
};

const SearchBox = ({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
  <div className={`glass-subtle flex items-center gap-2 rounded-xl px-3 transition-all focus-within:border-accent/50 focus-within:shadow-glow ${className}`}>
    <Search className="h-4 w-4 shrink-0 text-muted" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full flex-1 bg-transparent py-2 text-[13px] text-ink outline-none placeholder:text-faint" />
  </div>
);

/* --------------------------------- Página --------------------------------- */

/** "Hoje", "Ontem" ou a data — quem opera pensa assim, não em 02/08/2026. */
const rotuloDoDia = (br: string): string => {
  const hoje = dataVenda(new Date());

  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  if (br === hoje) return "Hoje";
  if (br === dataVenda(ontem)) return "Ontem";

  return br;
};

const PontoDeVenda = () => {
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const { user } = useAuth();

  const vendas = useVendaStore((s) => s.vendas);
  const fetchVendas = useVendaStore((s) => s.fetchVendas);
  const clientes = useClienteStore((s) => s.clientes);
  const fetchClientes = useClienteStore((s) => s.fetchClientes);

  const [novaVendaOpen, setNovaVendaOpen] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [busca, setBusca] = useState("");
  const [somenteHoje, setSomenteHoje] = useState(true);
  const [notaAberta, setNotaAberta] = useState<NotaAberta | null>(null);

  /* Cadastros no próprio PDV: parar a venda para ir até Clientes ou Estoque e
     voltar é o que faz o operador desistir e vender "no caderno". */
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [novoProdutoOpen, setNovoProdutoOpen] = useState(false);

  /* Orçamento volta a abrir pela nota (mesma tela, modo orçamento): um modal
     só de nome do cliente e a nota abre com título "ORÇAMENTO", sem pagamento. */
  const [orcamentoOpen, setOrcamentoOpen] = useState(false);
  const [nomeOrcamento, setNomeOrcamento] = useState("");
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);

  const alert = useAlert();
  const criarCliente = useClienteStore((s) => s.criarCliente);

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  /** Cadastra e já abre a venda para o cliente novo — é o motivo de ter cadastrado. */
  const handleNovoCliente = async (dados: ClienteFormData) => {
    setSalvandoCadastro(true);

    try {
      await criarCliente(dados);
      await fetchClientes(true);

      setNovoClienteOpen(false);
      alert.success("Cliente cadastrado!", "Agora é só lançar os produtos.");

      const criado = useClienteStore.getState().clientes.find((c) => c.nome === dados.nome);
      if (criado?.id) abrirNota({ clienteId: String(criado.id), nome: criado.nome });
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível cadastrar o cliente."));
    } finally {
      setSalvandoCadastro(false);
    }
  };

  const handleNovoProduto = async (dados: ProductFormData) => {
    setSalvandoCadastro(true);

    try {
      await ProductService.create(dados);

      setNovoProdutoOpen(false);
      alert.success("Produto cadastrado!", "Ele já pode ser lançado na nota.");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível cadastrar o produto."));
    } finally {
      setSalvandoCadastro(false);
    }
  };

  // async/await como no commit `altera pra async`, mas preservando o tratamento
  // de erro: resposta vazia zera a lista em vez de manter dados antigos.
  const carregarVendas = async () => {
    await fetchVendas(true);
  };

  useEffect(() => {
    fetchVendas();
    fetchClientes();
  }, [fetchVendas, fetchClientes]);

  /* O PDV é a tela mais compartilhada da loja: dois balcões abertos ao mesmo
     tempo é o normal, não a exceção. */
  useSincronizacao(["pedidos", "clientes", "produtos"], () => {
    fetchVendas(true);
    fetchClientes(true);
  });

  const vendasVisiveis = useMemo(() => {
    /* "Todas" trazia o histórico inteiro da loja: em janeiro ainda cabe, no
       segundo ano vira uma lista de milhares que ninguém rola. O PDV é uma tela
       de operação — o que importa é hoje, e o mês corrente como contexto. */
    const base = somenteHoje ? vendas.filter((v) => ehHoje(v.pedido.dataPedido)) : vendas.filter((v) => ehDesteMes(v.pedido.dataPedido));
    return [...base].sort((a, b) => +new Date(b.pedido.dataPedido) - +new Date(a.pedido.dataPedido));
  }, [vendas, somenteHoje]);

  const vendasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return vendasVisiveis;
    return vendasVisiveis.filter((v) => v.nomeCliente?.toLowerCase().includes(termo));
  }, [vendasVisiveis, busca]);

  /**
   * Vendas agrupadas por dia, do mais recente para o mais antigo.
   *
   * Uma lista corrida de um mês inteiro não tem onde o olho descansar: a venda
   * das 14h de ontem encosta na das 9h de hoje e as duas parecem a mesma coisa.
   * Com o dia como cabeçalho — e o total daquele dia ao lado — a lista vira um
   * extrato, que é como o dono já pensa o movimento da loja.
   */
  const gruposPorDia = useMemo(() => {
    const mapa = new Map<string, { data: string; vendas: typeof vendasFiltradas; total: number }>();

    for (const venda of vendasFiltradas) {
      const chave = dataVenda(venda.pedido.dataPedido);
      const grupo = mapa.get(chave) ?? { data: chave, vendas: [], total: 0 };

      grupo.vendas.push(venda);
      grupo.total += totalDoPedido(venda);
      mapa.set(chave, grupo);
    }

    /* Ordena pela data real, não pelo texto: "02/08" e "10/07" comparados como
       string colocariam julho na frente de agosto. */
    const paraOrdem = (br: string) => {
      const [d, m, a] = br.split("/");
      return `${a}${m}${d}`;
    };

    return Array.from(mapa.values()).sort((x, y) => paraOrdem(y.data).localeCompare(paraOrdem(x.data)));
  }, [vendasFiltradas]);

  const faturamento = vendasVisiveis.reduce((acc, v) => acc + totalDoPedido(v), 0);
  const recebido = vendasVisiveis.reduce((acc, v) => acc + Number(v.pedido.valorPago ?? 0), 0);
  const pendente = Math.max(faturamento - recebido, 0);
  const ticketMedio = vendasVisiveis.length ? faturamento / vendasVisiveis.length : 0;

  // Sem busca mostra os primeiros clientes; com busca, os que casam.
  const listaClientes = useMemo(() => {
    const termo = nomeCliente.trim().toLowerCase();
    if (!termo) return clientes.slice(0, 8);
    return clientes.filter((c) => c.nome?.toLowerCase().includes(termo)).slice(0, 8);
  }, [clientes, nomeCliente]);

  const clienteSelecionavel = useMemo(() => {
    const termo = nomeCliente.trim().toLowerCase();
    return clientes.find((c) => c.nome?.toLowerCase() === termo);
  }, [clientes, nomeCliente]);

  const abrirNota = (nota: NotaAberta) => {
    setNotaAberta(nota);
    setNovaVendaOpen(false);
    setNomeCliente("");
  };

  /** Abre a nota em modo orçamento, com o nome digitado — sem cadastrar. */
  const abrirOrcamento = () => {
    const nomeLimpo = nomeOrcamento.trim();

    if (!nomeLimpo) {
      alert.warning("Informe o nome", "O orçamento precisa saber para quem é.");
      return;
    }

    setOrcamentoOpen(false);
    setNomeOrcamento("");
    abrirNota({ nome: nomeLimpo, orcamento: true });
  };

  const fecharNota = () => {
    setNotaAberta(null);
    carregarVendas();
  };

  /* No celular a tela é outra — ver `PDVMobile`. A lógica acima é a mesma;
     muda só a apresentação e os modais, que viram folhas. */
  const resumoMobile: VendaResumo[] = vendasFiltradas.map((v) => {
    const total = totalDoPedido(v);
    return {
      pedidoId: v.pedido.pedidoId,
      clienteId: v.clienteId,
      nomeCliente: v.nomeCliente,
      data: v.pedido.dataPedido,
      total,
      pago: Number(v.pedido.valorPago ?? 0),
      status: statusPagamentoVenda(v, total),
    };
  });

  if (mobile) {
    return (
      <div className="relative h-full w-full overflow-y-auto text-ink">
        <PDVMobile
          nomeUsuario={user?.nome}
          vendas={resumoMobile}
          faturamento={faturamento}
          recebido={recebido}
          pendente={pendente}
          somenteHoje={somenteHoje}
          onPeriodo={setSomenteHoje}
          busca={busca}
          onBusca={setBusca}
          onAbrirNota={(v) => abrirNota({ id: v.pedidoId, clienteId: v.clienteId, nome: v.nomeCliente })}
          onNovaVenda={() => setNovaVendaOpen(true)}
          onNovoOrcamento={() => setOrcamentoOpen(true)}
        />

        {/* Modal de nome do orçamento no mobile — folha. */}
        <Sheet open={orcamentoOpen} onClose={() => setOrcamentoOpen(false)} title="Novo orçamento" subtitle="Para quem é a proposta?">
          <div className="flex flex-col gap-3 pt-1">
            <input
              autoFocus
              value={nomeOrcamento}
              onChange={(e) => setNomeOrcamento(e.target.value)}
              placeholder="Nome do cliente"
              onKeyDown={(e) => e.key === "Enter" && abrirOrcamento()}
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent/60"
            />
            <p className="text-[11.5px] leading-relaxed text-faint">Não precisa ter cadastro. A nota abre em modo orçamento — sem pagamento.</p>
            <button type="button" onClick={abrirOrcamento} className="min-h-[42px] rounded-xl bg-accent px-5 text-[13px] text-white transition-all hover:brightness-110 active:scale-[0.99]">
              Montar orçamento
            </button>
          </div>
        </Sheet>

        {/* Escolher cliente — folha, não modal centralizado. */}
        <Sheet open={novaVendaOpen} onClose={() => setNovaVendaOpen(false)} title="Iniciar venda" subtitle="Escolha o cliente" altura="cheia">
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center gap-2.5 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-4 focus-within:border-accent/50">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Buscar cliente" className="w-full flex-1 bg-transparent py-3 text-[16px] text-ink outline-none placeholder:text-faint" />
            </div>

            {listaClientes.length > 0 ? (
              listaClientes.map((c, i) => (
                <button
                  key={c.id ?? i}
                  type="button"
                  onClick={() => c.id && abrirNota({ clienteId: String(c.id), nome: c.nome })}
                  className="focus-ring flex min-h-[60px] items-center gap-3 border-b border-fg/[0.05] text-left active:bg-fg/[0.04]"
                >
                  <Avatar name={c.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] text-ink">{c.nome}</span>
                    {c.cpfCnpj && <span className="block truncate text-[12px] text-faint">{formatDocument(c.cpfCnpj)}</span>}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-[14px] text-ink">{nomeCliente.trim() ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
                <button
                  type="button"
                  onClick={() => {
                    setNovaVendaOpen(false);
                    navigate("/clientes");
                  }}
                  className="focus-ring min-h-[44px] rounded-2xl bg-accent px-5 text-[14px] text-white"
                >
                  Ir para Clientes
                </button>
              </div>
            )}
          </div>
        </Sheet>

        {/* A nota ocupa a tela inteira: é onde a venda (ou o orçamento) acontece. */}
        <Sheet open={!!notaAberta} onClose={fecharNota} title={notaAberta?.orcamento ? "Novo orçamento" : notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} altura="cheia">
          {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} onSaved={fecharNota} modoOrcamento={notaAberta.orcamento} />}
        </Sheet>
      </div>
    );
  }

  return (
    <PageScreen icon={<ShoppingCart className="h-5 w-5" />} title="Ponto de Venda" subtitle="Registre vendas e monte orçamentos" tabs={TabsPdv}>
        {/* Ações da tela — dentro do outlet, não no cabeçalho */}
        <PageToolbar
          left={
            <span className="glass-subtle hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-mist sm:flex">
              <CalendarDays className="h-3.5 w-3.5 text-accent-soft" />
              <span className="capitalize">{hoje}</span>
            </span>
          }
        >
          <GhostAction icon={<UserPlus size={15} />} onClick={() => setNovoClienteOpen(true)}>
            Novo cliente
          </GhostAction>
          <GhostAction icon={<PackagePlus size={15} />} onClick={() => setNovoProdutoOpen(true)}>
            Novo produto
          </GhostAction>
          {/* Cor diferente de propósito: orçamento não é venda, e dois botões
              iguais lado a lado fariam o operador clicar no errado com pressa. */}
          <button
            type="button"
            onClick={() => setOrcamentoOpen(true)}
            className="focus-ring flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-warning/40 bg-warning/[0.12] px-3.5 text-[12.5px] text-warning transition-colors hover:bg-warning/20"
          >
            <FileText className="h-4 w-4" />
            Novo orçamento
          </button>

          <PrimaryAction icon={<Plus className="h-4 w-4" />} onClick={() => setNovaVendaOpen(true)}>
            Nova venda
          </PrimaryAction>
        </PageToolbar>

        {/* KPIs */}
        <div className="stagger grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<DollarSign size={16} />} label="Faturamento" value={formatCurrency(faturamento)} tone="accent" />
          <Kpi icon={<Wallet size={16} />} label="Recebido" value={formatCurrency(recebido)} tone="success" />
          <Kpi icon={<AlertCircle size={16} />} label="Pendente" value={formatCurrency(pendente)} tone="warning" />
          <Kpi icon={<Hash size={16} />} label="Vendas" value={String(vendasVisiveis.length)} tone="neutral" />
        </div>

        {/* Card da lista */}
        <div className="card glass-sheen flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-fg/[0.07] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.15] ring-1 ring-inset ring-accent/20">
                <Receipt className="h-4 w-4 text-accent-soft" />
              </div>
              <div>
                <h2 className="text-[13px] text-ink">{somenteHoje ? "Vendas de hoje" : "Vendas do mês"}</h2>
                <p className="text-[11px] text-faint">
                  {vendasVisiveis.length} {vendasVisiveis.length === 1 ? "venda" : "vendas"}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <SearchBox value={busca} onChange={setBusca} placeholder="Buscar venda por cliente…" className="min-w-[200px] flex-1 sm:max-w-xs" />
              <div className="glass-subtle flex items-center gap-1 rounded-xl p-1">
                {[
                  { v: true, label: "Hoje" },
                  { v: false, label: "Este mês" },
                ].map((opt) => (
                  <button key={opt.label} onClick={() => setSomenteHoje(opt.v)} aria-pressed={somenteHoje === opt.v} className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12px] transition-colors ${somenteHoje === opt.v ? "bg-accent text-white shadow-glow" : "text-mist hover:text-ink"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Corpo — lista rolável */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {vendasFiltradas.length > 0 ? (
              gruposPorDia.map((grupo) => (
                <section key={grupo.data}>
                  {/* Cabeçalho do dia: gruda no topo enquanto o dia rola, então
                      nunca se perde de vista a qual data a linha pertence. */}
                  <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-fg/[0.06] bg-surface/95 px-5 py-2 backdrop-blur-sm">
                    <span className="flex items-center gap-2 text-[11.5px] text-mist">
                      <CalendarDays size={13} className="text-accent-soft" />
                      <span>{rotuloDoDia(grupo.data)}</span>
                      <span className="text-faint">
                        · {grupo.vendas.length} {grupo.vendas.length === 1 ? "venda" : "vendas"}
                      </span>
                    </span>

                    <span className="text-[12px] tabular-nums text-ink">{formatCurrency(grupo.total)}</span>
                  </div>

                  {grupo.vendas.map((venda) => {
                    const total = totalDoPedido(venda);
                    const statusPag = statusPagamentoVenda(venda, total);
                    const pagoVenda = Number(venda.pedido.valorPago ?? 0);

                    return (
                      <button
                        key={venda.pedido.pedidoId}
                        onClick={() => abrirNota({ id: venda.pedido.pedidoId, clienteId: venda.clienteId, nome: venda.nomeCliente })}
                        className="group relative flex w-full items-center gap-3 border-b border-fg/[0.04] px-5 py-3.5 text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:bg-accent before:opacity-0 before:transition-opacity hover:bg-fg/[0.03] hover:before:opacity-100"
                      >
                        <Avatar name={venda.nomeCliente} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink">{venda.nomeCliente}</p>
                          <p className="text-[11px] text-faint">
                            {/* A data já está no cabeçalho do grupo — repetir em
                                cada linha só gastaria espaço. */}
                            {horaVenda(venda.pedido.dataPedido)}
                            {statusPag === "PARCIAL" && ` · pago ${formatCurrency(pagoVenda)} de ${formatCurrency(total)}`}
                          </p>
                        </div>

                        <span className="hidden sm:block">
                          <StatusBadge status={statusPag} />
                        </span>

                        <div className="text-right">
                          <p className="text-[13px] tabular-nums text-ink">{formatCurrency(total)}</p>
                          <p className={`text-[11px] tabular-nums ${statusPag === "PAGA" ? "text-success" : statusPag === "PARCIAL" ? "text-accent-soft" : "text-warning"}`}>{statusPag === "PAGA" ? "paga" : statusPag === "PARCIAL" ? "parcial" : "aberta"}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </button>
                    );
                  })}
                </section>
              ))
            ) : (
              <div className="flex h-full items-center justify-center py-10">
                <div className="flex max-w-xs flex-col items-center gap-3 text-center text-faint">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fg/[0.06] bg-fg/[0.03]">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[13px] text-mist">{busca.trim() ? "Nenhuma venda encontrada" : somenteHoje ? "Nenhuma venda hoje" : "Nenhuma venda"}</p>
                    <p className="mt-0.5 text-[11px]">{busca.trim() ? "Tente buscar por outro cliente." : "Clique em “Nova venda” para começar."}</p>
                  </div>
                  {!busca.trim() && (
                    <button onClick={() => setNovaVendaOpen(true)} className="mt-1 cursor-pointer rounded-xl bg-accent px-3.5 py-2 text-[12px] text-white transition-colors hover:bg-accent">
                      Nova venda
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé do card */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-fg/[0.06] px-5 py-2.5">
            <p className="flex items-center gap-2 text-[12px] text-faint">
              <TrendingUp size={14} className="text-accent-soft" />
              Ticket médio: <span className="nums text-ink">{formatCurrency(ticketMedio)}</span>
            </p>
            <p className="text-[12px] text-faint">
              <span className="nums text-success">{vendasVisiveis.filter((v) => !estaAberta(v)).length}</span> pagas · <span className="nums text-warning">{vendasVisiveis.filter(estaAberta).length}</span> em aberto
            </p>
          </div>
        </div>
      

      {/* Modal — nova venda */}
      <Modal open={novaVendaOpen} onClose={() => setNovaVendaOpen(false)} title="Iniciar venda" subtitle="Escolha o cliente para abrir a nota" size="md">
        <div className="flex flex-col gap-3">
          <SearchBox value={nomeCliente} onChange={setNomeCliente} placeholder="Buscar cliente por nome…" />

          {/* Lista de clientes: mostra os recentes quando ainda não há busca,
 em vez de deixar o modal vazio esperando digitação. */}
          <div className="flex max-h-[46vh] min-h-[180px] flex-col gap-1.5 overflow-y-auto">
            {listaClientes.length > 0 ? (
              listaClientes.map((c, i) => {
                const selecionado = clienteSelecionavel?.id && String(clienteSelecionavel.id) === String(c.id);
                return (
                  <button
                    key={c.id ?? i}
                    onClick={() => c.id && abrirNota({ clienteId: String(c.id), nome: c.nome })}
                    className={`focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${selecionado ? "border border-accent/50 bg-accent/10" : "glass-subtle hover:border-accent/30"}`}
                  >
                    <Avatar name={c.nome} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{c.nome}</span>
                      {c.cpfCnpj && <span className="block truncate text-[11px] text-faint">{formatDocument(c.cpfCnpj)}</span>}
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-muted transition-colors group-hover:text-accent-soft" />
                  </button>
                );
              })
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15 text-warning ring-1 ring-inset ring-warning/25">
                  <UserCheck size={20} />
                </span>
                <p className="text-[13px] text-ink">{nomeCliente.trim() ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
                <p className="max-w-[240px] text-[11.5px] leading-relaxed text-faint">{nomeCliente.trim() ? "Confira o nome ou cadastre este cliente antes de iniciar a venda." : "Cadastre um cliente para poder abrir notas."}</p>
                <button
                  onClick={() => {
                    setNovaVendaOpen(false);
                    navigate("/clientes");
                  }}
                  className="focus-ring mt-1 cursor-pointer rounded-xl bg-accent px-3.5 py-2 text-[12px] text-white transition-all hover:brightness-110"
                >
                  Ir para Clientes
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-faint">{listaClientes.length > 0 && `${listaClientes.length} ${listaClientes.length === 1 ? "cliente" : "clientes"} · clique para abrir a nota`}</p>
        </div>
      </Modal>

      {/* Modal — nota do PDV (venda ou orçamento). */}
      <Modal open={!!notaAberta} onClose={fecharNota} title={notaAberta?.orcamento ? "Novo orçamento" : notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} size="full">
        {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} onSaved={fecharNota} modoOrcamento={notaAberta.orcamento} />}
      </Modal>

      {/* Modal de nome do orçamento no desktop. */}
      <Modal open={orcamentoOpen} onClose={() => setOrcamentoOpen(false)} title="Novo orçamento" subtitle="Para quem é a proposta?" size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            abrirOrcamento();
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-faint">Nome do cliente</label>
            <input
              autoFocus
              value={nomeOrcamento}
              onChange={(e) => setNomeOrcamento(e.target.value)}
              placeholder="Digite qualquer nome"
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent/60"
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">Não precisa ter cadastro. A nota abre em modo orçamento — sem pagamento.</p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOrcamentoOpen(false)} className="min-h-[42px] rounded-xl border border-fg/[0.1] px-4 text-[13px] text-mist transition-colors hover:text-ink">
              Cancelar
            </button>
            <button type="submit" className="min-h-[42px] rounded-xl bg-accent px-5 text-[13px] text-white transition-all hover:brightness-110 active:scale-[0.99]">
              Montar orçamento
            </button>
          </div>
        </form>
      </Modal>

        {/* Cadastros sem sair da tela — as rotas são as mesmas de Clientes e Estoque. */}
        {/* Sem `Modal` em volta: o `ClienteForm` já abre no `Modal` do sistema.
            Envolvê-lo empilhava dois fundos escuros e dois cartões, que era o
            "bugado" — a caixa aparecia dentro de outra caixa. */}
        {novoClienteOpen && <ClienteForm saving={salvandoCadastro} onClose={() => setNovoClienteOpen(false)} onSubmit={handleNovoCliente} />}

        <Modal open={novoProdutoOpen} onClose={() => setNovoProdutoOpen(false)} title="Novo produto" subtitle="Ele fica disponível na nota na hora">
          <ProdutoForm submitText={salvandoCadastro ? "Salvando..." : "Cadastrar produto"} onCancel={() => setNovoProdutoOpen(false)} onSubmit={handleNovoProduto} />
        </Modal>

    </PageScreen>
  );
};

export default PontoDeVenda;
