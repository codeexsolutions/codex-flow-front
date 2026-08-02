import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

import useTransicao from "@/shared/session/transicao.store";

import Sidebar from "@/shared/ui/Sidebar";
import BottomNav from "@/shared/ui/BottomNav";

const Main = () => {
  const { pathname } = useLocation();

  /* Na saída o sistema recua enquanto o overlay entra — o oposto exato da
     abertura. Sem isso o logout "cortava": o app sumia de um frame ao outro. */
  const saindo = useTransicao((s) => s.modo) === "saida";

  return (
    /*
     * O sistema entra crescendo, por baixo do overlay que dissolve — é a
     * "abertura" que fecha a animação de login. Roda uma vez, na montagem,
     * que é exatamente quando a sessão passa a valer.
     */
    <motion.div
      className="aurora flex h-[100dvh] w-screen overflow-hidden bg-canvas"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={saindo ? { opacity: 0, scale: 0.94, filter: "blur(6px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
    >
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
    </motion.div>
  );
};

export default Main;
