import { PEDIDO_STATUS } from "../domain/pedido";
import { eStatus } from "../domain/cliente";

/**
 * Badges de status de domínio. Antes existiam 4 implementações divergentes,
 * inclusive com vocabulário conflitante para o mesmo estado ("Pago"/"Paga",
 *"Pendente"/"Aberta"). Aqui o vocabulário é único.
 */

const base = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]";
const dot = "h-1.5 w-1.5 rounded-full";

const PEDIDO_LOOK: Record<string, { label: string; wrap: string; dot: string }> = {
  [PEDIDO_STATUS.FECHADO]: {
    label: "Pago",
    wrap: "border-success/40 bg-success/20 text-success",
    dot: "bg-success",
  },
  [PEDIDO_STATUS.ABERTO]: {
    label: "Em aberto",
    wrap: "border-warning/50 bg-warning/20 text-warning",
    dot: "bg-warning",
  },
  [PEDIDO_STATUS.PENDENTE]: {
    label: "Pendente",
    wrap: "border-warning/50 bg-warning/20 text-warning",
    dot: "bg-warning",
  },
  [PEDIDO_STATUS.CANCELADO]: {
    label: "Cancelado",
    wrap: "border-fg/[0.08] bg-fg/[0.04] text-mist",
    dot: "bg-faint",
  },
};

export function PedidoStatusBadge({ status }: { status: string }) {
  const look = PEDIDO_LOOK[status];

  if (!look) {
    return (
      <span className={`${base} border-fg/[0.08] bg-fg/[0.04] text-mist`}>
        <span className={`${dot} bg-faint`} />
        {status || "—"}
      </span>
    );
  }

  return (
    <span className={`${base} ${look.wrap}`}>
      <span className={`${dot} ${look.dot}`} />
      {look.label}
    </span>
  );
}

export function ClienteStatusBadge({ status }: { status: eStatus }) {
  return status === eStatus.ATIVO ? (
    <span className={`${base} border-success/40 bg-success/20 text-success`}>
      <span className={`${dot} bg-success`} /> Ativo
    </span>
  ) : (
    <span className={`${base} border-fg/[0.08] bg-fg/[0.04] text-mist`}>
      <span className={`${dot} bg-faint`} /> Inativo
    </span>
  );
}
