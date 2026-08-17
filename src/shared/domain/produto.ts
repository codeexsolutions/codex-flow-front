/** PRODUTO controla estoque; SERVICO não tem o que estocar. */
export type TipoItem = "PRODUTO" | "SERVICO";

/**
 * Conjunto de tamanhos herdado do cadastro antigo.
 *
 * MANTIDO só para não perder o dado de quem já usava — a coluna continua no
 * banco e continua sendo lida. O caminho novo é `Atributo` (ver
 * `shared/domain/estoque.ts`): lá a lista de tamanhos é DA EMPRESA, e não
 * três opções escritas no código que serviam a uma loja de roupa e a nenhuma
 * outra.
 *
 * @deprecated Use atributos e variações.
 */
export type GradeTamanho = "" | "ROUPA" | "CALCADO" | "VOLUME";

type ProductType = {
  id: string;
  nome: string;
  /**
   * No banco a coluna ainda se chama `valor_compra`, mas na interface é
   * "preço de custo": quem presta serviço não compra nada e mesmo assim tem
   * custo, e mesmo na revenda o custo real inclui frete e imposto, não só o
   * que saiu na nota do fornecedor.
   */
  valorCompra: number;
  valorVenda: number;
  imagem: string;
  descricao: string;
  quantidade: number;
  codigoEmpresa: string;
  tipo?: TipoItem;
  /** @deprecated Ver `GradeTamanho`. */
  grade?: GradeTamanho;
  /** Valor dentro da grade: P, M, G, 42, 500ml... @deprecated */
  tamanho?: string;

  /* ── Ficha ──────────────────────────────────────────────────────────────
     Todos opcionais: são campos que a empresa preenche se usar. Produto
     cadastrado antes deles chega sem nenhum, e a tela precisa aguentar isso
     sem mostrar "undefined". */

  sku?: string;
  codigoBarras?: string;
  /** un, kg, m, cx… A unidade é de quem vende; o sistema não tem lista. */
  unidade?: string;

  /**
   * A categoria do produto (migration 045). `null`/vazio = sem categoria.
   *
   * É este campo que se GRAVA. A categoria deixou de ser texto digitado em
   * cada produto e virou cadastro da empresa — ver `Categoria` em
   * `shared/domain/estoque.ts` e o painel que a mantém.
   */
  categoriaId?: string | null;

  /**
   * Só leitura: o nome da categoria acima.
   *
   * O banco o mantém espelhado (gatilho da migration 045) justamente para a
   * lista não precisar cruzar duas coleções só para escrever "Bebidas" numa
   * linha. Mandá-lo de volta na gravação não tem efeito.
   */
  categoria?: string;

  marca?: string;
  /** Onde a peça está: "Prateleira A3", "Depósito 2". */
  localizacao?: string;
  observacoes?: string;
  /** `null` = usa o padrão da tela. Zero é um limite válido, não "sem limite". */
  estoqueMinimo?: number | null;
  /** `false` = não conta unidades (serviço, item sob encomenda). */
  controlaEstoque?: boolean;
  /** `true` = deixa vender no negativo. O padrão é bloquear. */
  permiteVendaSemEstoque?: boolean;
  /** Só leitura: mantido pelo banco a partir das variações. */
  usaVariacoes?: boolean;
};

/**
 * Payload de criação: `id` e `codigoEmpresa` são gerados pelo backend
 * (o último derivado do token), então o formulário não os envia.
 * `descricao` e `imagem` são opcionais no formulário.
 */
export type NovoProdutoDto = Omit<ProductType, "id" | "codigoEmpresa" | "descricao" | "imagem"> & {
  descricao?: string;
  imagem?: string;
};

/** Payload de alteração: identifica pelo `id` e aceita campos parciais. */
export type ProdutoUpdateDto = Partial<Omit<ProductType, "id">> & {
  id: string;
};

/**
 * O aviso de "estoque baixo" quando o produto não configurou o dele.
 *
 * Continua existindo porque a maioria dos cadastros não vai configurar nada, e
 * um sistema que só avisa quando zera não avisa a tempo de comprar. O que
 * mudou é que deixou de ser a ÚNICA regra: quem vende geladeira põe 1 e quem
 * vende parafuso põe 500, cada um no seu produto.
 */
export const ESTOQUE_BAIXO_PADRAO = 5;

/**
 * Como se chama a ausência de categoria, em toda tela que a mostra.
 *
 * Uma constante e não a string solta em cada lugar: a lista, o card do
 * celular, a ficha e o filtro precisam dizer a MESMA coisa. Três grafias
 * ("Sem categoria", "Sem categoria definida", "—") fazem parecer três estados
 * diferentes de um produto que só está sem categoria.
 *
 * E é um nome, não um traço: "—" numa coluna lê-se como "não sei" ou "campo
 * quebrado". "Sem categoria" é uma resposta — e uma que dá para clicar no
 * filtro para achar todos os produtos nessa situação.
 */
export const SEM_CATEGORIA = "Sem categoria";

export type NivelEstoque = "disponivel" | "baixo" | "esgotado" | "ilimitado";

/**
 * Em que pé está o estoque de um item.
 *
 * Centralizado aqui porque a mesma pergunta é feita na listagem, na ficha, no
 * PDV e no card do celular — quatro cópias da regra divergiam na primeira vez
 * que o limite deixou de ser 5 fixo.
 *
 * `ilimitado` é o item que não conta unidades (serviço, encomenda). Antes ele
 * caía em `esgotado` porque a quantidade era zero, e a lista de estoque
 * mostrava todo serviço em vermelho como se fosse problema.
 */
export const nivelEstoque = (produto: Pick<ProductType, "quantidade" | "estoqueMinimo" | "controlaEstoque" | "tipo">): NivelEstoque => {
  const naoConta = produto.controlaEstoque === false || produto.tipo === "SERVICO";

  if (naoConta) return "ilimitado";

  /*
   * `Number()` não é redundante.
   *
   * `produtos.quantidade` é numérico no banco, e o driver do Postgres devolve
   * numérico como STRING para não perder precisão. O tipo daqui diz `number` e
   * mente: em runtime chega "12". Comparação ainda funcionaria por coerção,
   * mas soma não: `0 + "12" + "24"` concatena e vira "01224" — era isso que
   * produzia as quantidades de vinte dígitos na tela.
   */
  const q = Number(produto.quantidade ?? 0) || 0;

  if (q <= 0) return "esgotado";

  const minimo = produto.estoqueMinimo == null ? ESTOQUE_BAIXO_PADRAO : Number(produto.estoqueMinimo);

  return q <= minimo ? "baixo" : "disponivel";
};

export default ProductType;
