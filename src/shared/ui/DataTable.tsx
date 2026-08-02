import type { CSSProperties, ReactNode } from "react";
import { Plus } from "lucide-react";

export type Coluna<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
};

const MIN_TABLE_WIDTH = 720;

export const TabelaCard = ({
  title,
  icon,
  count,
  countLabel,
  onAdd,
  addLabel = "Adicionar",
  filters,
  children,
  footer,
  minWidth = MIN_TABLE_WIDTH,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  countLabel?: string;
  onAdd?: () => void;
  addLabel?: string;
  filters?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  minWidth?: number;
}) => (
  <section className="card glass-sheen flex min-h-[220px] min-w-0 flex-1 flex-col overflow-hidden">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-fg/[0.07] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] text-ink">{title}</h2>
          {count !== undefined && (
            <p className="text-[11px] text-faint">
              {count} {countLabel ?? (count === 1 ? "registro" : "registros")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        {filters}
        {onAdd && (
          <button type="button" onClick={onAdd} className="focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-accent-soft to-accent px-3 py-2 text-[12.5px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]">
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </button>
        )}
      </div>
    </header>

    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-0 sm:[min-width:var(--tabela-min)]" style={{ "--tabela-min": `${minWidth}px` } as CSSProperties}>
        {children}
      </div>
    </div>

    {footer && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-fg/[0.06] px-4 py-2.5 text-[12px] text-faint">{footer}</div>}
  </section>
);

const alignCls = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function TabelaHead<T>({ colunas, cols }: { colunas: Coluna<T>[]; cols: string }) {
  return (
    <div className={`sticky top-0 z-10 hidden ${cols} gap-2 border-b border-fg/[0.07] bg-surface/80 px-4 py-2 text-[10.5px] uppercase tracking-wider text-faint backdrop-blur sm:grid`}>
      {colunas.map((c) => (
        <span key={c.id} className={alignCls[c.align ?? "left"]}>
          {c.header}
        </span>
      ))}
    </div>
  );
}

export function TabelaRow<T>({ colunas, cols, row, onClick }: { colunas: Coluna<T>[]; cols: string; row: T; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  const [principal, ...demais] = colunas;
  const visiveis = demais.filter((c) => Boolean(c.header));

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`group relative block w-full border-b border-fg/[0.04] text-left text-[12.5px] text-ink transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-accent before:opacity-0 before:transition-opacity ${onClick ? "cursor-pointer hover:bg-fg/[0.035] hover:before:opacity-100" : ""}`}
    >
      <span className={`hidden ${cols} items-center gap-2 px-4 py-2.5 sm:grid`}>
        {colunas.map((c) => (
          <span key={c.id} className={`min-w-0 truncate ${alignCls[c.align ?? "left"]}`}>
            {c.cell(row)}
          </span>
        ))}
      </span>

      {/* Cartão — celular */}
      <span className="flex flex-col gap-1.5 px-4 py-3 sm:hidden">
        {principal && <span className="min-w-0 truncate text-[13px] text-ink">{principal.cell(row)}</span>}

        {visiveis.map((c) => (
          <span key={c.id} className="flex items-baseline justify-between gap-3">
            <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-faint">{c.header}</span>
            <span className="min-w-0 truncate text-right text-[12.5px]">{c.cell(row)}</span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

export const TabelaVazia = ({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) => (
  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2.5 px-6 py-10 text-center">
    {icon && <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-fg/[0.07] bg-fg/[0.03] text-faint">{icon}</span>}
    <p className="text-[13px] text-mist">{title}</p>
    {description && <p className="max-w-[280px] text-[11.5px] leading-relaxed text-faint">{description}</p>}
    {action}
  </div>
);
