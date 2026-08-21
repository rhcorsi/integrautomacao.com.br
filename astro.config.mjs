import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";
import { shouldIncludeInSitemap } from "./src/utils/seo-policy";

export default defineConfig({
  site: "https://integrautomacao.com.br",
  output: "static",
  trailingSlash: "ignore",
  // Preserva o espaçamento HTML do Astro 6 e evita regressões visuais em
  // sequências de elementos inline após a migração para o compilador Rust.
  compressHTML: true,
  prefetch: {
    // "hover" prefetcha no intento de clique; "viewport" baixava o HTML de
    // centenas de links (mega-menu + grids) conforme o usuário rolava.
    defaultStrategy: "hover",
  },
  integrations: [
    mdx(),
    sitemap({
      filter: shouldIncludeInSitemap,
    }),
    icon({
      include: {
        lucide: ["*"],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // A CSP de produção não permite JavaScript executável inline. Força os
    // scripts processados pelo Astro/Vite a permanecerem como assets externos.
    build: {
      assetsInlineLimit: 0,
    },
  },
  experimental: {},
});
