import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Tema branco pastel como padrão da aplicação (identidade M.I.).
// O tema escuro segue disponível aplicando a classe "dark" no <html>.
document.documentElement.classList.remove("dark");

createRoot(document.getElementById("root")!).render(<App />);
