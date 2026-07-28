import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Package, Users, DollarSign, Settings, LogOut, ShoppingCart, BarChart3, Bot, IdCard, Menu, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import useAuth from "../store/auth.store";
import useEnterprise from "../store/enterprise.store";

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enterprise } = useEnterprise();

  const [open, setOpen] = useState(false);

  const userInitials = useMemo(
    () =>
      user?.nome
        ?.split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase() ?? "U",
    [user?.nome],
  );

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
        <div className="mb-0.5 flex cursor-not-allowed items-center gap-3 rounded-xl px-2.5 py-2 opacity-50">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fg/[0.02] text-faint">{icon}</span>
          <span className="flex-1 text-sm text-mist">{label}</span>
          <span className="rounded-full border border-fg/[0.08] bg-fg/[0.02] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-faint">Em breve</span>
        </div>
      );
    }

    const active = isActive(route);
    return (
      <button
        type="button"
        onClick={() => goto(route)}
        aria-current={active ? "page" : undefined}
        className={`group relative mb-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-200 ${active ? "bg-gradient-to-r from-accent/[0.18] to-accent/[0.04] font-medium text-ink" : "text-mist hover:bg-fg/[0.04] hover:text-ink"}`}
      >
        {active && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-accent-soft to-accent shadow-[0_0_10px_rgb(var(--accent)/0.75)]" />}
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${active ? "bg-accent/25 text-accent-soft" : "bg-fg/[0.03] text-faint group-hover:bg-fg/[0.07] group-hover:text-accent-soft"}`}>{icon}</span>
        <span className="flex-1">{label}</span>
      </button>
    );
  };

  const cat = (label: string) => <p className="px-2.5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted first:pt-1">{label}</p>;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="fixed bottom-4 left-4 z-[10] flex h-11 w-11 items-center justify-center rounded-2xl border border-fg/[0.08] bg-canvas/90 text-accent-soft shadow-lg shadow-black/40 backdrop-blur transition-colors hover:bg-surface md:hidden"
        >
          <Menu size={19} />
        </button>
      )}

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-shrink-0 flex-col overflow-hidden border-r border-fg/[0.08] bg-gradient-to-b from-surface to-canvas transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(ellipse_at_top,rgb(var(--accent)/0.16),transparent_70%)]" />

        {/* Marca da empresa */}
        <div className="relative flex items-center gap-3.5 border-b border-fg/[0.07] px-5 py-4">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-raised to-surface ring-1 ring-fg/10">
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
              <span className="text-base font-semibold text-accent-soft">{companyInitial}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{enterprise?.nomeFantasia || "Sua Empresa"}</p>
            <p className="truncate text-xs text-faint">Painel de gestão</p>
          </div>

          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-fg/[0.06] hover:text-accent-soft md:hidden">
            <X size={16} />
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-3 [scrollbar-color:rgb(var(--accent)/0.25)_transparent] [scrollbar-width:thin]">
          {cat("Operação")}
          {item("", <ShoppingCart size={17} />, "PDV")}

          {cat("Gerenciamento")}
          {item("estoque", <Package size={17} />, "Estoque")}
          {item("clientes", <Users size={17} />, "Clientes")}
          {item("funcionarios", <IdCard size={17} />, "Funcionários", true)}

          {cat("Financeiro")}
          {item("vendas", <DollarSign size={17} />, "Vendas")}
          {item("relatorios", <BarChart3 size={17} />, "Relatórios", true)}

          {cat("Ferramentas")}
          {item("chatbot", <Bot size={17} />, "Chatbot", true)}
        </nav>

        {/* Usuário */}
        <div className="relative border-t border-fg/[0.07] p-3">
          <div className="flex items-center gap-3 rounded-xl border border-fg/[0.06] bg-fg/[0.025] p-2.5">
            {user?.image ? (
              <img src={user.image} alt="Avatar" className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-fg/10" />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-accent text-xs font-medium text-white ring-1 ring-fg/10">{userInitials}</div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{user?.nome || "Usuário"}</p>
              <p className="truncate text-[11px] text-faint">{user?.cargo || "Conectado"}</p>
            </div>

            <button
              type="button"
              onClick={() => goto("/configuracoes")}
              aria-label="Configurações"
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-fg/[0.07] ${isActive("configuracoes") ? "text-accent-soft" : "text-faint hover:text-accent-soft"}`}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="relative flex items-center justify-between gap-2 border-t border-fg/[0.07] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="logo.png" width={22} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm text-mist">Codex Flow</p>
            </div>
          </div>

          <button type="button" onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-mist transition-colors hover:bg-danger/[0.08] hover:text-danger">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
