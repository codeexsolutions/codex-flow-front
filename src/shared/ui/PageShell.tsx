import type { ReactNode } from "react";

/**
 * Espaçamentos padrão das telas.
 *
 * Antes cada página escolhia o seu (p-5, px-5 py-5, px-8 py-6…), o que comia
 * altura útil — especialmente em telas de tabela, onde cada pixel vira linha
 * visível. Aqui o respiro é único e mais enxuto.
 */
export const PAGE_PAD = "px-4 py-3 lg:px-6 lg:py-4";
export const PAGE_GAP = "gap-3";

/** Corpo rolável de uma página, já com o padding padrão. */
export const PageBody = ({ children, className = "", scroll = false }: { children: ReactNode; className?: string; scroll?: boolean }) => <main className={`relative flex min-h-0 flex-1 flex-col ${PAGE_GAP} ${PAGE_PAD} ${scroll ? "overflow-y-auto" : "overflow-hidden"} ${className}`}>{children}</main>;

/**
 * Barra de ações da tela. É aqui que ficam"Novo cliente","Exportar" etc. —
 * dentro do outlet, junto do conteúdo que elas afetam, e não no cabeçalho.
 */
export const PageToolbar = ({ children, left, className = "" }: { children?: ReactNode; left?: ReactNode; className?: string }) => (
  <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 ${className}`}>
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{left}</div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

/** Botão de ação primário — o"criar" de cada tela. */
export const PrimaryAction = ({ icon, children, onClick, disabled }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-accent-soft to-accent px-4 py-2 text-[13px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
  >
    {icon}
    {children}
  </button>
);

/** Botão de ação secundário. */
export const GhostAction = ({ icon, children, onClick, disabled, title }: { icon?: ReactNode; children?: ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) => (
  <button type="button" onClick={onClick} disabled={disabled} title={title} className="glass-subtle focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] text-mist transition-all hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
    {icon}
    {children}
  </button>
);
