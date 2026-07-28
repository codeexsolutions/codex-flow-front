import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  console.log(`Ambiente: ${env.ENVIRONMENT_CONSOLE}`);
  console.log(`Produção: ${env.PRODUCTION}`);

  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    plugins: [
      react(),

      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",

        includeAssets: ["logo.png"],

        manifest: {
          name: "CodEx Flow",
          short_name: "CodEx",
          description: "Sistema de Gestão Empresarial",
          theme_color: "#0e0d1a",
          background_color: "#0e0d1a",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",

          icons: [
            {
              src: "/logo.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },

        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },

        devOptions: {
          enabled: true,
        },
      }),
    ],

    server: {
      host: env.APPLICATION_ENVIRONMENT,
      port: Number(env.APPLICATION_PORT),
    },

    preview: {
      host: env.APPLICATION_ENVIRONMENT,
      port: Number(env.APPLICATION_PORT),
    },
  };
});
