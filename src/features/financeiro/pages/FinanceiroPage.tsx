import { useParams } from "react-router-dom";
import { Wallet } from "lucide-react";

import { PageScreen } from "@/shared/ui/PageShell";
import CaixaPage, { type AbaFinanceiro } from "@/features/financeiro/pages/CaixaPage";

/**
 * Financeiro — o dinheiro da empresa numa tela só.
 *
 * ---------------------------------------------------------------------------
 * O que estava espalhado
 * ---------------------------------------------------------------------------
 * Eram três das cinco abas de "Vendas": Caixa, A pagar e A receber. A barra
 * misturava dois assuntos — o que a loja vendeu e o dinheiro que a empresa
 * tem — e obrigava a atravessar cinco pílulas para ir de "A pagar" a "A
 * receber", que são a mesma pergunta virada para os dois lados. E o menu
 * lateral chamava tudo de "Financeiro", mandando a pessoa para uma tela cujo
 * título era outro.
 *
 * Agora são duas seções de verdade: **Vendas** (o que vendi) e **Financeiro**
 * (o dinheiro da empresa). E aqui dentro nem sobrou uma segunda barra de
 * navegação: as quatro listas — entradas, saídas, a pagar e a receber — são
 * abas da própria TABELA, ao lado dos números e do gráfico que valem para
 * todas elas. Ver `CaixaPage`.
 *
 * ---------------------------------------------------------------------------
 * Quatro abas, três endereços
 * ---------------------------------------------------------------------------
 * A aba inicial vem da URL (`/financeiro`, `/financeiro/a-pagar`,
 * `/financeiro/a-receber`): dá para favoritar "A pagar", mandar o link para o
 * contador e voltar nele pelo histórico. Depois de aberta, trocar de aba não
 * muda o endereço — é uma tela só, não quatro.
 */

/*
 * Os endereços antigos continuam de pé.
 *
 * `/financeiro/a-pagar` virou a aba "Contas"; `/financeiro/a-receber` deixou
 * de existir aqui — o que os clientes devem é venda a prazo e mora em
 * `/vendas` — então quem chega por ele cai nas contas e vê a tela certa em vez
 * de um 404.
 */
const ABAS_DA_URL: Record<string, AbaFinanceiro> = {
  "contas": "contas",
  "a-pagar": "contas",
  "a-receber": "contas",
  "saidas": "saidas",
  "recebimentos": "entradas",
  "entradas": "entradas",
  "caixa": "entradas",
};

const FinanceiroPage = () => {
  const { aba } = useParams();

  return (
    <PageScreen
      icon={<Wallet className="h-5 w-5" />}
      title="Financeiro"
      subtitle="O que entrou, o que saiu e o que ainda vence"
    >
      {/* `key` remonta a tela quando o endereço muda de guia: sem ela, ir de
          /financeiro/a-pagar para /financeiro/a-receber pelo histórico
          deixaria a aba antiga aberta, porque `abaInicial` só é lido no
          primeiro render. */}
      <CaixaPage key={aba ?? "caixa"} abaInicial={(aba && ABAS_DA_URL[aba]) || "entradas"} />
    </PageScreen>
  );
};

export default FinanceiroPage;
