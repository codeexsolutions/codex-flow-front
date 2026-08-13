/**
 * CPF ou CNPJ, e quando cada um pode aparecer numa nota.
 *
 * Fica num arquivo só porque a regra vale em mais de um lugar — cabeçalho da
 * empresa, bloco do cliente, orçamento. Repetida em cada tela, bastaria
 * esquecer uma para o CPF continuar saindo impresso justamente onde ninguém
 * olhou.
 */

const digitos = (valor?: string | null) => String(valor ?? "").replace(/\D/g, "");

export const ehCpf = (valor?: string | null) => digitos(valor).length === 11;

export const ehCnpj = (valor?: string | null) => digitos(valor).length === 14;

/** "CPF", "CNPJ", ou "Documento" para o que não é nem um nem outro. */
export const rotuloDocumento = (valor?: string | null) => (ehCnpj(valor) ? "CNPJ" : ehCpf(valor) ? "CPF" : "Documento");

/**
 * O documento pode ser impresso?
 *
 * CNPJ sempre pode: é público, identifica a empresa e é o que se espera numa
 * nota. CPF depende da opção da empresa, que vem LIGADA (esconder) de fábrica —
 * uma nota sem CPF continua servindo para tudo, e uma nota com o CPF de quem
 * não pediu para publicá-lo não tem como ser recolhida depois de entregue.
 *
 * `ocultarCpf` indefinido é tratado como `true`: empresa cuja configuração
 * ainda não carregou não pode, nesse intervalo, imprimir o que deveria esconder.
 */
export const podeMostrarDocumento = (valor: string | null | undefined, ocultarCpf: boolean | undefined) => {
  if (!digitos(valor)) return false;

  if (ehCpf(valor)) return ocultarCpf === false;

  return true;
};
