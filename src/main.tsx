import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import AppRoutes from "@/app/routes/AppRoutes";
import { AlertProvider } from "@/shared/ui/Alert";
import PwaPrompts from "@/shared/pwa/PwaPrompts";
import { aplicarModoApp, observarModoApp } from "@/shared/pwa/appMode";

// Antes de pintar: define se o zoom fica livre (navegador) ou travado (app).
aplicarModoApp();
observarModoApp();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AlertProvider>
      <AppRoutes />
      {/* Nova versão, convite de instalação e aviso de offline. */}
      <PwaPrompts />
    </AlertProvider>
  </StrictMode>,
);
