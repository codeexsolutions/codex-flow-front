import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, DollarSign, Wallet, AlertCircle, Users, Package, ArrowRight, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { PageScreen } from "@/shared/ui/PageShell";
import { useChartColors } from "@/shared/theme/useChartColors";

import useVendaStore from "@/features/vendas/store/venda.store";
import useClienteStore from "@/features/clientes/store/cliente.store";
import useProdutoStore, { stockLevel } from "@/features/estoque/store/produto.store";

import { estaAberto, estaFechado, estaCancelado, totalDoPedido } from "@/shared/domain/pedido";
import { formatCurrency } from "@/shared/utils/currency";
import { formatNumber, getInitials } from "@/shared/utils/format";
import { MONTHS, isSameMonth, formatDateShort, toDate } from "@/shared/utils/date";

/* ─────────────────────────────── Componentes ─────────────────────────────── */

const TONES = {
  accent: "bg-accent/[0.15] text-accent-soft ring-accent/20",
  success: "bg-success/15 text-success ring-success/20",
  warning: "bg-warning/15 text-warning ring-warning/20",
  danger: "bg-danger/15 text-danger ring-danger/20",
} as const;

const Kpi = ({ icon, label, value, hint, tone = "accent" }: { icon: ReactNode; label: string; value: string; hint?: string; tone?: keyof typeof TONES }) => (
  <div className="card-interactive glass-sheen p-4">
    <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset ${TONES[tone]}`}>{icon}</div>
    <p className="text-[11px] text-faint">{label}</p>
    <p className="nums mt-0.5 truncate text-xl tracking-tight text-ink">{value}</p>
    {hint && <p className="mt-0.5 truncate text-[11px] text-faint">{hint}</p>}
  </div>
);

const Painel = ({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) => (
  <section className="card glass-sheen flex min-h-0 flex-col overflow-hidden">
    <header className="flex shrink-0 items-center gap-2.5 border-b border-fg/[0.07] px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">{icon}</span>
      <h2 className="flex-1 text-[13px] text-ink">{title}</h2>
      {action}
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
  </section>
);

const VerTudo = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="focus-ring flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-accent transition-colors hover:text-accent-soft">
    Ver tudo <ArrowRight size={13} />
  </button>
);

const Vazio = ({ children }: { children: ReactNode }) => <p className="px-4 py-8 text-center text-[12.5px] text-faint">{children}</p>;

/* ──────────────────────────────── Página ────────────────────────────────── */

const DashboardPage = () => {
  const navigate = useNavigate();
  const C = useChartColors();

  const vendas = useVendaStore((s) => s.vendas);
  const fetchVendas = useVendaStore((s) => s.fetchVendas);
  const clientes = useClienteStore((s) => s.clientes);
  const fetchClientes = useClienteStore((s) => s.fetchClientes);
  const produtos = useProdutoStore((s) => s.produtos);
  const fetchProdutos = useProdutoStore((s) => s.fetchProdutos);

  useEffect(() => {
    fetchVendas();
    fetchClientes();
    fetchProdutos();
  }, [fetchVendas, fetchClientes, fetchProdutos]);

  const dados = useMemo(() => {
    const agora = new Date();
    const ativas = vendas.filter((v) => !estaCancelado(v));
    const doMes = ativas.filter((v) => isSameMonth(v.pedido.dataPedido, agora));

    const faturadoMes = doMes.reduce((acc, v) => acc + totalDoPedido(v), 0);
    const recebidoMes = doMes.filter(estaFechado).reduce((acc, v) => acc + totalDoPedido(v), 0);
    const aReceber = ativas.filter(estaAberto).reduce((acc, v) => acc + totalDoPedido(v), 0);

    const ano = agora.getFullYear();
    const porMes = MONTHS.map((name, i) => {
      const lista = ativas.filter((v) => {
        const d = toDate(v.pedido.dataPedido);
        return !!d && d.getFullYear() === ano && d.getMonth() === i;
      });
      return {
        name,
        faturado: lista.reduce((acc, v) => acc + totalDoPedido(v), 0),
        recebido: lista.filter(estaFechado).reduce((acc, v) => acc + totalDoPedido(v), 0),
      };
    });

    const recentes = [...ativas].sort((a, b) => +new Date(b.pedido.dataPedido) - +new Date(a.pedido.dataPedido)).slice(0, 6);

    const criticos = produtos
      .filter((p) => stockLevel(p.quantidade) !== "disponivel")
      .sort((a, b) => (a.quantidade ?? 0) - (b.quantidade ?? 0))
      .slice(0, 6);

    return { faturadoMes, recebidoMes, aReceber, vendasNoMes: doMes.length, porMes, recentes, criticos };
  }, [vendas, produtos]);

  return (
    <PageScreen icon={<LayoutDashboard className="h-5 w-5" />} title="Dashboard" subtitle="Visão geral do seu negócio">
        {/* KPIs */}
        <div className="stagger grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={<DollarSign size={16} />} label="Faturado no mês" value={formatCurrency(dados.faturadoMes)} hint={`${dados.vendasNoMes} ${dados.vendasNoMes === 1 ? "venda" : "vendas"}`} tone="accent" />
          <Kpi icon={<Wallet size={16} />} label="Recebido no mês" value={formatCurrency(dados.recebidoMes)} tone="success" />
          <Kpi icon={<AlertCircle size={16} />} label="A receber" value={formatCurrency(dados.aReceber)} tone="warning" />
          <Kpi icon={<Users size={16} />} label="Clientes" value={formatNumber(clientes.length)} hint={`${formatNumber(produtos.length)} produtos`} tone="danger" />
        </div>

        {/* Gráfico do ano */}
        <section className="card glass-sheen flex shrink-0 flex-col overflow-hidden">
          <header className="flex items-center gap-2.5 border-b border-fg/[0.07] px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">
              <TrendingUp size={15} />
            </span>
            <h2 className="text-[13px] text-ink">Faturamento do ano</h2>
          </header>
          <div className="h-[220px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dados.porMes}>
                <defs>
                  <linearGradient id="dashFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.success} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip cursor={{ stroke: C.grid }} contentStyle={{ background: C.surface, border: `1px solid ${C.grid}`, borderRadius: 12, fontSize: 12, boxShadow: "var(--shadow-2)" }} labelStyle={{ color: C.ink }} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Area type="monotone" dataKey="faturado" name="Faturado" stroke={C.accent} strokeWidth={2} fill="url(#dashFat)" />
                <Area type="monotone" dataKey="recebido" name="Recebido" stroke={C.success} strokeWidth={2} fill="url(#dashRec)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Painéis */}
        <div className="grid min-h-[260px] shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <Painel title="Últimas vendas" icon={<ShoppingCart size={15} />} action={<VerTudo onClick={() => navigate("/vendas/lista")} />}>
            {dados.recentes.length === 0 ? (
              <Vazio>Nenhuma venda registrada ainda.</Vazio>
            ) : (
              dados.recentes.map((v) => (
                <div key={v.pedido.pedidoId} className="flex items-center gap-3 border-b border-fg/[0.04] px-4 py-2.5 last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/15 text-[10px] text-accent-soft">{getInitials(v.nomeCliente)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-ink">{v.nomeCliente}</span>
                    <span className="block text-[11px] text-faint">{formatDateShort(v.pedido.dataPedido)}</span>
                  </span>
                  <span className="text-right">
                    <span className="nums block text-[12.5px] text-ink">{formatCurrency(totalDoPedido(v))}</span>
                    <span className={`block text-[10.5px] ${estaAberto(v) ? "text-warning" : "text-success"}`}>{estaAberto(v) ? "em aberto" : "pago"}</span>
                  </span>
                </div>
              ))
            )}
          </Painel>

          <Painel title="Estoque crítico" icon={<Package size={15} />} action={<VerTudo onClick={() => navigate("/estoque")} />}>
            {dados.criticos.length === 0 ? (
              <Vazio>Nenhum produto em nível crítico. 👌</Vazio>
            ) : (
              dados.criticos.map((p) => {
                const nivel = stockLevel(p.quantidade);
                return (
                  <div key={p.id} className="flex items-center gap-3 border-b border-fg/[0.04] px-4 py-2.5 last:border-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${nivel === "esgotado" ? "bg-danger/15 text-danger ring-danger/20" : "bg-warning/15 text-warning ring-warning/20"}`}>
                      <AlertTriangle size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.nome}</span>
                    <span className={`nums text-[12.5px] ${nivel === "esgotado" ? "text-danger" : "text-warning"}`}>{formatNumber(p.quantidade ?? 0)} un.</span>
                  </div>
                );
              })
            )}
          </Painel>
        </div>
      </PageScreen>
  );
};

export default DashboardPage;
