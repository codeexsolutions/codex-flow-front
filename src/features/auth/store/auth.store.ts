import { create } from "zustand";

import AuthService from "../services/auth.service";
import AuthFormInputs from "../pages/Auth/components/Schema/auth.schema";
import useAuthProps from "./types/auth.types";
import { decodeToken, isTokenExpired } from "../utils/decodeToken";
import { alert } from "../components/Alert/Alert"; // ajuste o caminho se necessário
import useEnterprise from "./enterprise.store";

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

  async login(data: AuthFormInputs) {
    try {
      const response = await AuthService.login(data);

      const auth = response?.data?.data?.[0];

      if (!auth?.accessToken) {
        throw new Error("Resposta inválida da API.");
      }

      // Salva o token e cria o usuário
      get().setAuth(auth.accessToken, auth.refreshToken);

      // Busca a empresa do usuário logado
      const user = get().user;

      if (user?.codigoEmpresa) {
        await useEnterprise.getState().fetchEnterprise(user.codigoEmpresa.slice(0, -2));
      }

      await alert.success("Login realizado", `Bem-vindo, ${user?.nome}!`);
    } catch (error: any) {
      await alert.error(
        "Erro ao entrar",
        error?.response?.data?.message ?? error?.message ?? "Usuário ou senha inválidos.",
      );

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
        await useEnterprise.getState().fetchEnterprise(user.codigoEmpresa.slice(0, -2));
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
