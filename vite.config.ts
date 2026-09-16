import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Static SPA build for GitHub Pages — no server, no SSR.
// Repo is https://github.com/migueldossantoscosta/approve-pixel-flow, published
// as a project page at https://migueldossantoscosta.github.io/approve-pixel-flow/,
// so every asset/route must be resolved under this base path.
export default defineConfig({
  base: "/approve-pixel-flow/",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
