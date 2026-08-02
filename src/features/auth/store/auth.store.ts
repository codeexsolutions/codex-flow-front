import { create } from "zustand";

import AuthService from "@/features/auth/services/auth.service";
import AuthFormInputs from "@/features/auth/schema/auth.schema";
import useAuthProps from "@/features/auth/types/auth.types";
import { decodeToken, isTokenExpired } from "@/shared/utils/decodeToken";
import { alert } from "@/shared/ui/Alert"; // ajuste o caminho se necessário
import useEnterprise from "@/features/empresa/store/enterprise.store";
import { toCodigoEmpresaBase } from "@/shared/domain/empresa";

const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

const tokenStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  save(accessToken: string, refreshToken?: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);

    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const getUserFromToken = (token: string) => {
  const payload = decodeToken(token);

  return {
    id: payload.id,
    nome: payload.nome,
    email: payload.email,
    cargo: payload.cargo,
    permissao: payload.permissao,
    root: Boolean(payload.root),
    ativo: payload.ativo,
    codigoEmpresa: payload.codigoEmpresa,
  };
};

type AuthStore = useAuthProps & {
  loading: boolean;
  initialize: () => void;
  setAuth: (accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
};

const useAuth = create<AuthStore>((set, get) => ({
  user: null,

  isLogged: false,

  loading: true,

  setAuth(accessToken, refreshToken) {
    tokenStorage.save(accessToken, refreshToken);

    set({
      user: getUserFromToken(accessToken),
      isLogged: true,
      loading: false,
    });
  },

  clearAuth() {
    tokenStorage.clear();

    useEnterprise.getState().clearEnterprise();

    set({
      user: null,
      isLogged: false,
      loading: false,
    });
  },

  async login(data: AuthFormInputs, aoAutenticar) {
    try {
      const response = await AuthService.login(data);

      const auth = response?.data?.data?.[0];

      if (!auth?.accessToken) {
        throw new Error("Resposta inválida da API.");
      }

      // Deixa a tela reagir antes de a sessão valer (ver `aoAutenticar`).
      if (aoAutenticar) await aoAutenticar(decodeToken(auth.accessToken).nome ?? "");

      // Salva o token e cria o usuário
      get().setAuth(auth.accessToken, auth.refreshToken);

      // Busca a empresa do usuário logado
      const user = get().user;

      if (user?.codigoEmpresa) {
        await useEnterprise.getState().fetchEnterprise(toCodigoEmpresaBase(user.codigoEmpresa));
      }

      // Sem alerta quando a tela já deu as boas-vindas com a animação.
      if (!aoAutenticar) await alert.success("Login realizado", `Bem-vindo, ${user?.nome}!`);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };

      await alert.error("Erro ao entrar", err?.response?.data?.message ?? err?.message ?? "Usuário ou senha inválidos.");

      throw error;
    }
  },

  initialize: async () => {
    const token = tokenStorage.getAccessToken();

    if (!token) {
      set({
        loading: false,
      });
      return;
    }

    try {
      if (isTokenExpired(token)) {
        throw new Error("Token expirado");
      }

      const user = getUserFromToken(token);

      set({
        user,
        isLogged: true,
        loading: true,
      });

      if (user.codigoEmpresa) {
        await useEnterprise.getState().fetchEnterprise(toCodigoEmpresaBase(user.codigoEmpresa));
      }

      set({
        loading: false,
      });
    } catch {
      get().clearAuth();

      alert.warning("Sessão expirada", "Sua sessão expirou. Faça login novamente.");
    }
  },

  logout() {
    get().clearAuth();

    alert.info("Logout realizado", "Você saiu do sistema com sucesso.");
  },
}));

export default useAuth;
