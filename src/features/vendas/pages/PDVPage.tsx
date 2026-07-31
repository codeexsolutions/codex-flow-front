import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ShoppingCart, Plus, Receipt, BarChart3, UserCheck, DollarSign, Wallet, AlertCircle, Hash, TrendingUp, CalendarDays, ChevronRight, Search } from "lucide-react";

import { useNavigate } from "react-router-dom";

import Invoice from "@/features/vendas/components/Invoice";
import { Modal } from "@/shared/ui/Modal";
import HeaderPage from "@/shared/ui/HeaderPage";
import { PageBody, PageToolbar, PrimaryAction, GhostAction } from "@/shared/ui/PageShell";

import useVendaStore from "@/features/vendas/store/venda.store";
import useClienteStore from "@/features/clientes/store/cliente.store";
import { formatCurrency } from "@/shared/utils/currency";

import { estaAberto as estaAberta, totalDoPedido } from "@/shared/domain/pedido";
import { formatTime as horaVenda, formatDate as dataVenda, isSameDay as ehHoje } from "@/shared/utils/date";
import { getInitials as iniciais, formatDocument } from "@/shared/utils/format";

// Só o essencial: quem é o cliente e (se existir) qual pedido.
type NotaAberta = { id?: string; clienteId: string; nome?: string };

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

const StatusBadge = ({ status }: { status: "ABERTA" | "PARCIAL" | "PAGA" }) => {
  if (status === "PAGA")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/15 px-2.5 py-1 text-[11px] text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" /> Pago
      </span>
    );
  if (status === "PARCIAL")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] text-accent-soft">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-soft" /> Parcial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-[11px] text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Em aberto
    </span>
  );
};

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

const PontoDeVenda = () => {
  const navigate = useNavigate();

  const vendas = useVendaStore((s) => s.vendas);
  const fetchVendas = useVendaStore((s) => s.fetchVendas);
  const clientes = useClienteStore((s) => s.clientes);
  const fetchClientes = useClienteStore((s) => s.fetchClientes);

  const [novaVendaOpen, setNovaVendaOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [busca, setBusca] = useState("");
  const [somenteHoje, setSomenteHoje] = useState(true);
  const [notaAberta, setNotaAberta] = useState<NotaAberta | null>(null);

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  // async/await como no commit `altera pra async`, mas preservando o tratamento
  // de erro: resposta vazia zera a lista em vez de manter dados antigos.
  const carregarVendas = async () => {
    await fetchVendas(true);
  };

  useEffect(() => {
    fetchVendas();
    fetchClientes();
  }, [fetchVendas, fetchClientes]);

  const vendasVisiveis = useMemo(() => {
    const base = somenteHoje ? vendas.filter((v) => ehHoje(v.pedido.dataPedido)) : vendas;
    return [...base].sort((a, b) => +new Date(b.pedido.dataPedido) - +new Date(a.pedido.dataPedido));
  }, [vendas, somenteHoje]);

  const vendasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return vendasVisiveis;
    return vendasVisiveis.filter((v) => v.nomeCliente?.toLowerCase().includes(termo));
  }, [vendasVisiveis, busca]);

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

  const fecharNota = () => {
    setNotaAberta(null);
    carregarVendas();
  };

  return (
    <div className="aurora relative flex h-full w-full flex-col overflow-hidden text-ink">
      <HeaderPage icon={<ShoppingCart className="h-5 w-5" />} title="Ponto de Venda" subtitle="Inicie vendas e acompanhe o dia" />

      {/* Conteúdo */}
      <PageBody>
        {/* Ações da tela — dentro do outlet, não no cabeçalho */}
        <PageToolbar
          left={
            <span className="glass-subtle hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-mist sm:flex">
              <CalendarDays className="h-3.5 w-3.5 text-accent-soft" />
              <span className="capitalize">{hoje}</span>
            </span>
          }
        >
          <GhostAction icon={<BarChart3 size={15} />} onClick={() => setRelatorioOpen(true)}>
            Relatório do dia
          </GhostAction>
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
                <h2 className="text-[13px] text-ink">{somenteHoje ? "Vendas de hoje" : "Todas as vendas"}</h2>
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
                  { v: false, label: "Todas" },
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
              vendasFiltradas.map((venda) => {
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
                        {horaVenda(venda.pedido.dataPedido)}
                        {!somenteHoje && ` · ${dataVenda(venda.pedido.dataPedido)}`}
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
              })
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
      </PageBody>

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

      {/* Modal — nota do PDV */}
      <Modal open={!!notaAberta} onClose={fecharNota} title={notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} size="full">
        {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} onSaved={fecharNota} />}
      </Modal>

      {/* Modal — relatório */}
      <Modal open={relatorioOpen} onClose={() => setRelatorioOpen(false)} title={somenteHoje ? "Relatório do dia" : "Relatório geral"} subtitle={somenteHoje ? "Resumo das vendas de hoje" : "Resumo de todas as vendas"} size="lg">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Kpi icon={<DollarSign size={16} />} label="Faturamento" value={formatCurrency(faturamento)} tone="accent" />
            <Kpi icon={<Wallet size={16} />} label="Recebido" value={formatCurrency(recebido)} tone="success" />
            <Kpi icon={<AlertCircle size={16} />} label="Pendente" value={formatCurrency(pendente)} tone="warning" />
            <Kpi icon={<Hash size={16} />} label="Vendas" value={String(vendasVisiveis.length)} tone="neutral" />
          </div>

          <div className="flex flex-col gap-2 border-t border-fg/[0.06] pt-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-mist">Ticket médio</span>
              <span className="tabular-nums text-ink">{formatCurrency(ticketMedio)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mist">Vendas pagas</span>
              <span className="tabular-nums text-ink">{vendasVisiveis.filter((v) => !estaAberta(v)).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mist">Vendas abertas</span>
              <span className="tabular-nums text-ink">{vendasVisiveis.filter((v) => estaAberta(v)).length}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PontoDeVenda;
