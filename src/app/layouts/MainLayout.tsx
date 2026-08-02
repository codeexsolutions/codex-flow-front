import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "@/shared/ui/Sidebar";
import BottomNav from "@/shared/ui/BottomNav";

const Main = () => {
  const { pathname } = useLocation();

  return (
    <div className="aurora flex h-[100dvh] w-screen overflow-hidden bg-canvas">
      {/* A sidebar some no celular (ela mesma se esconde); lá quem navega é a
          barra inferior, ao alcance do polegar. */}
      <Sidebar />

      <main className="relative min-w-0 flex-1 overflow-hidden">
        {/* `key` na rota reinicia a animação a cada navegação. */}
        <div key={pathname} className="route-enter h-full w-full">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Main;
