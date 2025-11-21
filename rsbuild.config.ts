import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/rspack";

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  source: {
    entry: {
      index: "./src/frontend/index.tsx",
    },
  },
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [
        tanstackRouter({
          target: "react",
          autoCodeSplitting: true,
          routesDirectory: "./src/frontend/routes",
          generatedRouteTree: "./src/frontend/routes/routeTree.gen.ts",
        }),
      ],
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3005",
        changeOrigin: true,
      },
    },
  },
});
