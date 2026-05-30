import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const lovableConfig = defineLovableConfig();

export default {
  ...lovableConfig,
  plugins: [
    ...(lovableConfig.plugins || []),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Abastece Votu",
        short_name: "AbasteceVotu",
        description: "Aplicativo para controle de abastecimento em Votuporanga",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/src/Abastece.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ]
};