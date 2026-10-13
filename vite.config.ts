import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Gera um identificador único por build (version.json) e injeta o mesmo valor
 * na aplicação via __APP_VERSION__. O cliente compara periodicamente o valor
 * embutido com o version.json servido e recarrega quando detecta uma nova versão.
 */
function appVersionPlugin(): Plugin {
  const version = Date.now().toString();
  return {
    name: "app-version",
    config() {
      return { define: { __APP_VERSION__: JSON.stringify(version) } };
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version }),
      });
    },
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ version }));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), appVersionPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
