import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import CustomerType from "../../../../types/ClientType";

const C = { accent: "#7c6ef5", grid: "rgba(255,255,255,0.08)", tick: "#6f6a93" };
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface ClientesGrowthChartProps {
  customers: CustomerType[];
}

const ClientesGrowthChart = ({ customers }: ClientesGrowthChartProps) => {
  const growth = useMemo(() => {
    const year = new Date().getFullYear();
    const base = MONTHS.map((name) => ({ name, clientes: 0 }));
    customers.forEach((c) => {
      if (!c.created_at) return;
      const d = new Date(c.created_at);
      if (!isNaN(d.getTime()) && d.getFullYear() === year) base[d.getMonth()].clientes += 1;
    });
    return base;
  }, [customers]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#15132a]">
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#7c6ef5]/[0.15] p-2">
            <TrendingUp className="h-4 w-4 text-[#9b8ff5]" />
          </div>
          <h2 className="text-[13px] text-[#e8e4ff]">Crescimento mensal</h2>
        </div>
      </div>

      <div className="min-h-[160px] flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={growth}>
            <defs>
              <linearGradient id="gClientes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent} stopOpacity={0.25} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.tick }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={26}
            />
            <Tooltip
              contentStyle={{
                background: "#15132a",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#e8e4ff" }}
            />
            <Area type="monotone" dataKey="clientes" stroke={C.accent} strokeWidth={2} fill="url(#gClientes)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ClientesGrowthChart;
