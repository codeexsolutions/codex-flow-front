import { useState } from "react";
import type { ReactNode } from "react";
import { Package, Users, DollarSign, Settings, LogOut, ShoppingCart, BarChart3, Menu, X, LayoutDashboard, Wallet } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import useAuth from "@/features/auth/store/auth.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";
import { getInitials } from "@/shared/utils/format";

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enterprise } = useEnterprise();

  const [open, setOpen] = useState(false);

  const userInitials = getInitials(user?.nome, "U");
  const companyInitial = (enterprise?.nomeFantasia || "E").trim().charAt(0).toUpperCase();
  const companyImage = enterprise?.urlLogo || enterprise?.urlImagem || "";

  const isActive = (route: string) => (route === "" ? pathname === "/" : pathname === `/${route}` || pathname.startsWith(`/${route}/`));

  const goto = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const handleLogout = () => {
    Promise.resolve(logout()).catch(() => {});
  };

  const item = (route: string, icon: ReactNode, label: string, disabled = false) => {
    if (disabled) {
      return (
        <div className="mb-1 flex cursor-not-allowed items-center gap-3 rounded-xl px-2.5 py-2 opacity-45">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fg/[0.04] text-faint">{icon}</span>
          <span className="flex-1 text-[13.5px] text-mist">{label}</span>
          <span className="rounded-full border border-fg/[0.08] bg-fg/[0.03] px-2 py-0.5 text-[9px] uppercase tracking-wider text-faint">Em breve</span>
        </div>
      );
    }

    const active = isActive(route);
    return (
      <button
        type="button"
        onClick={() => goto(route)}
        aria-current={active ? "page" : undefined}
        className={`group focus-ring relative mb-1 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-all duration-200 ${active ? " text-ink" : "text-mist hover:bg-fg/[0.05] hover:text-ink"}`}
      >
        {/* Pílula de fundo do item ativo */}
        {active && <span aria-hidden className="absolute inset-0 rounded-xl border border-accent/25 bg-gradient-to-r from-accent/[0.22] via-accent/[0.10] to-transparent" style={{ boxShadow: "inset 0 1px 0 rgb(var(--glass-highlight) / 0.14)" }} />}

        {active && <span aria-hidden className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-accent-soft to-accent" style={{ boxShadow: "0 0 12px rgb(var(--accent) / calc(0.8 * var(--fx-glow, 1)))" }} />}

        <span className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${active ? "bg-accent/25 text-accent-soft" : "bg-fg/[0.04] text-faint group-hover:bg-fg/[0.08] group-hover:text-accent-soft"}`}>{icon}</span>
        <span className="relative flex-1">{label}</span>
      </button>
    );
  };

  const cat = (label: string) => <p className="px-2.5 pb-2 pt-5 text-[10px] uppercase tracking-[0.18em] text-muted first:pt-1">{label}</p>;

  return (
    <>
      {/* Botão flutuante (mobile) */}
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" className="glass-strong elev-3 focus-ring fixed bottom-5 left-5 z-[10] flex h-12 w-12 items-center justify-center rounded-2xl text-accent-soft transition-transform active:scale-95 md:hidden">
          <Menu size={20} />
        </button>
      )}

      {/* Backdrop (mobile) */}
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-canvas/60 md:hidden" style={{ backdropFilter: "blur(var(--blur-sm))", WebkitBackdropFilter: "blur(var(--blur-sm))" }} />}

      <aside
        className={`glass-strong fixed inset-y-0 left-0 z-50 flex w-72 flex-shrink-0 flex-col overflow-hidden border-y-0 border-l-0 border-r transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ borderColor: "rgb(var(--glass-border) / calc(var(--glass-border-alpha) + 0.03))" }}
      >
        {/* Brilho ambiente no topo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-52"
          style={{
            opacity: "var(--fx-aurora, 1)",
            background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgb(var(--accent) / 0.18), transparent 70%)",
          }}
        />

        {/* Marca da empresa */}
        <div className="relative flex items-center gap-3.5 border-b border-fg/[0.07] px-5 py-4">
          <div className="relative h-11 w-11 shrink-0">
            <div aria-hidden className="absolute -inset-1 rounded-2xl bg-accent/30 blur-md" style={{ opacity: "calc(0.6 * var(--fx-glow, 1))" }} />
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-raised to-surface ring-1 ring-fg/10">
              {companyImage ? (
                <img
                  src={companyImage}
                  alt={enterprise?.nomeFantasia || "Logo"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-base text-accent-soft">{companyInitial}</span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] tracking-tight text-ink">{enterprise?.nomeFantasia || "Sua Empresa"}</p>
            <p className="truncate text-[11.5px] text-faint">Painel de gestão</p>
          </div>

          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="focus-ring flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-fg/[0.06] hover:text-accent-soft md:hidden">
            <X size={16} />
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-3">
          {cat("Operação")}
          {item("", <LayoutDashboard size={17} />, "Dashboard")}
          {item("pdv", <ShoppingCart size={17} />, "PDV")}

          {cat("Gerenciamento")}
          {item("estoque", <Package size={17} />, "Estoque")}
          {item("clientes", <Users size={17} />, "Clientes")}

          {cat("Financeiro")}
          {item("vendas", <DollarSign size={17} />, "Vendas")}
          {item("financeiro", <Wallet size={17} />, "Financeiro")}
          {item("relatorios", <BarChart3 size={17} />, "Relatórios")}
        </nav>

        {/* Usuário */}
        <div className="relative p-3">
          <div className="glass-subtle flex items-center gap-3 rounded-2xl p-2.5">
            {user?.image ? (
              <img src={user.image} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-fg/10" />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-accent text-xs text-white ring-1 ring-fg/10">{userInitials}</div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink">{user?.nome || "Usuário"}</p>
              <p className="truncate text-[11px] text-faint">{user?.cargo || "Conectado"}</p>
            </div>

            <button
              type="button"
              onClick={() => goto("/configuracoes")}
              aria-label="Configurações"
              className={`focus-ring flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 hover:rotate-45 hover:bg-fg/[0.08] ${isActive("configuracoes") ? "text-accent-soft" : "text-faint hover:text-accent-soft"}`}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="relative flex items-center justify-between gap-2 border-t border-fg/[0.07] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" width={22} height={22} alt="" className="rounded" />
            <p className="truncate text-[13px] text-mist">Codex Flow</p>
          </div>

          <button type="button" onClick={handleLogout} className="focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-mist transition-colors hover:bg-danger/10 hover:text-danger">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
