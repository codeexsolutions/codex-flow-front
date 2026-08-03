import { memo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent?: string;
  size?: ModalSize;
  maxWidth?: string;
  children: ReactNode;
};

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-[1200px]",
};

const HEIGHT_CLASS: Record<ModalSize, string> = {
  sm: "max-h-[85dvh]",
  md: "max-h-[85dvh]",
  lg: "max-h-[90dvh]",
  xl: "max-h-[92dvh]",
  full: "h-dvh sm:h-[92dvh]",
};

const Modal = memo(({ open, onClose, title, subtitle, accent = "rgb(var(--accent))", size = "md", maxWidth, children }: ModalProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!open) return;
    const r = requestAnimationFrame(() => setShow(true));
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      setShow(false);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isFull = size === "full";

  return (
    <div
      onClick={onClose}
      className={`aa-scrim fixed inset-0 z-[200] flex justify-center transition-opacity duration-200
 ${isFull ? "items-stretch p-0 sm:items-center sm:p-6" : "items-end p-0 sm:items-center sm:p-4"}
 ${show ? "opacity-100" : "opacity-0"}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`aa-surface elev-3 flex w-full flex-col overflow-hidden
 transition-all duration-200
 ${isFull ? "rounded-none sm:rounded-lg" : "rounded-t-2xl sm:rounded-lg"}
 ${maxWidth ?? SIZE_CLASS[size]}
 ${HEIGHT_CLASS[size]}
 ${show ? "translate-y-0 scale-100" : "translate-y-6 sm:translate-y-0 sm:scale-95"}`}
      >
        <div className="h-[3px] flex-shrink-0" style={{ background: accent }} />

        <div className="flex flex-shrink-0 items-center justify-between border-b border-fg/[0.08] px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{title}</p>
            {subtitle && <p className="mt-0.5 truncate text-xs text-mist">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="focus-ring grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-fg/[0.06] text-mist transition-colors hover:bg-fg/[0.12] hover:text-ink">
            <X size={15} />
          </button>
        </div>

        {/* flex-1 + overflow: o conteúdo rola e o painel respeita a altura da tela */}
        {/* Sem padding próprio: quem decide o respiro é o conteúdo.
            A nota tem o seu; formulários trazem o deles. O padding fixo aqui
            somava ao do conteúdo e criava moldura dentro de moldura. */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
});

export { Modal };
export type { ModalSize };
