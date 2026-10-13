import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getStoredTheme } from "./hooks/use-theme";

// Remove o parâmetro volátil usado pelo reload de atualização (ver use-app-update).
const params = new URLSearchParams(window.location.search);
if (params.has("_v")) {
  params.delete("_v");
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
  );
}

// Aplica o tema salvo (padrão: escuro) antes de renderizar, evitando flash.
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
