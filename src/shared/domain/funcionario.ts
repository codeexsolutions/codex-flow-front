/**
 * A equipe: as pessoas, o acesso delas, a jornada e o ponto.
 *
 * Espelha `application/dtos/funcionarioDto.ts` da API. Quando um campo mudar de
 * um lado, tem de mudar do outro — não há geração automática entre os dois.
 *
 * ---------------------------------------------------------------------------
 * Funcionário e usuário são coisas DIFERENTES
 * ---------------------------------------------------------------------------
 * Eram a mesma linha até a migration 046. Agora `Funcionario` é a PESSOA e
 * `acesso` é o login dela, quando tem. `acesso: null` significa "trabalha aqui
 * e não entra no sistema" — o caso da costureira e do entregador, que antes
 * obrigava a inventar e-mail e senha e ainda consumia vaga do plano.
 */

export type PermissaoFuncionario = "ADMIN" | "USUARIO";
export type StatusAcesso = "ATIVO" | "INATIVO";

/** O login de um funcionário. */
export type AcessoFuncionario = {
  usuarioId: string;
  email: string;
  permissao: PermissaoFuncionario;
  status: StatusAcesso;
  /** Usuário master: não pode ser rebaixado, desativado nem removido. */
  root: boolean;
  /**
   * As áreas que ele vê de fato — já resolvidas pelo servidor.
   *
   * Gestor e dono voltam com a lista inteira mesmo sem nada marcado, e quem
   * nunca foi configurado volta com o conjunto essencial. Por isso a tela pode
   * desenhar as caixinhas direto deste array, sem repetir a regra aqui.
   */
  areas: string[];
};

export type Funcionario = {
  id: string;
  nome: string;
  /**
   * ISO `YYYY-MM-DD`. Opcional — só o nome é obrigatório.
   *
   * Quem cadastra a equipe faz isso de memória, com a loja aberta. Exigir
   * documento nesse momento empurra o cadastro para "depois", e depois não
   * vem: o resultado de um campo obrigatório mal colocado é uma lista vazia.
   */
  dataNascimento: string | null;
  /** Só dígitos. Opcional, pelo mesmo motivo do nascimento. */
  cpf: string | null;
  cargo: string;

  /**
   * Salário mensal. `null` = não informado; `0` = sem salário fixo.
   *
   * Os dois existem e são diferentes: confundi-los faria a folha tratar
   * "não sei" como "não deve nada".
   */
  salario: number | null;

  ganhaComissao: boolean;
  /** Nulo quando não ganha comissão, ou quando ainda não foi definido. */
  comissaoPercentual: number | null;

  /**
   * Esta pessoa registra horário?
   *
   * Numa mesma equipe convivem os dois casos: o caixa e a vendedora batem
   * ponto; o sócio, o comissionado e o entregador autônomo não. Desligado, a
   * aba de ponto some e o registro é recusado pelo servidor — em vez de deixar
   * uma jornada vazia que ninguém vai preencher.
   */
  batePonto: boolean;

  /** Trabalha aqui. Diferente de `acesso.status`, que é sobre o login. */
  ativo: boolean;

  acesso: AcessoFuncionario | null;
  /** Sobrevive a desligar `batePonto` — religar devolve o horário como estava. */
  jornada: JornadaDia[];
};

/**
 * Quem pode receber uma atribuição dentro do sistema.
 *
 * ---------------------------------------------------------------------------
 * Por que o `id` devolvido é o do LOGIN, e não o do funcionário
 * ---------------------------------------------------------------------------
 * As telas que atribuem trabalho — produção e planilhas — gravam esse id em
 * colunas que apontam para `usuarios` (`producao_itens.responsavel_fk`, e a
 * lista de permissões de coluna, comparada com o id da sessão). Devolver o id
 * do funcionário faria a gravação apontar para lugar nenhum: a linha salvaria,
 * o JOIN não acharia ninguém, e o responsável apareceria em branco sem erro
 * nenhum na tela.
 *
 * Por isso a tradução mora aqui, num lugar só. Ela era invisível enquanto
 * funcionário E usuário eram a mesma linha; a partir da migration 046 são dois
 * ids diferentes, e cada tela fazendo a própria conversão erraria em uma delas.
 *
 * ---------------------------------------------------------------------------
 * E quem não tem login fica de fora — de propósito
 * ---------------------------------------------------------------------------
 * Não é limitação da lista: é o que o banco comporta. Atribuir uma tarefa a
 * quem não tem usuário exigiria que `responsavel_fk` apontasse para
 * `funcionarios`, o que é uma mudança de modelo com migração de dados. Até lá,
 * a costureira aparece na equipe e não aparece na escala de produção.
 */
export const podemReceberTarefa = (funcionarios: Funcionario[]): { id: string; nome: string }[] =>
  funcionarios
    .filter((f) => f.ativo && f.acesso?.status === "ATIVO")
    .map((f) => ({ id: f.acesso!.usuarioId, nome: f.nome }));

/* ─────────────────────────────── Jornada ───────────────────────────────── */

/**
 * Um dia da semana em que a pessoa trabalha.
 *
 * Dia SEM linha é folga. Guardar a folga como um horário zerado obrigaria toda
 * leitura a saber que "00:00 às 00:00" quer dizer ausência — e a primeira que
 * esquecesse mostraria alguém escalado à meia-noite.
 */
export type JornadaDia = {
  /** 0 = domingo … 6 = sábado. Mesma numeração do `getDay()` do JavaScript. */
  diaSemana: number;
  /** `HH:MM`. */
  entrada: string;
  saida: string;
  /** Os dois juntos ou nenhum. */
  intervaloInicio?: string | null;
  intervaloFim?: string | null;
};

/** Os nomes dos dias, na numeração do `getDay()`. */
export const DIAS_SEMANA = [
  { valor: 0, curto: "Dom", longo: "Domingo" },
  { valor: 1, curto: "Seg", longo: "Segunda" },
  { valor: 2, curto: "Ter", longo: "Terça" },
  { valor: 3, curto: "Qua", longo: "Quarta" },
  { valor: 4, curto: "Qui", longo: "Quinta" },
  { valor: 5, curto: "Sex", longo: "Sexta" },
  { valor: 6, curto: "Sáb", longo: "Sábado" },
] as const;

/**
 * Quantas horas o dia tem, já descontado o intervalo.
 *
 * Calculado a partir de `HH:MM` como minutos desde a meia-noite — sem `Date`,
 * que arrastaria fuso horário para uma conta que não tem data nenhuma.
 */
export const horasDoDia = (dia: JornadaDia): number => {
  const min = (hora?: string | null) => {
    if (!hora) return null;
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  };

  const entrada = min(dia.entrada);
  const saida = min(dia.saida);

  if (entrada == null || saida == null || saida <= entrada) return 0;

  const inicio = min(dia.intervaloInicio);
  const fim = min(dia.intervaloFim);
  const intervalo = inicio != null && fim != null && fim > inicio ? fim - inicio : 0;

  return (saida - entrada - intervalo) / 60;
};

/** Total semanal — é o número que responde "isso fecha 44 horas?". */
export const horasDaSemana = (jornada: JornadaDia[]): number =>
  jornada.reduce((total, dia) => total + horasDoDia(dia), 0);

/* ──────────────────────────────── Ponto ────────────────────────────────── */

export type TipoPonto = "ENTRADA" | "SAIDA" | "INTERVALO_INICIO" | "INTERVALO_FIM";

export type PontoRegistro = {
  id: string;
  funcionarioId: string;
  tipo: TipoPonto;
  /** ISO completo — o instante, não a hora do dia. */
  momento: string;
  observacao: string | null;
  registradoPorNome: string | null;

  /* ── A prova do ponto batido pelo link ────────────────────────────────── */

  /** `null` no ponto lançado pelo gestor, que não precisa provar nada. */
  fotoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Distância da loja no MOMENTO da batida. */
  distanciaMetros: number | null;
  origem: "PUBLICO" | "GESTOR";
};

/**
 * O rótulo de cada batida, e o que ela faz com o relógio.
 *
 * Um mapa só, e não um `switch` por tela: o ponto aparece na ficha e vai
 * aparecer em relatório, e duas listas de rótulos divergem na primeira vez que
 * alguém acrescenta um tipo.
 */
export const PONTO_LABEL: Record<TipoPonto, { texto: string; tom: "entrada" | "saida" | "neutro" }> = {
  ENTRADA: { texto: "Entrada", tom: "entrada" },
  SAIDA: { texto: "Saída", tom: "saida" },
  INTERVALO_INICIO: { texto: "Saída p/ intervalo", tom: "neutro" },
  INTERVALO_FIM: { texto: "Volta do intervalo", tom: "neutro" },
};

/* ──────────────────────────────── Áreas ────────────────────────────────── */

/**
 * Uma área do sistema, como o servidor a descreve.
 *
 * O catálogo NÃO é copiado aqui: ele vem na resposta de `/funcionarios`, junto
 * da lista. É o mesmo catálogo que decide o acesso de verdade — duas cópias
 * divergem na primeira área nova, e a divergência aparece como uma caixinha
 * que a pessoa marca e que não libera nada.
 */
export type AreaSistema = {
  id: string;
  rotulo: string;
  grupo: string;
};

/* ──────────────────────────────── Equipe ───────────────────────────────── */

export type Equipe = {
  funcionarios: Funcionario[];
  areas: AreaSistema[];
  planoNome: string | null;
  /** `null` = ilimitado. */
  limiteUsuarios: number | null;
  /** Quantas vagas do plano estão ocupadas — conta LOGINS, não pessoas. */
  usados: number;
  podeAdicionar: boolean;
};
