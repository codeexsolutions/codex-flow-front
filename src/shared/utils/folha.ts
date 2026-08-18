/**
 * A aritmética da folha.
 *
 * Uma linha só hoje, e num arquivo próprio de propósito: o líquido é lido em
 * dois lugares — o formulário que mostra o número enquanto se digita e o
 * documento que vai impresso. Copiado nos dois, bastaria alguém mudar a ordem
 * de um sinal para o papel discordar da tela que o gerou, e o erro só
 * apareceria no bolso de alguém.
 *
 * É também onde entram as próximas contas da folha (comissão sobre vendas,
 * horas trabalhadas contra a jornada), que hoje ainda não existem.
 */

export type ComposicaoFolha = {
  salarioBruto: number;
  descontos: number;
  adicionais: number;
};

/** Bruto + adicionais − descontos. Pode dar negativo — quem recusa é a tela. */
export const liquidoDaFolha = (c: ComposicaoFolha): number =>
  (Number(c.salarioBruto) || 0) + (Number(c.adicionais) || 0) - (Number(c.descontos) || 0);
