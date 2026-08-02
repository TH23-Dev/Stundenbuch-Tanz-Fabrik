import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: ["icons/apple-touch-icon.png", "icons/favicon-32.png"],
      manifest: {
        name: "Stundenbuch Tanz-Fabrik",
        short_name: "Stundenbuch",
        description: "Stunden erfassen und abrechnen für die Tanz-Fabrik",
        lang: "de-CH",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F5F4F2",
        theme_color: "#0C0A09",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Nie Supabase-Antworten cachen -- Stundenstatus/Löhne müssen immer
        // live sein, ein veralteter Cache darf hier nichts vortäuschen.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
