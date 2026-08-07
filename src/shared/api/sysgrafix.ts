import axios, { type AxiosRequestConfig } from "axios";

import { API_URL } from "@/shared/api/apiUrl";

const sysgrafix = axios.create({
  baseURL: API_URL,
  // O JWT vive num cookie httpOnly: o navegador o envia sozinho em toda
  // requisição. Sem `withCredentials` o cookie NÃO acompanha em chamadas
  // cross-origin (site na Vercel, API na Railway) — o login viria vazio.
  withCredentials: true,
});

/*
 * Renovação de sessão.
 *
 * O access token dura 12h; antes disso existia só ele, então quem passava do
 * expediente tomava 401 e o app quebrava calado. Agora o 401 dispara uma
 * renovação pelo cookie de refresh e a requisição original é repetida — a troca
 * é invisível para quem está usando.
 *
 * A store de sessão registra os callbacks aqui em vez de ser importada: este
 * módulo é importado por todos os serviços, e importar a store criaria ciclo
 * (store → service → sysgrafix → store).
 */
type GanchosDeSessao = {
  aoRenovar: (usuario: unknown) => void;
  aoExpirar: () => void;
};

let ganchos: GanchosDeSessao | null = null;

export function registrarGanchosDeSessao(g: GanchosDeSessao) {
  ganchos = g;
}

/*
 * Uma renovação por vez. Sem isto, uma tela que dispara seis requisições ao
 * abrir mandaria seis refreshes concorrentes — e como cada um reemite o cookie,
 * os últimos chegariam com o refresh que os primeiros já rotacionaram.
 */
let renovacaoEmCurso: Promise<unknown> | null = null;

function renovarSessao() {
  if (!renovacaoEmCurso) {
    renovacaoEmCurso = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const usuario = res.data?.data?.[0];

        if (!usuario) throw new Error("Sessão expirada.");

        ganchos?.aoRenovar(usuario);

        return usuario;
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
        ganchos?.aoExpirar();
      }
    }

    return Promise.reject(error);
  },
);

export default sysgrafix;
