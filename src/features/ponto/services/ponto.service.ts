import sysgrafix from "@/shared/api/sysgrafix";

/**
 * O ponto batido por link, sem login.
 *
 * As duas primeiras chamadas passam por `/publico` e NÃO levam sessão — quem
 * abre o link não tem conta. As de configuração são do gestor e passam pela
 * rota autenticada de funcionários.
 */

/** O que a página mostra antes de alguém se identificar. */
export type PontoLink = {
  empresaNome: string;
  logoUrl: string | null;
  exigeFoto: boolean;
  /** `false` quando a empresa não marcou onde a loja fica. */
  cercaConfigurada: boolean;
  abertaAgora: boolean;
};

export type PontoBatido = {
  funcionarioNome: string;
  tipo: "ENTRADA" | "SAIDA" | "INTERVALO_INICIO" | "INTERVALO_FIM";
  momento: string;
  /** Qual batida do dia foi esta, e de quantas. */
  indice: number;
  total: number;
};

/** Um dia em que a LOJA abre. Dia sem linha = fechado. */
export type HorarioDia = {
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number;
  abre: string;
  fecha: string;
};

export type ConfigPonto = {
  /** Só leitura: nasce e se renova no servidor. */
  token?: string;
  ativo: boolean;
  pontosPorDia: number;
  latitude: number | null;
  longitude: number | null;
  raioMetros: number;
  exigeFoto: boolean;
  horarios: HorarioDia[];
};

type RetornoPadrao<T> = { statusCode: number; message: string; data: T[] };

const erro = (e: unknown, padrao: string): Error => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return new Error(err?.response?.data?.message ?? err?.message ?? padrao);
};

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

const PontoService = {

  /* ── Público: quem bate não tem conta ─────────────────────────────────── */

  abrir: (token: string): Promise<PontoLink> =>
    primeiro(sysgrafix.get<RetornoPadrao<PontoLink>>(`/publico/ponto/${token}`), "Este link não está mais disponível."),

  /**
   * Registra a batida.
   *
   * O instante NÃO vai no corpo: quem carimba é o servidor. Mandar a hora do
   * aparelho seria deixar a pessoa escolher o próprio horário de entrada —
   * relógio de celular se muda em dois toques.
   */
  bater: (token: string, dados: { cpf: string; latitude: number; longitude: number; foto?: string | null }): Promise<PontoBatido> =>
    primeiro(sysgrafix.post<RetornoPadrao<PontoBatido>>(`/publico/ponto/${token}`, dados), "Não foi possível registrar o ponto."),

  /* ── Gestor: a configuração ───────────────────────────────────────────── */

  config: (): Promise<ConfigPonto> =>
    primeiro(sysgrafix.get<RetornoPadrao<ConfigPonto>>("/funcionarios/ponto-config"), "Não foi possível carregar a configuração."),

  salvarConfig: (config: ConfigPonto): Promise<ConfigPonto> =>
    primeiro(sysgrafix.put<RetornoPadrao<ConfigPonto>>("/funcionarios/ponto-config", config), "Não foi possível salvar a configuração."),

  /** Gera um link novo. O antigo para de funcionar na mesma hora. */
  renovarLink: (): Promise<ConfigPonto> =>
    primeiro(sysgrafix.post<RetornoPadrao<ConfigPonto>>("/funcionarios/ponto-config/renovar", {}), "Não foi possível gerar um link novo."),
};

export default PontoService;
