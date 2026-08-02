import { create } from "zustand";

import AuthService from "@/features/auth/services/auth.service";
import AuthFormInputs from "@/features/auth/schema/auth.schema";
import useAuthProps from "@/features/auth/types/auth.types";
import { decodeToken, isTokenExpired } from "@/shared/utils/decodeToken";
import { alert } from "@/shared/ui/Alert"; // ajuste o caminho se necessário
import useEnterprise from "@/features/empresa/store/enterprise.store";
import { toCodigoEmpresaBase } from "@/shared/domain/empresa";
import useTransicao from "@/shared/session/transicao.store";
import { resetarLojas } from "@/shared/session/resetarLojas";

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

    // Zera clientes, produtos, vendas, financeiro e empresa: sem isso os dados
    // de quem saiu ficariam visíveis para quem entrar em seguida.
    resetarLojas();

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

      const usuario = getUserFromToken(auth.accessToken);

      /*
       * O token é gravado ANTES de a sessão valer para que a busca da empresa
       * já saia autorizada. É o que permite carregar os dados EM PARALELO com
       * a animação: quando ela termina, o sistema entra pronto — sem a tela de
       * "Carregando" que aparecia no meio e cortava o efeito.
       */
      tokenStorage.save(auth.accessToken, auth.refreshToken);

      const carregarEmpresa = usuario.codigoEmpresa
        ? useEnterprise.getState().fetchEnterprise(toCodigoEmpresaBase(usuario.codigoEmpresa))
        : Promise.resolve();

      await Promise.all([aoAutenticar ? aoAutenticar(usuario.nome ?? "") : Promise.resolve(), carregarEmpresa]);

      // Só agora a sessão vale — e o roteador troca de tela com tudo carregado.
      set({ user: usuario, isLogged: true, loading: false });

      // Sem alerta quando a tela já deu as boas-vindas com a animação.
      if (!aoAutenticar) await alert.success("Login realizado", `Bem-vindo, ${usuario.nome}!`);
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

  async logout() {
    // A animação roda ANTES de a sessão cair; o overlay vive acima do roteador
    // (ver `CamadaTransicao`), então sobrevive ao desmonte da tela atual.
    await useTransicao.getState().tocar("saida", get().user?.nome ?? "");

    get().clearAuth();
  },
}));

export default useAuth;
