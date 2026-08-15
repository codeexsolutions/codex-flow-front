import axios, { type AxiosRequestConfig } from "axios";

import { API_URL } from "@/shared/api/apiUrl";
import { lerRefreshToken, lerToken, limparSessao, salvarSessao } from "@/shared/api/sessao";

const sysgrafix = axios.create({
  baseURL: API_URL,
});


sysgrafix.interceptors.request.use((config) => {
  const token = lerToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

type GanchosDeSessao = {
  aoRenovar: (usuario: unknown) => void;
  aoExpirar: () => void;
};

let ganchos: GanchosDeSessao | null = null;

export function registrarGanchosDeSessao(g: GanchosDeSessao) {
  ganchos = g;
}

let renovacaoEmCurso: Promise<unknown> | null = null;

function renovarSessao() {
  if (!renovacaoEmCurso) {
    const refreshToken = lerRefreshToken();

    if (!refreshToken) return Promise.reject(new Error("Sessão expirada."));

    renovacaoEmCurso = axios
      .post(`${API_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
        const sessao = res.data?.data?.[0];

        if (!sessao?.accessToken) throw new Error("Sessão expirada.");

        // O par novo entra antes do aviso à store: a requisição repetida logo
        // abaixo já lê o token atualizado do `localStorage`.
        salvarSessao(sessao.accessToken, sessao.refreshToken ?? undefined);

        ganchos?.aoRenovar(sessao);

        return sessao;
      })
      .finally(() => {
        renovacaoEmCurso = null;
      });
  }

  return renovacaoEmCurso;
}

/** Rotas onde 401 é a resposta esperada — renovar aqui não faz sentido. */
const SEM_RENOVACAO = ["/auth/refresh", "/auth/logout", "/login/token"];

sysgrafix.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (AxiosRequestConfig & { _jaRenovou?: boolean }) | undefined;
    const url = config?.url ?? "";

    const podeRenovar =
      error.response?.status === 401 &&
      config &&
      !config._jaRenovou &&
      !SEM_RENOVACAO.some((rota) => url.includes(rota));

    if (podeRenovar) {
      // Marca ANTES de tentar: se a requisição repetida tomar 401 de novo, ela
      // não entra aqui outra vez e o erro sobe — em vez de renovar em laço.
      config._jaRenovou = true;

      try {
        await renovarSessao();

        return sysgrafix(config);
      } catch {
        // Refresh também morreu: a sessão acabou de verdade.
        limparSessao();
        ganchos?.aoExpirar();
      }
    }

    return Promise.reject(error);
  },
);

export default sysgrafix;
