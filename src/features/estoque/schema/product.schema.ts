import { z } from "zod";

/**
 * O formulário do item — produto ou serviço.
 *
 * ---------------------------------------------------------------------------
 * O que saiu daqui, e por quê
 * ---------------------------------------------------------------------------
 * Havia uma constante `GRADES` com ROUPA/CALCADO/VOLUME e os tamanhos de cada
 * uma escritos no código (PP..XGG, 33..46, 50ml..5kg). Ela resolvia o problema
 * de quem vende roupa e ignorava todo o resto: a loja de tintas precisa de
 * "3,6L", a de parafusos precisa de "M6", e nenhuma das duas podia
 * acrescentar um valor sem alguém publicar uma versão nova do sistema.
 *
 * O lugar dos tamanhos agora é o cadastro de ATRIBUTOS da empresa, e a peça
 * que carrega tamanho e cor é a VARIAÇÃO — as duas na ficha do produto, onde
 * há espaço para elas. Este formulário voltou a ser o que ele é: identidade,
 * preço e as regras de estoque do item.
 *
 * `grade` e `tamanho` não aparecem nem no schema nem no payload. A API só
 * altera o que recebe, então o que já estava gravado continua gravado.
 */
export const productSchema = z
  .object({
    nome: z.string().min(3, "Informe o nome do produto"),

    /** PRODUTO controla estoque; SERVICO não tem o que estocar. */
    tipo: z.enum(["PRODUTO", "SERVICO"]).default("PRODUTO"),

    /**
     * A coluna do banco continua `valor_compra`; o rótulo na tela é "preço de
     * custo". Renomear o campo aqui obrigaria a traduzir de um lado para o
     * outro em service, store e API — trabalho que só o nome não justifica.
     */
    valorCompra: z.coerce.number().min(0, "Valor inválido"),

    valorVenda: z.coerce.number().min(0, "Valor inválido"),

    quantidade: z.coerce.number().min(0, "Quantidade inválida"),

    descricao: z.string().optional(),

    imagem: z.string().optional(),

    /* ── Ficha ──────────────────────────────────────────────────────────── */

    sku: z.string().optional(),
    codigoBarras: z.string().optional(),
    unidade: z.string().optional(),

    /**
     * A categoria é ESCOLHIDA, não digitada.
     *
     * Aqui havia um campo de texto livre. O que ele produzia em uso era o
     * mesmo problema que a antiga constante `GRADES` produzia do outro lado:
     * "Bebida", "Bebidas" e "bebidas" viravam três categorias para o sistema e
     * uma só para quem vende — e o filtro da lista, que monta as opções a
     * partir do que está gravado, mostrava as três com um pedaço dos produtos
     * em cada.
     *
     * O que se manda é o id de uma categoria cadastrada (migration 045).
     * String vazia = sem categoria, e isso é uma escolha válida: nem todo item
     * pertence a uma gaveta.
     */
    categoriaId: z.string().optional(),

    marca: z.string().optional(),
    localizacao: z.string().optional(),
    observacoes: z.string().optional(),

    /**
     * Abaixo disto a tela avisa.
     *
     * String vazia vira `null` — e `null` significa "usa o padrão da tela",
     * não zero. Zero é um limite válido ("só me avise quando acabar"), e
     * confundir os dois faria todo produto sem configuração parar de avisar.
     * `preprocess` porque o input HTML devolve "" quando o campo é limpo, e
     * `z.coerce.number()` transformaria isso em 0 silenciosamente.
     */
    estoqueMinimo: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().min(0, "Valor inválido").nullable(),
    ),

    controlaEstoque: z.boolean().default(true),

    permiteVendaSemEstoque: z.boolean().default(false),
  })
  /*
   * Vender sem estoque só faz sentido para quem CONTA estoque.
   *
   * Marcar os dois não é contraditório a ponto de impedir o salvamento, mas
   * deixa na tela uma opção que não faz nada — e uma opção que não faz nada é
   * pior que uma opção ausente: quem a marcou acredita ter configurado algo.
   * O `transform` desliga a segunda em vez de mostrar erro, porque o que a
   * pessoa quis dizer não é ambíguo.
   */
  .transform((d) => ({
    ...d,
    permiteVendaSemEstoque: d.controlaEstoque ? d.permiteVendaSemEstoque : false,
    /* Serviço não conta unidades — a regra vale no dado, e não só no que a
       tela esconde: item entra por importação e pela API também. */
    controlaEstoque: d.tipo === "SERVICO" ? false : d.controlaEstoque,
    quantidade: d.tipo === "SERVICO" ? 0 : d.quantidade,
  }));

/**
 * `z.coerce.number()` aceita string na entrada (o que o input HTML devolve) e
 * garante number na saída — por isso entrada e saída são tipos distintos.
 */
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormData = z.output<typeof productSchema>;

/**
 * Lucro e margem de uma venda.
 *
 * A margem é sobre a VENDA, não sobre o custo — é a conta que o comerciante
 * usa ("nessa camiseta eu ganho 40%") e a que aparece em qualquer relatório
 * de resultado. Sobre o custo, o mesmo caso daria 66%, e o número maior
 * enganaria justamente quem está formando preço.
 */
export const calcularGanho = (custo: number, venda: number) => {
  const lucro = venda - custo;

  return {
    lucro,
    // Sem preço de venda não há margem — e dividir por zero mostraria
    // "Infinity%" na tela, que é pior do que não mostrar nada.
    margem: venda > 0 ? (lucro / venda) * 100 : null,
  };
};
