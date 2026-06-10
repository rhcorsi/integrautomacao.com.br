import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://integrautomacao.com",
  output: "static",
  trailingSlash: "ignore",
  prefetch: {
    // "hover" prefetcha no intento de clique; "viewport" baixava o HTML de
    // centenas de links (mega-menu + grids) conforme o usuário rolava.
    defaultStrategy: "hover",
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/api/"),
    }),
    icon({
      include: {
        lucide: ["*"],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  experimental: {},
});
