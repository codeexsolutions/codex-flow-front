import type { ReactNode } from "react";
import { toneText, type Tone } from "./primitives";

/* ═══ KpiCard ═══ */
export function KpiCard({ icon, label, value, hint, tone = "accent" }: { icon: ReactNode; label: string; value: string | number; hint?: string; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className={toneText[tone]}>{icon}</span>
        <span className="text-xs text-mist">{label}</span>
      </div>
      <p className={`nums text-xl ${toneText[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
}

/* ═══ SectionCard ═══ */
export function SectionCard({ title, icon, actions, children, className = "", bodyClassName = "" }: { title?: string; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <p className="flex items-center gap-2 text-sm">
            {icon}
            {title}
          </p>
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/* ═══ InfoRow ═══ */
export function InfoRow({ icon, label, value }: { icon?: ReactNode; label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-[13px] text-mist">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] text-ink">{value ?? "—"}</span>
    </div>
  );
}

/* ═══ EmptyState ═══ */
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-fg/[0.04] text-accent-soft">{icon}</div>
      <div>
        <p className="text-sm">{title}</p>
        {description && <p className="mt-1 text-sm text-mist">{description}</p>}
      </div>
      {action}
    </div>
  );
}
