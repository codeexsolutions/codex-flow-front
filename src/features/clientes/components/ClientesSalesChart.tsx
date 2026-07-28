import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../../../../utils/formatCurrency";

const C = {
  accent: "#7c6ef5",
  grid: "rgba(255,255,255,0.08)",
  tick: "#6f6a93",
};

interface ClienteSalesChartProps {
  monthlyData: { label: string; total: number }[];
}

const ClienteSalesChart = ({ monthlyData }: ClienteSalesChartProps) => {
  const chartData = useMemo(() => {
    return monthlyData.map((item) => ({
      name: item.label,
      total: item.total,
      formatted: formatCurrency(item.total),
    }));
  }, [monthlyData]);

  const hasData = chartData.some((d) => d.total > 0);

  return (
    <div className="h-full w-full">
      {hasData ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
          debounce={50} // ← importante para evitar render precoce
        >
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent} stopOpacity={0.35} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "#15132a",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(value) => [formatCurrency(Number(value ?? 0)), "Total"]}
            />
            <Area type="natural" dataKey="total" stroke={C.accent} strokeWidth={2.5} fill="url(#salesGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-[#6f6a93] text-sm">
          Nenhuma venda registrada nos últimos 6 meses
        </div>
      )}
    </div>
  );
};

export default ClienteSalesChart;
