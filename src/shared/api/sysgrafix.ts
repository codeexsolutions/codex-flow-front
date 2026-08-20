import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { API_URL } from "@/shared/api/apiUrl";
import { lerRefreshToken, lerToken, limparSessao, salvarSessao } from "@/shared/api/sessao";
import { comecou, terminou, tituloPadrao } from "@/shared/api/carregamento";

declare module "axios" {
  export interface AxiosRequestConfig {
    /**
     * O aviso de "estou salvando" desta requisição.
     *
     *   • ausente — o padrão: gravação mostra o aviso genérico, leitura não
     *     mostra nada;
     *   • `string` — o aviso aparece com esta frase ("Cadastrando produto…");
     *   • `false` — não mostra. Ver `SEM_CARREGAMENTO` sobre quando isso é o
     *     certo a fazer.
     */
    carregamento?: boolean | string;
  }
}

const sysgrafix = axios.create({
  baseURL: API_URL,
});

/** Leitura não acende o aviso: a lista já tem o esqueleto dela. */
const METODOS_QUE_GRAVAM = ["post", "put", "patch", "delete"];

/**
 * Rotas que GRAVAM pelo método, mas não são gravação para quem usa.
 *
 * Todas são POST por precisarem mandar corpo, não por mudarem algo — e uma
 * caixa bloqueando a tela em cima delas seria pior do que não avisar nada:
 *
 *   • `disponibilidade` é a pergunta que o PDV faz ANTES de fechar a nota,
 *     enquanto a pessoa ainda monta o carrinho;
 *   • `calcular-frete` é uma cotação, e a tela já mostra o próprio "…";
 *   • `upload` tem barra de progresso dentro do campo, e um modal por cima
 *     roubaria o foco do formulário que está sendo preenchido;
 *   • `mover` é o arrastar do quadro de produção — um modal por cartão
 *     arrastado tornaria o quadro inutilizável;
 *   • `quem` é a consulta do CPF antes de bater o ponto.
 */
const SEM_CARREGAMENTO = [
  "/estoque/disponibilidade",
  "/correios/calcular-frete",
  "/upload/",
  "/mover",
  "/quem",
];

/** Marca posta no config para o aviso ser contado uma vez por requisição. */
type ConfigInterna = InternalAxiosRequestConfig & { _avisando?: boolean };

const deveAvisar = (config: AxiosRequestConfig): boolean => {
  if (config.carregamento === false) return false;
  if (typeof config.carregamento === "string") return true;

  if (!METODOS_QUE_GRAVAM.includes((config.method ?? "get").toLowerCase())) return false;

  const url = config.url ?? "";

  return !SEM_CARREGAMENTO.some((rota) => url.includes(rota));
};

sysgrafix.interceptors.request.use((config) => {
  const token = lerToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  /*
   * A marca `_avisando` é o que impede a contagem dobrada.
   *
   * Uma requisição que toma 401 é REPETIDA depois do refresh, e a repetição
   * passa por aqui de novo. Sem a marca, o aviso seria contado duas vezes e
   * descontado uma — e ficaria aceso para sempre, na tela, sem botão.
   */
  const interna = config as ConfigInterna;

  if (!interna._avisando && deveAvisar(config)) {
    interna._avisando = true;
    comecou(typeof config.carregamento === "string" ? config.carregamento : tituloPadrao(config.method ?? "post"));
  }

  return config;
});

/** Apaga o aviso desta requisição, uma vez só. */
const encerrarAviso = (config?: ConfigInterna) => {
  if (!config?._avisando) return;

  config._avisando = false;
  terminou();
};

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
  (response) => {
    encerrarAviso(response.config as ConfigInterna);

    return response;
  },
  async (error) => {
    const config = error.config as (ConfigInterna & AxiosRequestConfig & { _jaRenovou?: boolean }) | undefined;
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

        /* O aviso NÃO é encerrado aqui: `_avisando` continua marcado, a
           repetição não o conta de novo (ver o interceptor de requisição) e
           quem apaga é o desfecho dela. Encerrar antes faria o aviso sumir e
           voltar no meio de um salvamento que nunca parou. */
        return sysgrafix(config);
      } catch {
        // Refresh também morreu: a sessão acabou de verdade.
        limparSessao();
        ganchos?.aoExpirar();
      }
    }

    /* Falhou de vez — e o aviso sai ANTES do erro subir, para o alerta de
       falha da tela entrar numa tela limpa em vez de por cima da caixa. */
    encerrarAviso(config);

    return Promise.reject(error);
  },
);

export default sysgrafix;
