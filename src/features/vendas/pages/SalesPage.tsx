import { Outlet, useLocation } from "react-router-dom";

import { PageScreen } from "@/shared/ui/PageShell";
import { abaAtiva, abasVendas } from "@/features/vendas/components/TabsVendas";
import useAuth from "@/features/auth/store/auth.store";

/**
 * A casca da seção — cabeçalho, abas e o outlet onde as telas entram.
 *
 * O cabeçalho fala pela aba aberta, não pela seção.
 *
 * Antes ele dizia "Vendas" em toda rota do outlet: quem clicava em "Caixa e
 * contas" na barra lateral chegava numa tela chamada Vendas e precisava
 * conferir qual pílula estava acesa para saber onde tinha caído. O nome do
 * lugar é a primeira coisa que se lê, e ele estava mentindo em quatro dos
 * cinco destinos.
 */
const SalesPage = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const aba = abaAtiva(pathname, user);

  return (
    <PageScreen title={aba.titulo} subtitle={aba.descricao} icon={aba.simbolo} tabs={abasVendas(user)}>
      <Outlet />
    </PageScreen>
  );
};

export default SalesPage;
