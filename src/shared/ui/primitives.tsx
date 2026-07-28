import type { ReactNode, ButtonHTMLAttributes } from "react";
import { getInitials } from "@/shared/utils/format";

export type Tone = "accent" | "success" | "warning" | "danger" | "neutral";

export const toneText: Record<Tone, string> = {
  accent: "text-accent-soft",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-mist",
};

export const toneChip: Record<Tone, string> = {
  accent: "border-accent/30 bg-accent/10 text-accent-soft",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  neutral: "border-fg/10 bg-fg/[0.06] text-mist",
};

/* ═══ Button ═══ */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", icon, children, className = "", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-strong",
    ghost: "border border-fg/10 bg-fg/[0.04] text-mist hover:bg-fg/[0.08] hover:text-ink",
    success: "border border-success/30 bg-success/10 text-success hover:bg-success/20",
    warning: "border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20",
    danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
  };
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon}
      {children}
    </button>
  );
}

/* ═══ Badge ═══ */
export function Badge({ tone = "neutral", icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${toneChip[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

/* ═══ Avatar (iniciais) ═══ */
export function Avatar({ name, size = "md" }: { name?: string; size?: "sm" | "md" }) {
  const sizes = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-xs" };
  return <div className={`flex flex-shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/15 text-accent-soft ${sizes[size]}`}>{getInitials(name)}</div>;
}
