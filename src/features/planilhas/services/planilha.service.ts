import sysgrafix from "@/shared/api/sysgrafix";

export type Periodicidade = "DIARIA" | "SEMANAL" | "MENSAL";

export type TipoColuna =
  | "TEXTO" | "TEXTO_LONGO" | "NUMERO" | "MOEDA" | "DATA"
  | "SELECAO" | "MULTIPLA" | "CHECKBOX" | "IMAGEM" | "USUARIO" | "CLIENTE";

export type Modelo = {
  id: string;
  nome: string;
  descricao: string | null;
  periodicidade: Periodicidade;
  coluna_prazo_fk: string | null;
  total_colunas: number;
  total_registros: number;
};

export type Opcao = { valor: string; cor?: string };

export type Coluna = {
  id: string;
  nome: string;
  tipo: TipoColuna;
  opcoes: Opcao[];
  ordem: number;
  largura: number | null;
  obrigatorio: boolean;
  valor_padrao: string | null;
  /** Ids que podem editar. Vazio = todos. */
  permissoes: string[];
};

export type Registro = {
  id: string;
  valores: Record<string, unknown>;
  competencia: string;
  ordem: number;
};

export type Pagina = { periodicidade: Periodicidade; de: string; ate: string; registros: Registro[] };

const lista = <T>(r: { data?: { data?: T[] } }): T[] => r.data?.data ?? [];
const um = <T>(r: { data?: { data?: T[] } }): T => (r.data?.data ?? [])[0] as T;

const PlanilhaService = {
  async modelos() {
    return lista<Modelo>(await sysgrafix.get("/planilhas"));
  },

  async criarModelo(dados: { nome: string; descricao?: string; periodicidade: Periodicidade }) {
    return um<string>(await sysgrafix.post("/planilhas", dados));
  },

  async alterarModelo(id: string, dados: Record<string, unknown>) {
    await sysgrafix.patch(`/planilhas/${id}`, dados);
  },

  async removerModelo(id: string) {
    await sysgrafix.delete(`/planilhas/${id}`);
  },

  async colunas(modeloId: string) {
    return lista<Coluna>(await sysgrafix.get(`/planilhas/${modeloId}/colunas`));
  },

  async criarColuna(modeloId: string, dados: { nome: string; tipo: TipoColuna; opcoes?: Opcao[]; valorPadrao?: string | null; permissoes?: string[] }) {
    return um<string>(await sysgrafix.post(`/planilhas/${modeloId}/colunas`, dados));
  },

  async alterarColuna(colunaId: string, dados: Record<string, unknown>) {
    await sysgrafix.patch(`/planilhas/colunas/${colunaId}`, dados);
  },

  async removerColuna(colunaId: string) {
    await sysgrafix.delete(`/planilhas/colunas/${colunaId}`);
  },

  /** Cria um bloco de linhas em branco de uma vez. */
  async criarLote(modeloId: string, quantidade: number, competencia: string) {
    await sysgrafix.post(`/planilhas/${modeloId}/registros/lote`, { quantidade, competencia });
  },

  async registros(modeloId: string, data?: string) {
    return um<Pagina>(await sysgrafix.get(`/planilhas/${modeloId}/registros`, { params: data ? { data } : undefined }));
  },

  async criarRegistro(modeloId: string, dados: { valores?: Record<string, unknown>; competencia?: string }) {
    return um<string>(await sysgrafix.post(`/planilhas/${modeloId}/registros`, dados));
  },

  async alterarRegistro(registroId: string, dados: Record<string, unknown>) {
    await sysgrafix.patch(`/planilhas/registros/${registroId}`, dados);
  },

  async excluirRegistro(registroId: string) {
    await sysgrafix.delete(`/planilhas/registros/${registroId}`);
  },
};

export default PlanilhaService;
