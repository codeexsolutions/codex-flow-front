import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "@/shared/ui/Sidebar";

const Main = () => {
  const { pathname } = useLocation();

  return (
    <div className="aurora flex h-screen w-screen overflow-hidden bg-canvas">
      <Sidebar />

      <main className="relative min-w-0 flex-1 overflow-hidden">
        {/* `key` na rota reinicia a animação a cada navegação. */}
        <div key={pathname} className="route-enter h-full w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Main;
