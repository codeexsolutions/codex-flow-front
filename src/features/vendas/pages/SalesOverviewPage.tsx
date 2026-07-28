import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, TrendingUp, DollarSign, CheckCircle, AlertCircle, Star } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Modal } from "../../../components/Modal";
import Invoice from "../../../components/Invoice/Invoice";
import NoteService from "../../../services/note.service";
import { formatCurrency } from "../../../utils/formatCurrency";
import { PedidoClienteType } from "../../../types/InvoiceType";

const C = {
  accent: "#7c6ef5",
  green: "#5dcaa5",
  amber: "#fac775",
  red: "#f09595",
  grid: "rgba(255,255,255,0.08)",
  tick: "#6f6a93",
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const axisProps = {
  tick: { fontSize: 11, fill: C.tick },
  axisLine: false as const,
  tickLine: false as const,
};

const estaFechado = (v: PedidoClienteType) => v.pedido.pedidoStatus === "FECHADO";
const estaAberto = (v: PedidoClienteType) => v.pedido.pedidoStatus === "ABERTO";
const estaCancelado = (v: PedidoClienteType) => v.pedido.pedidoStatus === "CANCELADO";

const totalDoPedido = (v: PedidoClienteType) => Number(v.pedido.totalPedido) || (v.pedido.itensPedido ?? []).reduce((acc, item) => acc + Number(item.valorVendaItem || 0) * Number(item.quantidadeItem || 0), 0);

const ehDoMes = (data: string | Date, ref: Date) => {
  const d = new Date(data);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
};

type TopCliente = {
  clienteId: string;
  nome: string;
  total: number;
  pedidos: number;
};

type NotaAberta = { id?: string; clienteId: string; nome?: string };

/* ======================= UI (dark, self-contained) ======================= */
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/[0.14] bg-[#15132a] px-3 py-2 text-xs">
      {label && <p className="mb-1 text-[#8a85b4]">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey ?? p.name} className="mt-0.5" style={{ color: p.color ?? p.payload?.fill ?? C.accent }}>
          {p.name ?? p.dataKey}: <strong>{typeof p.value === "number" ? formatCurrency(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function Kpi({ icon, chip, label, value, hint }: { icon: React.ReactNode; chip: string; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#15132a] px-4 py-3">
      <div className={`rounded-lg p-2 ${chip}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[#4e4a72]">{label}</p>
        <p className="truncate text-sm text-[#e8e4ff]">{value}</p>
        {hint && <p className="text-[10px] text-[#4e4a72]">{hint}</p>}
      </div>
    </div>
  );
}

function CardHeader({ icon, chip, title, sub }: { icon: React.ReactNode; chip: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
      <div className={`rounded-lg p-2 ${chip}`}>{icon}</div>
      <div>
        <h2 className="text-[13px] text-[#e8e4ff]">{title}</h2>
        {sub && <p className="text-[11px] text-[#4e4a72]">{sub}</p>}
      </div>
    </div>
  );
}

/* ======================= Overview Page ======================= */
const SalesOverviewPage = () => {
  const [vendas, setVendas] = useState<PedidoClienteType[]>([]);
  const [notaAberta, setNotaAberta] = useState<NotaAberta | null>(null);

  const carregar = () => {
    NoteService.getAll()
      .then(({ data }) => {
        const lista = ((data as any)?.data ?? []).filter((v: any): v is PedidoClienteType => !!v && !!v.pedido);
        setVendas(lista);
      })
      .catch(() => setVendas([]));
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNota = (nota: NotaAberta) => setNotaAberta(nota);
  const fecharNota = () => {
    setNotaAberta(null);
    carregar();
  };

  const dados = useMemo(() => {
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const naoCanceladas = vendas.filter((v) => !estaCancelado(v));
    const doMes = naoCanceladas.filter((v) => ehDoMes(v.pedido.dataPedido, agora));

    const faturadoMes = doMes.reduce((acc, v) => acc + totalDoPedido(v), 0);
    const recebidoMes = doMes.filter(estaFechado).reduce((acc, v) => acc + totalDoPedido(v), 0);
    const aReceberTotal = naoCanceladas.filter(estaAberto).reduce((acc, v) => acc + totalDoPedido(v), 0);
    const percentualRecebido = faturadoMes ? (recebidoMes / faturadoMes) * 100 : 0;

    const porMes = MONTHS.map((name, i) => {
      const doMesI = naoCanceladas.filter((v) => {
        const d = new Date(v.pedido.dataPedido);
        return d.getFullYear() === anoAtual && d.getMonth() === i;
      });
      return {
        name,
        faturado: doMesI.reduce((acc, v) => acc + totalDoPedido(v), 0),
        recebido: doMesI.filter(estaFechado).reduce((acc, v) => acc + totalDoPedido(v), 0),
      };
    });

    const pagas = naoCanceladas.filter(estaFechado).length;
    const pendentes = naoCanceladas.filter(estaAberto).length;
    const canceladas = vendas.filter(estaCancelado).length;

    // Top clientes
    const porCliente = new Map<string, TopCliente>();
    naoCanceladas.forEach((v) => {
      const atual = porCliente.get(v.clienteId) ?? {
        clienteId: v.clienteId,
        nome: v.nomeCliente,
        total: 0,
        pedidos: 0,
      };
      atual.total += totalDoPedido(v);
      atual.pedidos += 1;
      porCliente.set(v.clienteId, atual);
    });
    const topClientes = Array.from(porCliente.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      faturadoMes,
      recebidoMes,
      aReceberTotal,
      totalVendas: naoCanceladas.length,
      vendasNoMes: doMes.length,
      percentualRecebido,
      porMes,
      pagas,
      pendentes,
      canceladas,
      topClientes,
    };
  }, [vendas]);

  const abrirPorCliente = (c: TopCliente) => {
    const doCliente = vendas.filter((v) => v.clienteId === c.clienteId).sort((a, b) => +new Date(b.pedido.dataPedido) - +new Date(a.pedido.dataPedido));
    const alvo = doCliente[0];
    if (!alvo) return;
    abrirNota({ id: alvo.pedido.pedidoId, clienteId: alvo.clienteId, nome: alvo.nomeCliente });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <TabOverview {...dados} onAbrirCliente={abrirPorCliente} />

      <Modal open={!!notaAberta} onClose={fecharNota} title="Venda" subtitle={notaAberta?.nome} size="full">
        {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} />}
      </Modal>
    </div>
  );
};

/* ======================= Tab Content ======================= */
function TabOverview({ ...props }: any) {
  const { faturadoMes, recebidoMes, aReceberTotal, totalVendas, vendasNoMes, percentualRecebido, porMes, pagas, pendentes, canceladas, topClientes, onAbrirCliente } = props;

  const maiorTotal = topClientes[0]?.total ?? 0;
  const statusData = [
    { name: "Pago", value: pagas, color: C.green },
    { name: "Pendente", value: pendentes, color: C.red },
    { name: "Cancelado", value: canceladas, color: C.amber },
  ].filter((s) => s.value > 0);

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={<DollarSign className="h-4 w-4 text-[#9b8ff5]" />} chip="bg-[#7c6ef5]/[0.15]" label="Faturado este mês" value={formatCurrency(faturadoMes)} hint={`${vendasNoMes} ${vendasNoMes === 1 ? "venda" : "vendas"}`} />
        <Kpi icon={<CheckCircle className="h-4 w-4 text-[#5dcaa5]" />} chip="bg-[#0f6e56]/30" label="Recebido este mês" value={formatCurrency(recebidoMes)} hint={`${percentualRecebido.toFixed(0)}% do faturado`} />
        <Kpi icon={<AlertCircle className="h-4 w-4 text-[#f09595]" />} chip="bg-[#a22d2d]/20" label="A receber (total)" value={formatCurrency(aReceberTotal)} hint={`${pendentes} ${pendentes === 1 ? "nota aberta" : "notas abertas"}`} />
        <Kpi icon={<ShoppingCart className="h-4 w-4 text-[#fac775]" />} chip="bg-[#ba7517]/25" label="Total de vendas" value={String(totalVendas)} hint={`${vendasNoMes} neste mês`} />
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        {/* Gráfico Anual */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#15132a]">
          <CardHeader icon={<TrendingUp className="h-4 w-4 text-[#9b8ff5]" />} chip="bg-[#7c6ef5]/[0.15]" title="Faturamento anual" sub="Faturado vs recebido por mês" />
          <div className="min-h-[220px] flex-1 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={porMes}>
                <defs>
                  <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="faturado" name="Faturado" stroke={C.accent} strokeWidth={2} fill="url(#gFat)" />
                <Area type="monotone" dataKey="recebido" name="Recebido" stroke={C.green} strokeWidth={2} fill="url(#gRec)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 border-t border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
            {[
              { color: C.accent, label: "Faturado" },
              { color: C.green, label: "Recebido" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-[#8a85b4]">
                <span className="inline-block h-[3px] w-3 rounded-sm" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Status + Top Clientes */}
        <div className="grid min-h-0 grid-rows-2 gap-3">
          {/* Status */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#15132a]">
            <CardHeader icon={<CheckCircle className="h-4 w-4 text-[#5dcaa5]" />} chip="bg-[#0f6e56]/30" title="Status das vendas" sub={`${pagas + pendentes + canceladas} no total`} />
            <div className="flex min-h-0 flex-1 items-center gap-2 p-4">
              <div className="h-full min-h-[110px] flex-1">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={3} dataKey="value">
                        {statusData.map((s, i) => (
                          <Cell key={i} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-[#4e4a72]">Sem dados</div>
                )}
              </div>
              <div className="flex w-28 flex-col gap-2">
                {[
                  { color: C.green, label: "Pago", value: pagas },
                  { color: C.red, label: "Pendente", value: pendentes },
                  { color: C.amber, label: "Cancelado", value: canceladas },
                ].map(({ color, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#8a85b4]">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
                      {label}
                    </span>
                    <span className="text-[#e8e4ff]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Clientes */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#15132a]">
            <CardHeader icon={<Star className="h-4 w-4 text-[#fac775]" />} chip="bg-[#ba7517]/25" title="Top clientes" sub={topClientes.length > 0 ? `${topClientes.length} melhores` : undefined} />
            <div className="flex-1 overflow-auto p-3">
              {topClientes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {topClientes.map((c: TopCliente, i: number) => {
                    const pct = maiorTotal > 0 ? (c.total / maiorTotal) * 100 : 0;
                    return (
                      <button key={c.clienteId} onClick={() => onAbrirCliente(c)} className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-left transition-colors hover:bg-white/[0.06]">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7c6ef5]/[0.2] text-[10px] font-medium text-[#9b8ff5]">{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[11px] text-[#e8e4ff]">{c.nome}</p>
                            <p className="shrink-0 text-[11px] text-[#5dcaa5]">{formatCurrency(c.total)}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                              <div className="h-full rounded-full bg-[#7c6ef5]" style={{ width: `${Math.max(pct, 3)}%` }} />
                            </div>
                            <span className="shrink-0 text-[10px] text-[#4e4a72]">
                              {c.pedidos} {c.pedidos === 1 ? "venda" : "vendas"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[#4e4a72]">Sem dados para exibir</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesOverviewPage;
