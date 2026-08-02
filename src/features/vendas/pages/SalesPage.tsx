import { ShoppingCart } from "lucide-react";
import { Outlet } from "react-router-dom";

import { PageScreen } from "@/shared/ui/PageShell";
import { tabsVendas } from "@/features/vendas/components/TabsVendas";
import useAuth from "@/features/auth/store/auth.store";

const SalesPage = () => {
  const { user } = useAuth();

  return (
    <PageScreen title="Vendas" subtitle="Lista de vendas e controle de notas" icon={<ShoppingCart className="h-5 w-5" />} tabs={tabsVendas(user)}>
      <Outlet />
    </PageScreen>
  );
};

export default SalesPage;
