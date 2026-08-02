import { Settings } from "lucide-react";
import { Outlet } from "react-router-dom";

import { PageScreen } from "@/shared/ui/PageShell";
import { TabsConfig } from "@/features/config/components/TabsConfig";

const ConfiguracoesPage = () => {
  return (
    <PageScreen title="Configurações" subtitle="Perfil, empresa, faturas e aparência" icon={<Settings className="h-5 w-5" />} tabs={TabsConfig}>
      <Outlet />
    </PageScreen>
  );
};

export default ConfiguracoesPage;
