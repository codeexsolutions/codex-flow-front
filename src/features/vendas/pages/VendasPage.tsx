import { ShoppingCart } from "lucide-react";

import { PageScreen } from "@/shared/ui/PageShell";
import useAuth from "@/features/auth/store/auth.store";
import { ehGestor } from "@/features/vendas/components/TabsVendas";
import SalesOverviewPage from "@/features/vendas/pages/SalesOverviewPage";
import SalesList from "@/features/vendas/pages/SalesListPage";

/**
 * Vendas — o panorama e as notas na MESMA tela.
 *
 * ---------------------------------------------------------------------------
 * Por que as duas viraram uma
 * ---------------------------------------------------------------------------
 * Eram duas abas de uma barra de cinco: "Visão geral" e "Vendas". Elas
 * respondem a mesma pergunta em duas escalas — quanto a loja vendeu, e quais
 * notas somam esse quanto —, e a resposta de uma quase sempre puxava a outra:
 * o dono via "R$ 4.200 a receber" no panorama e clicava na aba ao lado para
 * descobrir de quem. Duas telas para um movimento só é uma troca de contexto
 * cobrada por nada; junto, o número e a linha que o explica estão no mesmo
 * rolar de página.
 *
 * O caixa e as contas saíram daqui e viraram tela própria — ver
 * `FinanceiroPage`. A divisão passou a ser a que a cabeça do lojista já faz:
 * **o que eu vendi** de um lado, **o dinheiro da empresa** do outro.
 *
 * ---------------------------------------------------------------------------
 * O vendedor vê só a metade de baixo
 * ---------------------------------------------------------------------------
 * Panorama da loja é assunto do dono. Para o vendedor a tela abre direto na
 * lista, que passa a ser "as minhas" — a própria lista já filtra pelo autor, e
 * o cabeçalho diz isso no título em vez de deixar a pessoa deduzir.
 *
 * Esconder é conveniência; quem barra de verdade é a API.
 */
const VendasPage = () => {
  const { user } = useAuth();
  const gestor = ehGestor(user);

  return (
    <PageScreen
      icon={<ShoppingCart className="h-5 w-5" />}
      title={gestor ? "Vendas" : "Minhas vendas"}
      subtitle={
        gestor
          ? "O mês da loja e todas as notas, com o que já foi pago e o que vence"
          : "As vendas que você fez, com o que já foi pago e o que vence"
      }
    >
      {gestor && <SalesOverviewPage />}

      {/*
       * A lista ganha altura mínima em vez de esticar.
       *
       * Sozinha numa rota ela era `flex-1` e tomava a janela inteira — a
       * paginação existe justamente para a tabela caber sem rolar. Embaixo do
       * panorama isso não vale mais: quem manda na altura da página é a soma
       * dos dois blocos, e um `flex-1` aqui brigaria com os painéis de cima
       * por um espaço que já acabou. O piso de 520px garante oito linhas —
       * abaixo disso a tabela vira um visor de três notas e a paginação passa
       * a custar mais cliques do que economiza.
       */}
      <div className="flex min-h-[520px] flex-col">
        <SalesList />
      </div>
    </PageScreen>
  );
};

export default VendasPage;
