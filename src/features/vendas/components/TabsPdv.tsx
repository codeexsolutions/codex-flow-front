import { ShoppingCart, FileText } from "lucide-react";

/**
 * Abas do balcão.
 *
 * Vender e orçar são o mesmo gesto com desfechos diferentes: escolhe cliente,
 * lança produtos e, no fim, ou fatura ou manda a proposta. Como abas, trocar
 * entre os dois é um clique e o operador não sai do contexto.
 */
export const TabsPdv = [
  { label: "Vendas", path: "/pdv", icon: <ShoppingCart size={15} /> },
  { label: "Orçamentos", path: "/pdv/orcamentos", icon: <FileText size={15} /> },
];
