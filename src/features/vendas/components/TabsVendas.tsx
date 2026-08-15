import type { ReactNode } from "react";
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, ShoppingCart, TrendingUp, Wallet } from "lucide-react";

import type { HeaderTab } from "@/shared/ui/HeaderPage";
import type UserType from "@/shared/domain/user";

/**
 * A seção do dinheiro: uma barra de abas só.
 *
 * Vender e receber são o mesmo assunto visto de dois lados — a nota que sai em
 * Vendas é a mesma que aparece em "a receber" —, e por isso as duas coisas
 * moram no mesmo outlet.
 *
 * O que mudou: o Financeiro era UMA aba que, por dentro, tinha outras quatro.
 * Dois níveis de navegação para o mesmo assunto, com "Visão geral" existindo
 * duas vezes querendo dizer coisas diferentes — e a sidebar mandando "Caixa e
 * contas" para uma tela cujo título era "Vendas". As quatro subiram para cá e
 * viraram rota de verdade: uma barra, cinco destinos, cada um com endereço
 * próprio (dá para favoritar "A pagar") e o cabeçalho dizendo o nome do lugar
 * onde a pessoa está.
 */

export type AbaVendas = HeaderTab & {
  /** Identidade que o cabeçalho assume quando esta aba está aberta. */
  titulo: string;
  descricao: string;
  simbolo: ReactNode;
};

/** Gestor = usuário master ou quem ele promoveu a administrador. */
export const ehGestor = (user: UserType | null): boolean => Boolean(user?.root) || user?.permissao === "ADMIN";

const panorama: AbaVendas = {
  label: "Visão geral",
  path: "/vendas",
  icon: <TrendingUp size={15} />,
  titulo: "Visão geral",
  descricao: "O mês da loja: o que faturou, o que entrou e o que falta receber",
  simbolo: <TrendingUp className="h-5 w-5" />,
};

const lista: AbaVendas = {
  label: "Vendas",
  path: "/vendas/lista",
  icon: <ShoppingCart size={15} />,
  titulo: "Vendas",
  descricao: "Todas as notas, com o que já foi pago e o que vence",
  simbolo: <ShoppingCart className="h-5 w-5" />,
};

const caixa: AbaVendas = {
  label: "Caixa",
  path: "/vendas/caixa",
  icon: <ArrowLeftRight size={15} />,
  titulo: "Caixa",
  descricao: "Tudo que entrou e saiu no período",
  simbolo: <Wallet className="h-5 w-5" />,
};

const aPagar: AbaVendas = {
  label: "A pagar",
  path: "/vendas/a-pagar",
  icon: <ArrowUpCircle size={15} />,
  titulo: "Contas a pagar",
  descricao: "O que a empresa deve, por vencimento",
  simbolo: <ArrowUpCircle className="h-5 w-5" />,
};

const aReceber: AbaVendas = {
  label: "A receber",
  path: "/vendas/a-receber",
  icon: <ArrowDownCircle size={15} />,
  titulo: "Contas a receber",
  descricao: "O que a empresa tem a receber, por vencimento",
  simbolo: <ArrowDownCircle className="h-5 w-5" />,
};

/** Para o vendedor, a lista é "as minhas" — o rótulo diz isso. */
const minhasVendas: AbaVendas = {
  ...lista,
  label: "Minhas vendas",
  titulo: "Minhas vendas",
  descricao: "As vendas que você fez",
};

/**
 * O vendedor fica só com as próprias vendas: sem panorama da loja, sem caixa e
 * sem contas — dinheiro é assunto do dono. Com uma aba só, a barra some, o que
 * é correto: aba única é ruído.
 *
 * Esconder é conveniência; a rota também barra e a API é quem decide de verdade.
 */
export const abasVendas = (user: UserType | null): AbaVendas[] =>
  ehGestor(user) ? [panorama, lista, caixa, aPagar, aReceber] : [minhasVendas];

/**
 * Qual aba a URL está mostrando.
 *
 * Compara o caminho inteiro, do mais específico para o mais genérico: "/vendas"
 * é prefixo de todas as outras e, testado primeiro, casaria com qualquer uma.
 */
export const abaAtiva = (pathname: string, user: UserType | null): AbaVendas => {
  const abas = abasVendas(user);
  const exata = abas.find((a) => a.path === pathname);

  if (exata) return exata;

  const porPrefixo = abas.filter((a) => a.path !== "/vendas").find((a) => pathname.startsWith(`${a.path}/`));

  return porPrefixo ?? abas[0];
};
