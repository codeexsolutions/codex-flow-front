import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";

import useAuth from "../store/auth.store";
import useEnterprise from "../store/enterprise.store";

import Main from "../pages/Main/Main";
import LoadingScreen from "../pages/Main/LoadingScreen";
import LandingPage from "../pages/LadingPage";

import AuthPage from "../pages/Auth/Login/Login.Page";
import CadastroEmpresaPage from "../pages/Auth/SignUp/SIgnUp.Page";

import Workflow from "../pages/PDVPage";
import CheckoutPage from "../pages/CheckoutPage";

import ClientesPage from "../pages/Clientes/Client.page";
import CustomerDetailPage from "../pages/Clientes/Detail.page";

import TableStock from "../pages/Stock/StockPage";

import ConfiguracoesPage from "../pages/Config/Config.Page";
import EmpresaPage from "../pages/Config/pages/Empresa.Page";
import ProfilePage from "../pages/Config/pages/Profile.Page";

import SalesPage from "../pages/Sales/Sales.Page";
import SalesOverviewPage from "../pages/Sales/pages/SalesOverview.Page";
import SalesList from "../pages/Sales/pages/SalesList.Page";

import NotFoundPage from "../pages/NotFoundPage";
import AparenciaTab from "../pages/Config/pages/Aparencia.Page";
import useTheme from "../hooks/useTheme";

const PUBLIC_PATHS = ["/login", "/cadastro", "/page"];

function AppRoutesContent({ isLogged }: { isLogged: boolean }) {
  const location = useLocation();
  const { enterprise } = useEnterprise();
  const { user } = useAuth();
  const path = location.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  if (!isLogged && !isPublic) {
    return <Navigate to="/login" replace />;
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
      <Route path="/page" element={<LandingPage />} />

      {isLogged && (
        <Route path="/" element={<Main />}>
          <Route index element={<Workflow />} />

          <Route path="checkout" element={<CheckoutPage />} />

          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/:clienteId" element={<CustomerDetailPage />} />

          <Route path="estoque" element={<TableStock />} />

          <Route path="configuracoes" element={<ConfiguracoesPage />}>
            <Route index element={<Navigate to="perfil" replace />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="empresa" element={<EmpresaPage />} />
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
