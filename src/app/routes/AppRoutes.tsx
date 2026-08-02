import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";

import useAuth from "@/features/auth/store/auth.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";

import Main from "@/app/layouts/MainLayout";
import LoadingScreen from "@/shared/ui/LoadingScreen";
import NotFoundPage from "@/shared/ui/NotFoundPage";
import useTheme from "@/shared/theme/useTheme";
import { useIsMobile } from "@/shared/hooks/useIsMobile";

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
import FuncionariosPage from "@/features/funcionarios/pages/FuncionariosPage";
import { ehGestor } from "@/features/vendas/components/TabsVendas";

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

/**
 * No celular a tela de carregamento não aparece: ela competia com a animação
 * de login e virava um piscar de spinner entre o "Bem-vindo" e o sistema.
 * No lugar entra o fundo liso — a transição cobre o intervalo.
 */
const Espera = ({ mobile }: { mobile: boolean }) => (mobile ? <div className="h-[100dvh] w-full bg-canvas" /> : <LoadingScreen />);

function AppRoutesContent({ isLogged, mobile }: { isLogged: boolean; mobile: boolean }) {
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
    return <Espera mobile={mobile} />;
  }

  if (isLogged && user?.ativo && (path === "/checkout" || path === "/login")) {
    return <Navigate to="/" replace />;
  }

  // O funcionário opera a loja inteira. O que é do dono são duas coisas: o
  // cadastro da empresa (com a assinatura e as faturas) e a gestão de quem tem
  // acesso. O resto — PDV, estoque, clientes, vendas, financeiro, relatórios —
  // é trabalho do dia e fica aberto.
  //
  // A lista é de bloqueio, não de liberação: tela nova nasce acessível, e
  // esquecer de incluí-la aqui não tranca ninguém para fora do próprio serviço.
  // Esconder do menu não basta — digitar a rota na mão não pode abrir a tela.
  if (isLogged && user?.ativo && !ehGestor(user)) {
    const soDoDono = path.startsWith("/configuracoes/empresa") || path.startsWith("/configuracoes/faturas") || path.startsWith("/vendas/funcionarios");

    if (soDoDono) return <Navigate to="/" replace />;
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
            {/* Mesma tela do checkout: faturas, Pix e comprovante vêm da API.
                `embutido` tira o cabeçalho e o padding próprios — Configurações
                já fornece os dois. */}
            <Route path="faturas" element={<CheckoutPage embutido />} />
            <Route path="aparencia" element={<AparenciaTab />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="vendas" element={<SalesPage />}>
            <Route index element={<SalesOverviewPage />} />
            <Route path="lista" element={<SalesList />} />
            <Route path="funcionarios" element={<FuncionariosPage />} />
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
  const mobile = useIsMobile();
  const { isLogged, initialize, loading } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return <Espera mobile={mobile} />;
  }
  return (
    <BrowserRouter>
      <AppRoutesContent isLogged={isLogged} mobile={mobile} />
    </BrowserRouter>
  );
};

export default AppRoutes;
