import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "prompt",
        manifest: false,
        workbox: {
          importScripts: ["/sw-push.js"],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co/,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-cache",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              },
            },
          ],
          navigateFallback: "/index.html",
        },
        devOptions: { enabled: false },
      }),
    ],
    optimizeDeps: { exclude: ["pdfjs-dist"] },
  };
});
