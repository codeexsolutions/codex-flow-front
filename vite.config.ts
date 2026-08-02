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
        // "prompt" e não "autoUpdate": com autoUpdate a versão troca sozinha no
        // meio do uso — inclusive enquanto o vendedor fecha uma venda. Aqui a
        // troca só acontece quando a pessoa aceita o aviso.
        registerType: "prompt",
        injectRegister: "auto",

        includeAssets: ["apple-touch-icon.png", "favicon-32.png", "offline.html"],

        manifest: {
          name: "CodeEx Flow",
          short_name: "CodeEx Flow",
          description: "Sistema de gestão para o seu negócio: PDV, estoque, clientes e financeiro.",
          lang: "pt-BR",
          theme_color: "#0e0d1a",
          background_color: "#0e0d1a",
          display: "standalone",
          // Sem travar em "portrait": em tablet e desktop instalado o app
          // precisa acompanhar a rotação da tela.
          orientation: "any",
          start_url: "/",
          scope: "/",
          categories: ["business", "productivity", "finance"],

          icons: [
            { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            // Maskable é um arquivo PRÓPRIO, com margem de segurança: o Android
            // recorta o ícone e, sem a margem, comia a logo.
            { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],

          shortcuts: [
            { name: "Ponto de Venda", short_name: "PDV", url: "/pdv" },
            { name: "Vendas", short_name: "Vendas", url: "/vendas" },
          ],
        },

        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          // `skipWaiting` desligado: quem decide a hora de trocar é o usuário,
          // pelo aviso de nova versão.
          skipWaiting: false,

          // Sem isto, abrir o app offline dava tela de erro do navegador.
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/v1/, /^\/socket\.io/],

          runtimeCaching: [
            {
              // Fontes do Google: imutáveis, cache longo.
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "fontes-google",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Imagens (logos de empresa, QR): serve do cache e atualiza atrás.
              urlPattern: ({ request }) => request.destination === "image",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "imagens",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Leituras da API: rede primeiro, cache como rede de segurança.
              // Dá ao app uma última versão dos dados quando a conexão cai.
              urlPattern: ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/v1"),
              handler: "NetworkFirst",
              options: {
                cacheName: "api-leitura",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },

        devOptions: {
          enabled: true,
          type: "module",
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
