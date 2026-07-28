import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ShoppingCart, Plus, Receipt, BarChart3, UserCheck, DollarSign, Wallet, AlertCircle, Hash, TrendingUp, CalendarDays, ChevronRight, Search } from "lucide-react";

import Invoice from "../components/Invoice/Invoice";
import { Modal } from "../components/Modal";
// Ajuste o caminho conforme onde você salvou o HeaderPage.
import HeaderPage from "../components/Headers/HeaderPage";

import NoteService from "../services/note.service";
import ClientService from "../services/client.service";
import { formatCurrency } from "../utils/formatCurrency";

import { PedidoClienteType } from "../types/InvoiceType";
import ClientType from "../types/ClientType";

const ehHoje = (data?: string | Date) => {
  if (!data) return false;
  const d = new Date(data);
  const agora = new Date();
  return d.getDate() === agora.getDate() && d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
};

const horaVenda = (data?: string | Date) => (data ? new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--");

const totalDoPedido = (v: PedidoClienteType) => Number(v.pedido.totalPedido) || (v.pedido.itensPedido ?? []).reduce((acc, item) => acc + Number(item.valorVendaItem || 0) * Number(item.quantidadeItem || 0), 0);

const estaAberta = (v: PedidoClienteType) => v.pedido.pedidoStatus === "ABERTO";

const iniciais = (nome?: string) =>
  (nome ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

// Só o essencial: quem é o cliente e (se existir) qual pedido.
type NotaAberta = { id?: string; clienteId: string; nome?: string };

/* --------------------------- Componentes locais --------------------------- */

const TONES = {
  accent: "bg-[#7c6ef5]/[0.15] text-[#9b8ff5]",
  success: "bg-[#0f6e56]/20 text-[#5dcaa5]",
  warning: "bg-[#8a6d1f]/20 text-[#e0b955]",
  neutral: "bg-white/[0.06] text-[#b7b2d8]",
} as const;

const Kpi = ({ icon, label, value, tone = "neutral" }: { icon: ReactNode; label: string; value: string; tone?: keyof typeof TONES }) => (
  <div className="rounded-2xl border border-white/[0.07] bg-[#15132a] p-4">
    <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone]}`}>{icon}</div>
    <p className="text-[11px] text-[#6f6a93]">{label}</p>
    <p className="mt-0.5 text-xl font-semibold tracking-tight text-[#f1eeff] tabular-nums">{value}</p>
  </div>
);

const StatusBadge = ({ aberta }: { aberta: boolean }) =>
  aberta ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8a6d1f]/50 bg-[#8a6d1f]/20 px-2.5 py-1 text-[11px] font-medium text-[#e0b955]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#e0b955]" /> Aberta
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0f6e56]/40 bg-[#0f6e56]/20 px-2.5 py-1 text-[11px] font-medium text-[#5dcaa5]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#5dcaa5]" /> Paga
    </span>
  );

const Avatar = ({ name, size = "md" }: { name?: string; size?: "sm" | "md" }) => {
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-[11px]";
  return <div className={`flex ${dim} shrink-0 items-center justify-center rounded-xl border border-[#7c6ef5]/25 bg-gradient-to-br from-[#7c6ef5]/25 to-[#a78bfa]/10 font-semibold text-[#b7aef9]`}>{iniciais(name)}</div>;
};

const SearchBox = ({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
  <div className={`flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 transition-colors focus-within:border-[#7c6ef5]/60 focus-within:bg-white/[0.06] ${className}`}>
    <Search className="h-4 w-4 shrink-0 text-[#4e4a72]" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full flex-1 bg-transparent py-2 text-[13px] text-[#e8e4ff] outline-none placeholder:text-[#6f6a93]" />
  </div>
);

/* --------------------------------- Página --------------------------------- */

const PontoDeVenda = () => {
  const [vendas, setVendas] = useState<PedidoClienteType[]>([]);
  const [clientes, setClientes] = useState<ClientType[]>([]);

  const [novaVendaOpen, setNovaVendaOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [busca, setBusca] = useState("");
  const [somenteHoje, setSomenteHoje] = useState(true);
  const [notaAberta, setNotaAberta] = useState<NotaAberta | null>(null);

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  const carregarVendas = () => {
    NoteService.getAll()
      .then(({ data }) => {
        const lista = (data.data as PedidoClienteType[]).filter((v): v is PedidoClienteType => !!v && !!v.pedido);
        setVendas(lista);
      })
      .catch(() => setVendas([]));
  };

  useEffect(() => {
    carregarVendas();
    ClientService.getAll()
      .then(({ data }) => setClientes(data.data ?? []))
      .catch(() => setClientes([]));
  }, []);

  const vendasVisiveis = useMemo(() => {
    console.log(vendas);
    const base = somenteHoje ? vendas.filter((v) => ehHoje(v.pedido.dataPedido)) : vendas;
    return [...base].sort((a, b) => +new Date(b.pedido.dataPedido) - +new Date(a.pedido.dataPedido));
  }, [vendas, somenteHoje]);

  const vendasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return vendasVisiveis;
    return vendasVisiveis.filter((v) => v.nomeCliente?.toLowerCase().includes(termo));
  }, [vendasVisiveis, busca]);

  const faturamento = vendasVisiveis.reduce((acc, v) => acc + totalDoPedido(v), 0);
  const recebido = vendasVisiveis.filter((v) => !estaAberta(v)).reduce((acc, v) => acc + totalDoPedido(v), 0);
  const pendente = Math.max(faturamento - recebido, 0);
  const ticketMedio = vendasVisiveis.length ? faturamento / vendasVisiveis.length : 0;

  const sugestoes = useMemo(() => {
    const termo = nomeCliente.trim().toLowerCase();
    if (!termo) return [];
    return clientes.filter((c) => c.nome?.toLowerCase().includes(termo)).slice(0, 5);
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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0e0d1a] text-[#e8e4ff]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,110,245,0.16),transparent_70%)]" />

      {/* Cabeçalho — componente compartilhado */}
      <HeaderPage
        icon={<ShoppingCart className="h-5 w-5" />}
        title="Ponto de Venda"
        subtitle="Inicie vendas e acompanhe o dia"
        actions={
          <>
            <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-[#8a85b4] sm:flex">
              <CalendarDays className="h-3.5 w-3.5 text-[#9b8ff5]" />
              <span className="capitalize">{hoje}</span>
            </span>
            <button
              onClick={() => setNovaVendaOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(124,110,245,0.7)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Nova venda
            </button>
          </>
        }
      />

      {/* Conteúdo */}
      <main className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-5 py-5 lg:px-8 lg:py-6">
        {/* KPIs */}
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<DollarSign size={16} />} label="Faturamento" value={formatCurrency(faturamento)} tone="accent" />
          <Kpi icon={<Wallet size={16} />} label="Recebido" value={formatCurrency(recebido)} tone="success" />
          <Kpi icon={<AlertCircle size={16} />} label="Pendente" value={formatCurrency(pendente)} tone="warning" />
          <Kpi icon={<Hash size={16} />} label="Vendas" value={String(vendasVisiveis.length)} tone="neutral" />
        </div>

        {/* Card da lista */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#15132a]">
          {/* Toolbar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6ef5]/[0.15]">
                <Receipt className="h-4 w-4 text-[#9b8ff5]" />
              </div>
              <div>
                <h2 className="text-[13px] font-medium text-[#e8e4ff]">{somenteHoje ? "Vendas de hoje" : "Todas as vendas"}</h2>
                <p className="text-[11px] text-[#6f6a93]">
                  {vendasVisiveis.length} {vendasVisiveis.length === 1 ? "venda" : "vendas"}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <SearchBox value={busca} onChange={setBusca} placeholder="Buscar venda por cliente…" className="min-w-[200px] flex-1 sm:max-w-xs" />
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
                {[
                  { v: true, label: "Hoje" },
                  { v: false, label: "Todas" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSomenteHoje(opt.v)}
                    aria-pressed={somenteHoje === opt.v}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${somenteHoje === opt.v ? "bg-[#7c6ef5] text-white shadow-[0_4px_14px_-4px_rgba(124,110,245,0.8)]" : "text-[#8a85b4] hover:text-[#e8e4ff]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Corpo — lista rolável */}
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(124,110,245,0.25)_transparent] [scrollbar-width:thin]">
            {vendasFiltradas.length > 0 ? (
              vendasFiltradas.map((venda) => {
                const total = totalDoPedido(venda);
                const aberta = estaAberta(venda);
                return (
                  <button
                    key={venda.pedido.pedidoId}
                    onClick={() => abrirNota({ id: venda.pedido.pedidoId, clienteId: venda.clienteId, nome: venda.nomeCliente })}
                    className="group relative flex w-full items-center gap-3 border-b border-white/[0.04] px-5 py-3.5 text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:bg-[#7c6ef5] before:opacity-0 before:transition-opacity hover:bg-white/[0.03] hover:before:opacity-100"
                  >
                    <Avatar name={venda.nomeCliente} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#e8e4ff]">{venda.nomeCliente}</p>
                      <p className="text-[11px] text-[#6f6a93]">
                        {horaVenda(venda.pedido.dataPedido)}
                        {!somenteHoje && ` · ${new Date(venda.pedido.dataPedido).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>

                    <span className="hidden sm:block">
                      <StatusBadge aberta={aberta} />
                    </span>

                    <div className="text-right">
                      <p className="text-[13px] font-medium tabular-nums text-[#e8e4ff]">{formatCurrency(total)}</p>
                      <p className={`text-[11px] tabular-nums ${aberta ? "text-[#e0b955]" : "text-[#5dcaa5]"}`}>{aberta ? "aberta" : "paga"}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#4e4a72]" />
                  </button>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center py-10">
                <div className="flex max-w-xs flex-col items-center gap-3 text-center text-[#6f6a93]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#b7b2d8]">{busca.trim() ? "Nenhuma venda encontrada" : somenteHoje ? "Nenhuma venda hoje" : "Nenhuma venda"}</p>
                    <p className="mt-0.5 text-[11px]">{busca.trim() ? "Tente buscar por outro cliente." : "Clique em “Nova venda” para começar."}</p>
                  </div>
                  {!busca.trim() && (
                    <button onClick={() => setNovaVendaOpen(true)} className="mt-1 cursor-pointer rounded-xl bg-[#7c6ef5] px-3.5 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#8b7bf7]">
                      Nova venda
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé do card */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] bg-white/[0.02] px-5 py-3">
            <p className="flex items-center gap-2 text-[12px] text-[#6f6a93]">
              <TrendingUp size={14} className="text-[#9b8ff5]" />
              Ticket médio: <span className="font-medium tabular-nums text-[#e8e4ff]">{formatCurrency(ticketMedio)}</span>
            </p>
            <button onClick={() => setRelatorioOpen(true)} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#b7b2d8] transition-colors hover:bg-white/[0.08]">
              <BarChart3 size={14} /> Relatório do dia
            </button>
          </div>
        </div>
      </main>

      {/* Modal — nova venda */}
      <Modal open={novaVendaOpen} onClose={() => setNovaVendaOpen(false)} title="Iniciar venda" subtitle="Informe o cliente para abrir a nota" size="md">
        <div className="flex flex-col gap-3">
          <SearchBox value={nomeCliente} onChange={setNomeCliente} placeholder="Digite o nome do cliente…" />

          {nomeCliente.trim() && !clienteSelecionavel && (
            <div className="flex items-center gap-2 rounded-xl border border-[#8a6d1f]/50 bg-[#8a6d1f]/15 px-3 py-2.5 text-[12px] font-medium text-[#e0b955]">
              <UserCheck size={14} className="shrink-0" />
              Cliente novo — cadastre-o antes de iniciar a venda
            </div>
          )}

          {sugestoes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {sugestoes.map((c, i) => (
                <button key={c.id ?? i} onClick={() => c.id && abrirNota({ clienteId: String(c.id), nome: c.nome })} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-[13px] transition-colors hover:bg-white/[0.06]">
                  <Avatar name={c.nome} size="sm" />
                  <span className="flex-1 truncate text-[#e8e4ff]">{c.nome}</span>
                  <span className="text-[11px] text-[#5dcaa5]">existente</span>
                </button>
              ))}
            </div>
          )}

          <button
            disabled={!clienteSelecionavel}
            onClick={() => clienteSelecionavel?.id && abrirNota({ clienteId: String(clienteSelecionavel.id), nome: clienteSelecionavel.nome })}
            className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(124,110,245,0.7)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <Plus size={16} /> Iniciar venda
          </button>
        </div>
      </Modal>

      {/* Modal — nota do PDV */}
      <Modal open={!!notaAberta} onClose={fecharNota} title={notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} size="full">
        {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} />}
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

          <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[#8a85b4]">Ticket médio</span>
              <span className="font-medium tabular-nums text-[#e8e4ff]">{formatCurrency(ticketMedio)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8a85b4]">Vendas pagas</span>
              <span className="tabular-nums text-[#e8e4ff]">{vendasVisiveis.filter((v) => !estaAberta(v)).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8a85b4]">Vendas abertas</span>
              <span className="tabular-nums text-[#e8e4ff]">{vendasVisiveis.filter((v) => estaAberta(v)).length}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PontoDeVenda;
