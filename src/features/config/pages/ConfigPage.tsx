import { Settings } from "lucide-react";
import HeaderPage from "@/shared/ui/HeaderPage";
import { TabsConfig } from "@/features/config/components/TabsConfig";
import { Outlet } from "react-router-dom";

const ConfiguracoesPage = () => {
  return (
    <div className="aurora relative flex h-full w-full flex-col overflow-hidden text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(var(--accent)/0.16),transparent_70%)]" />

      <HeaderPage title="Configurações" subtitle="Perfil, empresa e aparência" icon={<Settings size={22} />} tabs={TabsConfig} />

      <div className="relative z-10 w-full flex-1 overflow-y-auto px-5 py-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
};

export default ConfiguracoesPage;
