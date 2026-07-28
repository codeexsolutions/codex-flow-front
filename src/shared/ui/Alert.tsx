import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/*  TIPOS                                                              */
/* ------------------------------------------------------------------ */

export type AlertType = "success" | "error" | "warning" | "info" | "question";
export type ToastPosition = "top" | "top-right" | "bottom" | "bottom-right";

export type AlertOptions = {
  type?: AlertType;
  title?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  showClose?: boolean;
  allowOutsideClick?: boolean;
  /** Modo toast: canto da tela, sem bloquear, some sozinho. */
  toast?: boolean;
  position?: ToastPosition;
  /** Fecha sozinho depois de N ms (padrão 4000 no toast). */
  timer?: number;
};

export type AlertResult = {
  confirmed: boolean;
  dismissed: boolean;
};

/* ------------------------------------------------------------------ */
/*  ACCENT — cores por tipo (usadas em vars CSS + atributos SVG)      */
/* ------------------------------------------------------------------ */

const ACCENT: Record<AlertType, { main: string; soft: string; glow: string }> = {
  success: { main: "#3ecf8e", soft: "#8ff0c4", glow: "rgba(62,207,142,0.22)" },
  error: { main: "#f05050", soft: "#f09595", glow: "rgba(240,80,80,0.22)" },
  warning: { main: "#f5a623", soft: "#ffce7a", glow: "rgba(245,166,35,0.22)" },
  info: { main: "#4aa8ff", soft: "#a9d6ff", glow: "rgba(74,168,255,0.22)" },
  question: { main: "#7c6ef5", soft: "#a99cff", glow: "rgba(124,110,245,0.22)" },
};

// helper: injeta as cores do accent como CSS vars no elemento
const accentVars = (type: AlertType): React.CSSProperties => {
  const a = ACCENT[type];
  return {
    ["--aa-main" as string]: a.main,
    ["--aa-soft" as string]: a.soft,
    ["--aa-glow" as string]: a.glow,
  };
};

/* ------------------------------------------------------------------ */
/*  KEYFRAMES + utilitários que o Tailwind não cobre (injetado 1x)    */
/* ------------------------------------------------------------------ */

const STYLE_ID = "aurora-alert-styles";
const CSS = `
@keyframes aa-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes aa-card-in {
  0%   { opacity: 0; transform: translateY(14px) scale(.94) }
  60%  { opacity: 1; transform: translateY(0) scale(1.01) }
  100% { opacity: 1; transform: translateY(0) scale(1) }
}
@keyframes aa-card-out {
  from { opacity: 1; transform: translateY(0) scale(1) }
  to   { opacity: 0; transform: translateY(8px) scale(.96) }
}
@keyframes aa-halo {
  0%, 100% { transform: scale(1);   opacity: .45 }
  50%      { transform: scale(1.1);  opacity: .7 }
}
@keyframes aa-ring-draw   { to { stroke-dashoffset: 0 } }
@keyframes aa-mark-draw   { to { stroke-dashoffset: 0 } }
@keyframes aa-toast-in-r  { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
@keyframes aa-toast-in-t  { from { opacity: 0; transform: translateY(-24px) } to { opacity: 1; transform: none } }
@keyframes aa-toast-in-b  { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
@keyframes aa-toast-out   { to { opacity: 0; transform: translateY(-6px) scale(.98) } }
@keyframes aa-progress    { from { transform: scaleX(1) } to { transform: scaleX(0) } }

.aa-ring { stroke-dasharray: 166; stroke-dashoffset: 166; animation: aa-ring-draw .5s cubic-bezier(.65,0,.35,1) forwards; }
.aa-mark { stroke-dasharray: 48;  stroke-dashoffset: 48;  animation: aa-mark-draw .38s cubic-bezier(.65,0,.35,1) .32s forwards; }

.aa-btn { transition: transform .12s ease, filter .16s ease, background .16s ease, border-color .16s ease; }
.aa-btn:hover  { filter: brightness(1.08); }
.aa-btn:active { transform: translateY(1px) scale(.99); }
.aa-btn:focus-visible { outline: 2px solid rgba(255,255,255,.35); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .aa-ring, .aa-mark { animation: none !important; stroke-dashoffset: 0 !important; }
}
`;

function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

/* ------------------------------------------------------------------ */
/*  ÍCONE ANIMADO (SVG desenhado na entrada)                          */
/* ------------------------------------------------------------------ */

function AlertIcon({ type }: { type: AlertType }) {
  const { main, soft, glow } = ACCENT[type];
  const stroke = {
    fill: "none",
    stroke: soft,
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <div className="relative h-[78px] w-[78px]">
      <div className="absolute -inset-1.5 rounded-full [animation:aa-halo_2.4s_ease-in-out_infinite]" style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }} />
      <svg viewBox="0 0 60 60" width={78} height={78} className="relative">
        <circle className="aa-ring" cx="30" cy="30" r="26.5" fill="none" stroke={main} strokeWidth={4} opacity={0.9} />
        {type === "success" && <polyline className="aa-mark" points="19,31 27,39 42,22" {...stroke} />}
        {type === "error" && (
          <>
            <line className="aa-mark" x1="21" y1="21" x2="39" y2="39" {...stroke} />
            <line className="aa-mark" x1="39" y1="21" x2="21" y2="39" {...stroke} style={{ animationDelay: ".42s" }} />
          </>
        )}
        {type === "warning" && (
          <>
            <line className="aa-mark" x1="30" y1="18" x2="30" y2="34" {...stroke} />
            <circle cx="30" cy="42" r="2.6" fill={soft} />
          </>
        )}
        {type === "info" && (
          <>
            <circle cx="30" cy="20" r="2.6" fill={soft} />
            <line className="aa-mark" x1="30" y1="28" x2="30" y2="42" {...stroke} />
          </>
        )}
        {type === "question" && <path className="aa-mark" d="M23 24a7 7 0 0 1 13 2c0 5-6 5-6 9" {...stroke} />}
        {type === "question" && <circle cx="30" cy="42" r="2.6" fill={soft} />}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MODAL                                                              */
/* ------------------------------------------------------------------ */

function Modal({ opts, closing, onConfirm, onCancel }: { opts: AlertOptions; closing: boolean; onConfirm: () => void; onCancel: () => void }) {
  const type = opts.type ?? "info";
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opts.allowOutsideClick !== false) onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm, opts.allowOutsideClick]);

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && opts.allowOutsideClick !== false) onCancel();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(9,8,16,0.72)] p-5 backdrop-blur-md [animation:aa-backdrop-in_.2s_ease]"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={opts.title}
        style={{
          ...accentVars(type),
          background: "radial-gradient(120% 90% at 50% -10%, var(--aa-glow) 0%, transparent 45%), linear-gradient(180deg, #1f1c2c 0%, #17151f 100%)",
          animation: closing ? "aa-card-out .18s ease forwards" : "aa-card-in .34s cubic-bezier(.34,1.56,.64,1)",
        }}
        className="relative w-full max-w-[380px] rounded-[20px] border border-white/[0.08] px-[26px] pb-6 pt-[30px] shadow-[0_12px_40px_-20px_rgba(0,0,0,0.5)]"
      >
        {/* fio de luz no topo */}
        <div className="pointer-events-none absolute inset-x-[18%] top-0 h-px opacity-70" style={{ background: "linear-gradient(90deg, transparent, var(--aa-main), transparent)" }} />

        {opts.showClose !== false && (
          <button aria-label="Fechar" onClick={onCancel} className="aa-btn absolute right-3.5 top-3.5 grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-base leading-none text-[#8983ad]">
            ✕
          </button>
        )}

        <div className="mb-[18px] grid place-items-center">
          <AlertIcon type={type} />
        </div>

        {opts.title && <h2 className="m-0 text-center text-[19px] font-[650] tracking-[-0.01em] text-[#e8e4ff]">{opts.title}</h2>}

        {opts.message && <div className="mt-2 text-center text-[13.5px] leading-[1.55] text-[#8983ad]">{opts.message}</div>}

        <div className="mt-6 flex gap-2.5">
          {opts.showCancel && (
            <button onClick={onCancel} className="aa-btn flex-1 cursor-pointer rounded-[11px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-[11px] text-[13.5px] font-[550] text-[#e8e4ff]">
              {opts.cancelText ?? "Cancelar"}
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              ...accentVars(type),
              background: "linear-gradient(180deg, var(--aa-main), color-mix(in srgb, var(--aa-main) 80%, transparent))",
            }}
            className="aa-btn flex-1 cursor-pointer rounded-[11px] border-0 px-3.5 py-[11px] text-[13.5px] font-[650] text-[#0b0a12] shadow-[0_4px_14px_-8px_var(--aa-main)]"
          >
            {opts.confirmText ?? "Entendi"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TOAST                                                              */
/* ------------------------------------------------------------------ */

function Toast({ opts, closing, onClose }: { opts: AlertOptions; closing: boolean; onClose: () => void }) {
  const type = opts.type ?? "info";
  const accent = ACCENT[type];
  const position = opts.position ?? "top-right";
  const timer = opts.timer ?? 4000;

  const anchor: React.CSSProperties =
    position === "top-right"
      ? { top: 18, right: 18, animationName: "aa-toast-in-r" }
      : position === "bottom-right"
        ? { bottom: 18, right: 18, animationName: "aa-toast-in-b" }
        : position === "bottom"
          ? { bottom: 18, left: "50%", transform: "translateX(-50%)", animationName: "aa-toast-in-b" }
          : { top: 18, left: "50%", transform: "translateX(-50%)", animationName: "aa-toast-in-t" };

  return (
    <div
      role="status"
      style={{
        ...anchor,
        background: "linear-gradient(180deg, #1f1c2c, #17151f)",
        animation: closing ? "aa-toast-out .2s ease forwards" : `${anchor.animationName} .32s cubic-bezier(.34,1.56,.64,1)`,
      }}
      className="fixed z-[9999] flex max-w-[340px] items-center gap-3 overflow-hidden rounded-[14px] border border-white/[0.08] px-[15px] py-[13px] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.55)]"
    >
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] text-[15px]" style={{ background: accent.glow, color: accent.soft }}>
        {type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "!" : type === "question" ? "?" : "i"}
      </span>
      <div className="min-w-0">
        {opts.title && <div className="text-[13.5px] font-semibold leading-[1.3] text-[#e8e4ff]">{opts.title}</div>}
        {opts.message && <div className={`text-[12.5px] leading-[1.4] text-[#8983ad] ${opts.title ? "mt-0.5" : ""}`}>{opts.message}</div>}
      </div>
      <button aria-label="Fechar" onClick={onClose} className="aa-btn ml-1 cursor-pointer border-0 bg-transparent text-[13px] text-[#8983ad]">
        ✕
      </button>
      {timer > 0 && <span className="absolute bottom-0 left-0 h-[2.5px] w-full origin-left" style={{ background: accent.main, animation: `aa-progress ${timer}ms linear forwards` }} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CONTEXT + PROVIDER                                                 */
/* ------------------------------------------------------------------ */

type FireFn = (options: AlertOptions) => Promise<AlertResult>;

const AlertContext = createContext<{ fire: FireFn } | null>(null);

// ponte para uso imperativo fora de componentes (ex.: interceptor do axios)
let _fire: FireFn | null = null;

export function AlertProvider({ children }: { children: React.ReactNode }) {
  useInjectStyles();
  const [active, setActive] = useState<AlertOptions | null>(null);
  const [closing, setClosing] = useState(false);
  const resolveRef = useRef<((r: AlertResult) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback((result: AlertResult) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    resolveRef.current?.(result);
    resolveRef.current = null;
    setClosing(true);
    setTimeout(() => {
      setActive(null);
      setClosing(false);
    }, 200);
  }, []);

  const fire = useCallback<FireFn>(
    (options) =>
      new Promise<AlertResult>((resolve) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        resolveRef.current = resolve;
        setClosing(false);
        setActive(options);
        const timer = options.toast ? (options.timer ?? 4000) : (options.timer ?? 0);
        if (timer > 0) {
          timerRef.current = setTimeout(() => finish({ confirmed: false, dismissed: true }), timer);
        }
      }),
    [finish],
  );

  useEffect(() => {
    _fire = fire;
    return () => {
      if (_fire === fire) _fire = null;
    };
  }, [fire]);

  return (
    <AlertContext.Provider value={{ fire }}>
      {children}
      {active &&
        createPortal(
          active.toast ? <Toast opts={active} closing={closing} onClose={() => finish({ confirmed: false, dismissed: true })} /> : <Modal opts={active} closing={closing} onConfirm={() => finish({ confirmed: true, dismissed: false })} onCancel={() => finish({ confirmed: false, dismissed: true })} />,
          document.body,
        )}
    </AlertContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  HOOK + HELPERS                                                     */
/* ------------------------------------------------------------------ */

function makeHelpers(fire: FireFn) {
  return {
    fire,
    success: (title: string, message?: React.ReactNode, o?: AlertOptions) => fire({ type: "success", title, message, ...o }),
    error: (title: string, message?: React.ReactNode, o?: AlertOptions) => fire({ type: "error", title, message, ...o }),
    warning: (title: string, message?: React.ReactNode, o?: AlertOptions) => fire({ type: "warning", title, message, ...o }),
    info: (title: string, message?: React.ReactNode, o?: AlertOptions) => fire({ type: "info", title, message, ...o }),
    confirm: (title: string, message?: React.ReactNode, o?: AlertOptions) => fire({ type: "question", title, message, showCancel: true, confirmText: "Confirmar", ...o }),
    toast: (type: AlertType, title: string, message?: React.ReactNode, o?: AlertOptions) => fire({ type, title, message, toast: true, showClose: false, ...o }),
  };
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert precisa estar dentro de <AlertProvider>.");
  return makeHelpers(ctx.fire);
}

/**
 * API imperativa para usar em qualquer lugar (interceptors, services, utils),
 * sem precisar de hook. Requer o <AlertProvider> montado na árvore.
 */
export const alert = makeHelpers((options) => {
  if (!_fire) return Promise.reject(new Error("AlertProvider não está montado."));
  return _fire(options);
});
