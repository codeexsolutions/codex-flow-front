import { ShoppingCart, TrendingUp } from "lucide-react";

export const TabsVendas = [
  {
    label: "Visão Geral",
    path: "/vendas",
    icon: <TrendingUp size={15} />,
  },
  {
    label: "Vendas",
    path: "/vendas/lista",
    icon: <ShoppingCart size={15} />,
  },
];
