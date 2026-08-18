import sysgrafix from "@/shared/api/sysgrafix";
import type {
  Equipe, Funcionario, JornadaDia, PermissaoFuncionario, PontoRegistro, TipoPonto,
} from "@/shared/domain/funcionario";

/**
 * A equipe.
 *
 * As operações estão em dois grupos — a PESSOA e o ACESSO — porque são duas
 * coisas com regras diferentes desde a migration 046: cadastrar quem trabalha
 * não custa vaga do plano nem pede senha; dar acesso a essa pessoa custa vaga,
 * pede e-mail único e passa pela regra de quem pode criar administrador.
 */

export type { Equipe, Funcionario, PermissaoFuncionario } from "@/shared/domain/funcionario";

/** Só `nome` é exigido — ver a nota de `dataNascimento` em `Funcionario`. */
export type NovoFuncionario = {
  nome: string;
  dataNascimento?: string | null;
  cpf?: string | null;
  cargo?: string;
  salario?: number | null;
  ganhaComissao?: boolean;
  comissaoPercentual?: number | null;
  batePonto?: boolean;
  jornada?: JornadaDia[];
};

export type NovoAcesso = {
  email: string;
  senha: string;
  permissao?: PermissaoFuncionario;
  areas?: string[];
};

type RetornoPadrao<T> = { statusCode: number; message: string; data: T[] };

/** A API devolve a mensagem real do erro; ela é boa o bastante para a tela. */
const erro = (e: unknown, padrao: string): Error => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return new Error(err?.response?.data?.message ?? err?.message ?? padrao);
};

/** Todo endpoint da casa responde `{ statusCode, message, data: [] }`. */
const primeiro = async <T>(promessa: Promise<{ data?: RetornoPadrao<T> }>, padrao: string): Promise<T> => {
  try {
    const res = await promessa;
    const item = res.data?.data?.[0];

    if (item === undefined) throw new Error(res.data?.message || padrao);

    return item;
  } catch (e) {
    throw erro(e, padrao);
  }
};

const FuncionarioService = {

  listar: (): Promise<Equipe> =>
    primeiro(sysgrafix.get<RetornoPadrao<Equipe>>("/funcionarios"), "Não foi possível carregar a equipe."),

  /* ── A pessoa ───────────────────────────────────────────────────────── */

  cadastrar: (dados: NovoFuncionario): Promise<Funcionario> =>
    primeiro(sysgrafix.post<RetornoPadrao<Funcionario>>("/funcionarios", dados), "Não foi possível cadastrar o funcionário."),

  alterar: (id: string, dados: Partial<NovoFuncionario> & { ativo?: boolean }): Promise<Funcionario> =>
    primeiro(sysgrafix.patch<RetornoPadrao<Funcionario>>(`/funcionarios/${id}`, dados), "Não foi possível atualizar o funcionário."),

  excluir: async (id: string): Promise<void> => {
    try {
      await sysgrafix.delete(`/funcionarios/${id}`);
    } catch (e) {
      throw erro(e, "Não foi possível remover o funcionário.");
    }
  },

  /* ── O acesso ao sistema ────────────────────────────────────────────── */

  criarAcesso: (id: string, dados: NovoAcesso): Promise<Funcionario> =>
    primeiro(sysgrafix.post<RetornoPadrao<Funcionario>>(`/funcionarios/${id}/acesso`, dados), "Não foi possível criar o acesso."),

  alterarAcesso: (id: string, dados: { permissao?: PermissaoFuncionario; areas?: string[] }): Promise<Funcionario> =>
    primeiro(sysgrafix.patch<RetornoPadrao<Funcionario>>(`/funcionarios/${id}/acesso`, dados), "Não foi possível atualizar o acesso."),

  removerAcesso: (id: string): Promise<Funcionario> =>
    primeiro(sysgrafix.delete<RetornoPadrao<Funcionario>>(`/funcionarios/${id}/acesso`), "Não foi possível remover o acesso."),

  alterarStatus: (id: string, ativo: boolean): Promise<Funcionario> =>
    primeiro(sysgrafix.patch<RetornoPadrao<Funcionario>>(`/funcionarios/${id}/status`, { ativo }), "Não foi possível alterar o status."),

  redefinirSenha: async (id: string, senha: string): Promise<void> => {
    try {
      await sysgrafix.post(`/funcionarios/${id}/senha`, { senha });
    } catch (e) {
      throw erro(e, "Não foi possível redefinir a senha.");
    }
  },

  /* ── Jornada e ponto ────────────────────────────────────────────────── */

  /**
   * Grava a semana INTEIRA de uma vez.
   *
   * Não há "salvar um dia": a tela edita a semana como um bloco, e a folga é a
   * AUSÊNCIA de um dia na lista. Mandar dia a dia não teria como expressar
   * "desmarquei o sábado" — o dia simplesmente não viria, e o servidor leria
   * isso como "não mexeu".
   */
  salvarJornada: (id: string, dias: JornadaDia[]): Promise<Funcionario> =>
    primeiro(sysgrafix.put<RetornoPadrao<Funcionario>>(`/funcionarios/${id}/jornada`, { dias }), "Não foi possível salvar a jornada."),

  ponto: async (id: string, limite = 100): Promise<PontoRegistro[]> => {
    try {
      const res = await sysgrafix.get<RetornoPadrao<PontoRegistro>>(`/funcionarios/${id}/ponto`, { params: { limite } });
      return res.data?.data ?? [];
    } catch (e) {
      throw erro(e, "Não foi possível carregar o ponto.");
    }
  },

  registrarPonto: (id: string, tipo: TipoPonto, observacao?: string): Promise<PontoRegistro> =>
    primeiro(
      sysgrafix.post<RetornoPadrao<PontoRegistro>>(`/funcionarios/${id}/ponto`, { tipo, observacao }),
      "Não foi possível registrar o ponto.",
    ),
};

export default FuncionarioService;
