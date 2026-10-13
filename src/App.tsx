import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import Auth from "./pages/Auth.tsx";
import Index from "./pages/Index.tsx";
import Prospecting from "./pages/Prospecting.tsx";
import DashboardAdmin from "./pages/DashboardAdmin.tsx";
import DashboardTM from "./pages/DashboardTM.tsx";
import NotFound from "./pages/NotFound.tsx";
import Documents from "./pages/Documents.tsx";
import Profile from "./pages/Profile.tsx";
import { AppHeader } from "./components/AppHeader.tsx";
import { DailyReportGate } from "./components/DailyReportGate.tsx";
import { AppUpdateWatcher } from "./components/AppUpdateWatcher.tsx";

const queryClient = new QueryClient();

/** Redireciona TM que tentar acessar áreas de SDR (Gestão de Leads / Prospectar). */
function RedirectTM({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role === 'tm') return <Navigate to="/tm" replace />;
  return <>{children}</>;
}

/** Protege a rota /tm: acessível a TM e admin (dashboard e gerenciamento já estão liberados ao admin). */
function TMRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== 'tm' && role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppUpdateWatcher />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppHeader />
                  <Routes>
                    <Route path="/" element={<RedirectTM><DailyReportGate><Index /></DailyReportGate></RedirectTM>} />
                    <Route path="/prospectar" element={<RedirectTM><DailyReportGate><Prospecting /></DailyReportGate></RedirectTM>} />
                    <Route
                      path="/tm"
                      element={
                        <TMRoute>
                          <DashboardTM />
                        </TMRoute>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        <AdminRoute>
                          <DashboardAdmin />
                        </AdminRoute>
                      }
                    />
                    <Route
                      path="/documentos"
                      element={
                        <AdminRoute>
                          <Documents />
                        </AdminRoute>
                      }
                    />
                    <Route path="/perfil" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
