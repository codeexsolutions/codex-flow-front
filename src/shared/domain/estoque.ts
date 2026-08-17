/**
 * O vocabulário do estoque avançado.
 *
 * Espelha `application/dtos/estoqueDto.ts` da API. Quando um campo mudar de um
 * lado, tem de mudar do outro — não há geração automática entre os dois, e o
 * TypeScript daqui não enxerga o de lá.
 */

/* ────────────────────────────── Categorias ─────────────────────────────── */

/**
 * Uma gaveta do catálogo — "Bebidas", "Vestuário", "Serviços".
 *
 * Substitui o texto que se digitava em cada produto. Aquilo não tinha como
 * evitar que "Bebida", "Bebidas" e "bebidas" virassem três filtros distintos,
 * nem como renomear uma delas sem reabrir produto por produto.
 */
export type Categoria = {
  id: string;
  nome: string;
  /** Hex da bolinha ao lado do nome. `null` = a tela usa o tom neutro. */
  cor?: string | null;
  /** Só leitura: quantos produtos ativos estão nela. */
  quantosProdutos?: number;
};

/* ─────────────────────────────── Atributos ─────────────────────────────── */

/**
 * Um eixo de variação — "Tamanho", "Cor", "Voltagem".
 *
 * Substitui a antiga constante `GRADES`, que trazia ROUPA/CALCADO/VOLUME
 * escritos no código com os valores de cada uma. Aquela lista servia a uma
 * loja de roupa e a nenhuma outra: quem vende tinta precisa de "3,6L" e quem
 * vende parafuso precisa de "M6", e nenhum dos dois podia acrescentar um valor
 * sem alguém publicar uma versão nova do sistema.
 */
export type Atributo = {
  id: string;
  nome: string;
  /** `COR` desenha a bolinha do `corHex`; `TEXTO` desenha o rótulo. */
  tipo: "TEXTO" | "COR" | string;
  ordem: number;
  valores: AtributoValor[];
};

export type AtributoValor = {
  id: string;
  atributoId?: string;
  valor: string;
  corHex?: string | null;
  ordem: number;
};

/* ─────────────────────────────── Variações ─────────────────────────────── */

export type VariacaoValor = {
  atributoId: string;
  valorId: string;
  atributoNome?: string;
  valor?: string;
  corHex?: string | null;
};

export type Variacao = {
  id: string;
  produtoId?: string;
  sku?: string | null;
  codigoBarras?: string | null;
  /** `null` = herda o preço do produto. Zero é um preço válido, não "herda". */
  valorVenda?: number | null;
  valorCompra?: number | null;
  quantidade: number;
  estoqueMinimo?: number | null;
  imagem?: string | null;
  ativo: boolean;
  valores: VariacaoValor[];
  /** "M / Azul" — montado pela API para ser o mesmo texto em toda tela. */
  descricao?: string;
  /** O preço que vale de fato: o próprio, ou o do produto quando herda. */
  valorVendaEfetivo?: number;
};

/** O que o formulário de variação envia. */
export type VariacaoInput = {
  id?: string;
  sku?: string | null;
  codigoBarras?: string | null;
  valorVenda?: number | null;
  valorCompra?: number | null;
  quantidade?: number;
  estoqueMinimo?: number | null;
  imagem?: string | null;
  ativo?: boolean;
  valores: { atributoId: string; valorId: string }[];
};

/* ──────────────────────────────── Insumos ──────────────────────────────── */

export type Insumo = {
  id: string;
  produtoId?: string;
  insumoId: string;
  variacaoId?: string | null;
  quantidade: number;
  insumoNome?: string;
  insumoUnidade?: string;
  insumoQuantidadeAtual?: number;
  insumoControlaEstoque?: boolean;
  /** Quantas unidades do produto final este insumo ainda permite fazer. */
  rendimento?: number;
};

/* ──────────────────────────────── Extrato ──────────────────────────────── */

export type TipoMovimento = "ENTRADA" | "SAIDA" | "AJUSTE" | "VENDA" | "CANCELAMENTO" | "CONSUMO";

export type Movimento = {
  id: string;
  produtoId?: string;
  variacaoId?: string | null;
  tipo: TipoMovimento;
  /** Assinada: entrada positiva, saída negativa. */
  quantidade: number;
  saldoApos?: number | null;
  motivo?: string | null;
  custoUnitario?: number | null;
  pedidoId?: string | null;
  criadoEm?: string;
  variacaoDescricao?: string;
  usuarioNome?: string | null;
};

/**
 * O rótulo de cada tipo, e a cor que ele usa.
 *
 * Um mapa só, e não um `switch` por tela: o extrato aparece na ficha do
 * produto e no futuro em relatório, e duas listas de rótulos divergem na
 * primeira vez que alguém acrescenta um tipo.
 */
export const MOVIMENTO_LABEL: Record<TipoMovimento, { texto: string; tom: "entrada" | "saida" | "neutro" }> = {
  ENTRADA: { texto: "Entrada", tom: "entrada" },
  SAIDA: { texto: "Saída", tom: "saida" },
  AJUSTE: { texto: "Ajuste", tom: "neutro" },
  VENDA: { texto: "Venda", tom: "saida" },
  CANCELAMENTO: { texto: "Devolução", tom: "entrada" },
  CONSUMO: { texto: "Consumo", tom: "saida" },
};

/* ───────────────────────────────── Ficha ───────────────────────────────── */

export type FichaProduto = {
  produto: import("@/shared/domain/produto").default;
  variacoes: Variacao[];
  insumos: Insumo[];
  usadoEm: { produtoId: string; produtoNome: string; quantidade: number }[];
  movimentos: Movimento[];
  atributos: Atributo[];
  /** As categorias DA EMPRESA — a do produto está em `produto.categoriaId`. */
  categorias: Categoria[];
  /** `-1` = nada limita. Ver a nota em `EstoqueService.calcularDisponivel`. */
  disponivel: number;
  limitadoPor: string | null;
};

/* ──────────────────────────── Falta de estoque ─────────────────────────── */

export type Indisponibilidade = {
  produtoId: string;
  produtoNome: string;
  variacaoId?: string | null;
  variacaoDescricao?: string;
  solicitado: number;
  disponivel: number;
  motivo: "PRODUTO" | "INSUMO";
  insumoNome?: string;
};

/**
 * A recusa por falta de estoque vem em 409, com a lista item a item.
 *
 * Reconhecida pelo STATUS e não pela frase: a mensagem é escrita para gente e
 * vai mudar; o 409 é contrato. Ver o tratador de erro em `server.ts` da API
 * sobre por que 409 e não 400.
 */
export const extrairFaltas = (erro: unknown): Indisponibilidade[] => {
  const resposta = (erro as { response?: { status?: number; data?: { data?: unknown } } })?.response;

  if (resposta?.status !== 409) return [];

  return Array.isArray(resposta.data?.data) ? (resposta.data.data as Indisponibilidade[]) : [];
};
