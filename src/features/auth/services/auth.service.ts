import sysgrafix from "@/shared/api/sysgrafix";

/** Usuário da sessão, montado pela API — o token é httpOnly e o JS não o lê. */
export type UsuarioSessao = {
  id: string;
  nome?: string | null;
  email: string;
  cargo: string;
  permissao?: string | null;
  root?: boolean;
  codigoEmpresa: string;
  ativo: boolean;
};

/** A API responde sempre { statusCode, message, data: [...] }. */
type RetornoPadrao<T> = { statusCode: number; message: string; data: T[] };

const AuthService = {
  /**
   * Login. O servidor seta os cookies httpOnly (`codex_token`/`codex_refresh`);
   * no corpo volta só o usuário — o front não pode mais decodificar o token.
   */
  login: async (data: object | undefined): Promise<UsuarioSessao> => {
    const res = await sysgrafix.post<RetornoPadrao<UsuarioSessao>>("/login/token", data || {});

    const usuario = res.data?.data?.[0];

    if (!usuario) throw new Error(res.data?.message || "Resposta inválida da API.");

    return usuario;
  },

  /** Quem sou eu — bootstrap da sessão (o cookie diz quem é). */
  me: async (): Promise<UsuarioSessao> => {
    const res = await sysgrafix.get<RetornoPadrao<UsuarioSessao>>("/usuarios/me");
    const usuario = res.data?.data?.[0];

    if (!usuario) throw new Error(res.data?.message || "Sessão inválida.");

    return usuario;
  },

  /** Fim da sessão: a API apaga os cookies httpOnly. */
  logout: async (): Promise<void> => {
    await sysgrafix.post("/auth/logout");
  },
};

export default AuthService;
