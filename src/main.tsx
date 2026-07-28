import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import AppRoutes from "@/app/routes/AppRoutes";
import { AlertProvider } from "@/shared/ui/Alert";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AlertProvider>
      <AppRoutes />
    </AlertProvider>
  </StrictMode>,
);
