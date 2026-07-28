import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

export interface HeaderTab {
  label: string;
  path: string;
  icon?: ReactNode;
  end?: boolean;
}

interface HeaderPageProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  tabs?: HeaderTab[];
  actions?: ReactNode;
}

const HeaderPage = ({ title, subtitle, icon, tabs, actions }: HeaderPageProps) => {
  const hasTabs = Boolean(tabs && tabs.length > 0);

  return (
    <header className="relative z-10 shrink-0 border-b border-fg/[0.08] bg-canvas/90 backdrop-blur-xl">
      <div className={`flex flex-wrap items-center justify-between gap-3 px-5 pt-4 lg:px-8 ${hasTabs ? "pb-3" : "pb-4"}`}>
        <div className="flex items-center gap-3.5">
          {icon && <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fg/[0.03] text-accent-soft ring-1 ring-fg/[0.08]">{icon}</div>}

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="truncate text-xs text-faint">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {hasTabs && (
        <div className="px-5 lg:px-8">
          <nav className="-mb-px flex flex-wrap items-center gap-6">
            {tabs!.map((tab) => (
              <NavLink key={tab.path} to={tab.path} end={tab.end ?? true} className={({ isActive }) => `group relative flex items-center gap-2 pb-3 pt-1 text-sm font-medium transition-colors ${isActive ? "text-ink" : "text-mist hover:text-ink"}`}>
                {({ isActive }) => (
                  <>
                    {tab.icon && <span className={isActive ? "text-accent-soft" : "text-faint transition-colors group-hover:text-accent-soft"}>{tab.icon}</span>}
                    {tab.label}
                    <span className={`absolute inset-x-0 bottom-0 h-[2px] rounded-full transition-colors ${isActive ? "bg-accent" : "bg-transparent group-hover:bg-fg/15"}`} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default HeaderPage;
