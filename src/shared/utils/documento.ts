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

/** Só os dígitos de um documento — o formato que o servidor grava. */
export const soDigitos = (valor?: string | null) => digitos(valor);

/** Dígito verificador de um CPF parcial, pelo peso decrescente. */
const digitoCpf = (base: string, pesoInicial: number): number => {
  const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * (pesoInicial - i), 0);
  const resto = (soma * 10) % 11;

  // 10 e 11 valem zero — é a regra da Receita, não um caso de borda nosso.
  return resto >= 10 ? 0 : resto;
};

/**
 * O CPF fecha a conta dos dois dígitos verificadores?
 *
 * Contar onze dígitos não basta para um cadastro de funcionário: o CPF é o que
 * impede a mesma pessoa de entrar duas vezes na equipe e o que vai para
 * holerite. Um número errado de digitação passa despercebido por meses e só
 * aparece quando alguém tenta usá-lo — quando já há ponto e comissão
 * pendurados no cadastro errado.
 *
 * A mesma regra existe no servidor (`shared/utilities/cpf.ts`), e é lá que ela
 * VALE: esta aqui serve para o campo avisar enquanto se digita, em vez de a
 * pessoa descobrir o erro depois de clicar em salvar.
 */
export const cpfValido = (valor?: string | null): boolean => {
  const cpf = digitos(valor);

  if (cpf.length !== 11) return false;

  /* 000.000.000-00 e os outros nove repetidos passam na conta dos dígitos
     verificadores e não são CPF de ninguém. É o que aparece quando alguém
     "preenche para sair da tela". */
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  return digitoCpf(cpf.slice(0, 9), 10) === Number(cpf[9])
    && digitoCpf(cpf.slice(0, 10), 11) === Number(cpf[10]);
};

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
