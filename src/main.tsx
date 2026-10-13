import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getStoredTheme } from "./hooks/use-theme";

// Aplica o tema salvo (padrão: escuro) antes de renderizar, evitando flash.
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
