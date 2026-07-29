export type FaturaStatus = "PAGA" | "PENDENTE" | "VENCIDA" | "CANCELADA";

export type FaturaType = {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: FaturaStatus;
  pedidoId?: string;
};

export const FaturaMeta: Record<FaturaStatus, { label: string; text: string; bg: string; ring: string; dot: string }> = {
  PAGA: {
    label: "Paga",
    text: "text-success",
    bg: "bg-success/20",
    ring: "ring-success/25",
    dot: "bg-success",
  },
  PENDENTE: {
    label: "Pendente",
    text: "text-warning",
    bg: "bg-warning/20",
    ring: "ring-warning/25",
    dot: "bg-warning",
  },
  VENCIDA: {
    label: "Vencida",
    text: "text-danger",
    bg: "bg-danger/20",
    ring: "ring-danger/25",
    dot: "bg-danger",
  },
  CANCELADA: {
    label: "Cancelada",
    text: "text-mist",
    bg: "bg-fg/[0.06]",
    ring: "ring-fg/[0.1]",
    dot: "bg-fg/[0.3]",
  },
};

export const ehPagavel = (f: FaturaType) => f.status !== "PAGA" && f.status !== "CANCELADA";
