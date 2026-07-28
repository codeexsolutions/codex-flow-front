import { ShoppingCart } from "lucide-react";
import { Outlet } from "react-router-dom";

import HeaderPage from "../../components/Headers/HeaderPage";
import { TabsVendas } from "./components/Tabs.sales";

const SalesPage = () => {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0e0d1a] text-[#e8e4ff]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,110,245,0.16),transparent_70%)]" />

      <HeaderPage
        title="Vendas"
        subtitle="Lista de vendas e controle de notas"
        icon={<ShoppingCart size={22} />}
        tabs={TabsVendas}
      />

      <div className="w-full px-5 py-6 lg:px-8 relative z-10 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default SalesPage;
