import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./primitives";

/* ═══ Tabs ═══ */
export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string; icon?: ReactNode }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="flex overflow-x-auto">
      {tabs.map(({ id, label, icon }) => (
        <button key={id} onClick={() => onChange(id)} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${active === id ? "border-accent text-accent-soft" : "border-transparent text-mist hover:text-ink"}`}>
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

/* ═══ FilterPills ═══ */
export function FilterPills<T extends string>({ options, active, onChange }: { options: readonly T[]; active: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((s) => (
        <button key={s} onClick={() => onChange(s)} className={`rounded-lg px-3.5 py-2 text-xs capitalize transition-colors ${active === s ? "bg-accent text-white" : "border bg-fg/[0.04] text-mist hover:bg-fg/[0.08]"}`}>
          {s}
        </button>
      ))}
    </div>
  );
}

/* ═══ Pagination ═══ */
export function Pagination({ page, totalPages, onChange, summary }: { page: number; totalPages: number; onChange: (p: number) => void; summary?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {summary && <span className="text-xs text-faint">{summary}</span>}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={13} /> Anterior
        </Button>
        <span className="nums px-2 text-xs text-mist">
          {page} / {totalPages}
        </span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Próxima <ChevronRight size={13} />
        </Button>
      </div>
    </div>
  );
}
