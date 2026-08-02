import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";

import useAuth from "@/features/auth/store/auth.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";

import Main from "@/app/layouts/MainLayout";
import LoadingScreen from "@/shared/ui/LoadingScreen";
import NotFoundPage from "@/shared/ui/NotFoundPage";
import useTheme from "@/shared/theme/useTheme";

import LandingPage from "@/features/landing/pages/LandingPage";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import FinanceiroPage from "@/features/financeiro/pages/FinanceiroPage";
import RelatoriosPage from "@/features/relatorios/pages/RelatoriosPage";

import AuthPage from "@/features/auth/pages/LoginPage";
import CadastroEmpresaPage from "@/features/auth/pages/SignUpPage";

import Workflow from "@/features/vendas/pages/PDVPage";
import SalesPage from "@/features/vendas/pages/SalesPage";
import SalesOverviewPage from "@/features/vendas/pages/SalesOverviewPage";
import SalesList from "@/features/vendas/pages/SalesListPage";

import CheckoutPage from "@/features/checkout/pages/CheckoutPage";
import PlanosPage from "@/features/assinatura/pages/PlanosPage";

import CorreiosPage from "@/features/correios/pages/CorreiosPage";
import PrecosPrazosPage from "@/features/correios/pages/PrecosPrazosPage";
import PostagemPage from "@/features/correios/pages/PostagemPage";
import RastrearPage from "@/features/correios/pages/RastrearPage";

import ClientesPage from "@/features/clientes/pages/ClientesPage";
import CustomerDetailPage from "@/features/clientes/pages/ClienteDetailPage";

import TableStock from "@/features/estoque/pages/StockPage";

import ConfiguracoesPage from "@/features/config/pages/ConfigPage";
import EmpresaPage from "@/features/config/pages/EmpresaPage";
import ProfilePage from "@/features/config/pages/ProfilePage";
import AparenciaTab from "@/features/config/pages/AparenciaPage";

const PUBLIC_PATHS = ["/login", "/cadastro", "/planos", "/page"];

function AppRoutesContent({ isLogged }: { isLogged: boolean }) {
  const location = useLocation();
  const { enterprise } = useEnterprise();
  const { user } = useAuth();
  const path = location.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  if (!isLogged && !isPublic) {
    return <Navigate to="/login" replace />;
  }

  // Usuário inativo (sem pagamento) → só pode acessar /checkout
  if (isLogged && user && !user.ativo) {
    if (path !== "/checkout") {
      return <Navigate to="/checkout" replace />;
    }
    // Não carrega MainLayout — renderiza checkout sem sidebar
    return <CheckoutPage />;
  }

  if (isLogged && !enterprise) {
    return <LoadingScreen />;
  }

  if (isLogged && user?.ativo && (path === "/checkout" || path === "/login")) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/cadastro" element={<CadastroEmpresaPage />} />
      <Route path="/planos" element={<PlanosPage />} />
      <Route path="/page" element={<LandingPage />} />

      {isLogged && (
        <Route path="/" element={<Main />}>
          {/* Dashboard é a home; o PDV passou a ter rota própria. */}
          <Route index element={<DashboardPage />} />
          <Route path="pdv" element={<Workflow />} />

          <Route path="checkout" element={<CheckoutPage />} />

          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/:clienteId" element={<CustomerDetailPage />} />

          <Route path="estoque" element={<TableStock />} />

          <Route path="financeiro" element={<FinanceiroPage />} />
          <Route path="correios" element={<CorreiosPage />}>
            <Route index element={<PrecosPrazosPage />} />
            <Route path="postagem" element={<PostagemPage />} />
            <Route path="rastrear" element={<RastrearPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="relatorios" element={<RelatoriosPage />} />

          <Route path="configuracoes" element={<ConfiguracoesPage />}>
            <Route index element={<Navigate to="perfil" replace />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="empresa" element={<EmpresaPage />} />
            {/* Mesma tela do checkout: faturas, Pix e comprovante vêm da API. */}
            <Route path="faturas" element={<CheckoutPage />} />
            <Route path="aparencia" element={<AparenciaTab />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="vendas" element={<SalesPage />}>
            <Route index element={<SalesOverviewPage />} />
            <Route path="lista" element={<SalesList />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={isLogged ? "/" : "/login"} replace />} />
    </Routes>
  );
}

const AppRoutes = () => {
  useTheme();
  const { isLogged, initialize, loading } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return <LoadingScreen />;
  }
  return (
    <BrowserRouter>
      <AppRoutesContent isLogged={isLogged} />
    </BrowserRouter>
  );
};

export default AppRoutes;
