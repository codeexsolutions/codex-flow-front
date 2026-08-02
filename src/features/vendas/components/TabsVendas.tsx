import { ShoppingCart, TrendingUp, Users } from "lucide-react";

import type UserType from "@/shared/domain/user";

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

const FUNCIONARIOS = {
  label: "Funcionários",
  path: "/vendas/funcionarios",
  icon: <Users size={15} />,
};

/** Gestor = usuário master ou quem ele promoveu a administrador. */
export const ehGestor = (user: UserType | null): boolean => Boolean(user?.root) || user?.permissao === "ADMIN";

/**
 * Vendedor não vê a aba Funcionários. Esconder é conveniência: quem digitar a
 * rota na mão leva 403 da API, que é onde a regra de verdade mora.
 */
export const tabsVendas = (user: UserType | null) => (ehGestor(user) ? [...TabsVendas, FUNCIONARIOS] : TabsVendas);
