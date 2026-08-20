import type UserType from "@/shared/domain/user";

/**
 * Quem é gestor.
 *
 * Este arquivo era a barra de abas da seção de vendas — cinco destinos:
 * panorama, lista, caixa, a pagar e a receber. A barra deixou de existir: o
 * panorama e a lista viraram uma tela só (`VendasPage`) e as três guias do
 * dinheiro viraram outra (`FinanceiroPage`), cada uma com o seu item no menu
 * lateral. Duas seções, nenhuma aba de topo.
 *
 * O que sobrou é a pergunta que meia dúzia de telas faz — quem pode ver o
 * dinheiro da loja —, e ela continua aqui para não haver duas definições de
 * "gestor" no sistema.
 *
 * Gestor = usuário master ou quem ele promoveu a administrador.
 */
export const ehGestor = (user: UserType | null): boolean => Boolean(user?.root) || user?.permissao === "ADMIN";
