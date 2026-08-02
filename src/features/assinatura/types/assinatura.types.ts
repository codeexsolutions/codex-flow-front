/**
 * Espelha os DTOs de `/v1/assinatura/*`. Valores monetários chegam SEMPRE em
 * centavos inteiros — use `formatCurrencyFromCents` para exibir.
 */

export type CicloPlano = "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

export type StatusAssinatura = "PENDENTE" | "TRIAL" | "ATIVA" | "SUSPENSA" | "CANCELADA";

export type StatusFatura = "PENDENTE" | "AGUARDANDO_CONFIRMACAO" | "PAGA" | "VENCIDA" | "CANCELADA";

export type Plano = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  precoCentavos: number;
  ciclo: CicloPlano;
  limiteUsuarios: number | null;
  limiteClientes: number | null;
  limiteProdutos: number | null;
  limitePedidosMes: number | null;
  recursos: Record<string, unknown>;
  destaque: boolean;
};

export type Fatura = {
  id: string;
  competencia: string;
  descricao: string | null;
  valorCentavos: number;
  vencimento: string;
  status: StatusFatura;
  metodoPagamento: string;
  planoNome: string | null;
  comprovanteEnviadoEm: string | null;
  pagoEm: string | null;
};

export type PixCobranca = {
  chave: string;
  beneficiario: string;
  cidade: string;
  valorCentavos: number;
  copiaECola: string;
  txid: string;
};

export type Suporte = {
  whatsapp: string;
  email: string;
  /** Link wa.me com a mensagem pronta; vazio quando não há WhatsApp configurado. */
  linkWhatsapp: string;
  mensagem: string;
};

export type MinhaAssinatura = {
  empresa: {
    codigoEmpresa: string;
    nomeFantasia: string;
    nomeRepresentante: string;
    cpfCnpj: string;
    urlLogo: string | null;
    ativo: boolean;
  };
  plano: Plano | null;
  status: StatusAssinatura | null;
  proximoVencimento: string | null;
  faturas: Fatura[];
  faturaEmAberto: Fatura | null;
  pix: PixCobranca | null;
  suporte: Suporte;
};

/** Resposta de POST /empresas/cadastrar. */
export type RetornoCadastro = {
  id: string;
  codigoEmpresa: string;
  cpfCnpj: string;
  email: string;
  primeiroAcesso: boolean;
  plano: Plano | null;
  fatura: Fatura | null;
  pix: PixCobranca | null;
};

/** Rótulos e cores por status de fatura — usados no checkout. */
export const FaturaMeta: Record<StatusFatura, { label: string; text: string; bg: string; ring: string; dot: string }> = {
  PAGA: { label: "Paga", text: "text-success", bg: "bg-success/20", ring: "ring-success/25", dot: "bg-success" },
  PENDENTE: { label: "Pendente", text: "text-warning", bg: "bg-warning/20", ring: "ring-warning/25", dot: "bg-warning" },
  AGUARDANDO_CONFIRMACAO: {
    label: "Em confirmação",
    text: "text-accent-soft",
    bg: "bg-accent/20",
    ring: "ring-accent/25",
    dot: "bg-accent-soft",
  },
  VENCIDA: { label: "Vencida", text: "text-danger", bg: "bg-danger/20", ring: "ring-danger/25", dot: "bg-danger" },
  CANCELADA: { label: "Cancelada", text: "text-mist", bg: "bg-fg/[0.06]", ring: "ring-fg/[0.1]", dot: "bg-fg/[0.3]" },
};

export const ehPagavel = (f: Fatura) => f.status === "PENDENTE" || f.status === "VENCIDA";

export const emAberto = (f: Fatura) => ehPagavel(f) || f.status === "AGUARDANDO_CONFIRMACAO";

export const CICLO_LABEL: Record<CicloPlano, string> = {
  MENSAL: "/mês",
  TRIMESTRAL: "/trimestre",
  SEMESTRAL: "/semestre",
  ANUAL: "/ano",
};

/** Nome amigável das flags de `recursos` vindas do banco. */
export const RECURSO_LABEL: Record<string, string> = {
  financeiro: "Módulo financeiro",
  relatorios: "Relatórios gerenciais",
  suporteWhatsapp: "Suporte por WhatsApp",
  suportePrioritario: "Suporte prioritário",
};
