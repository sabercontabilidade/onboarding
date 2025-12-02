import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/auth-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppLayout } from "@/components/layout/app-layout";
import { LoginPage } from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import { Dashboard } from "@/pages/dashboard";
import { ClientesPage } from "@/pages/clientes";
import { NovoClientePage } from "@/pages/clientes/novo";
import { ClienteDetalhePage } from "@/pages/clientes/[id]";
import { ClienteVisitasPage } from "@/pages/clientes/visitas/[id]";
import { EditarClientePage } from "@/pages/clientes/editar/[id]";
import { ClienteAgendamentosPage } from "@/pages/cliente-agendamentos/[id]";
import { ConfiguracoesPage } from "@/pages/configuracoes";
import { AgendamentosPage } from "@/pages/agendamentos";
import { VisitasPage } from "@/pages/visitas";
import { OnboardingPage } from "@/pages/onboarding";
import { AuditoriaPage } from "@/pages/auditoria";
import { UsuariosPage } from "@/pages/usuarios";
import RelatoriosPage from "@/pages/relatorios";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <TooltipProvider>
          <Switch>
            <Route path="/login"><LoginPage /></Route>
            <Route path="/forgot-password"><ForgotPasswordPage /></Route>
            <Route path="/reset-password"><ResetPasswordPage /></Route>
            <Route>
              <ProtectedRoute>
                <AppLayout>
                  <Switch>
                    <Route path="/"><Dashboard /></Route>
                    <Route path="/clientes"><ClientesPage /></Route>
                    <Route path="/clientes/novo"><NovoClientePage /></Route>
                    <Route path="/clientes/:id">{(params) => <ClienteDetalhePage {...params} />}</Route>
                    <Route path="/clientes/:id/visitas">{(params) => <ClienteVisitasPage {...params} />}</Route>
                    <Route path="/clientes/:id/editar">{(params) => <EditarClientePage {...params} />}</Route>
                    <Route path="/cliente-agendamentos/:id">{(params) => <ClienteAgendamentosPage {...params} />}</Route>
                    <Route path="/onboarding"><OnboardingPage /></Route>
                    <Route path="/agendamentos"><AgendamentosPage /></Route>
                    <Route path="/visitas"><VisitasPage /></Route>
                    <Route path="/relatorios"><RelatoriosPage /></Route>
                    <Route path="/configuracoes"><ConfiguracoesPage /></Route>
                    <Route path="/auditoria">
                      <ProtectedRoute requireAdmin={true}>
                        <AuditoriaPage />
                      </ProtectedRoute>
                    </Route>
                    <Route path="/usuarios">
                      <ProtectedRoute requireAdmin={true}>
                        <UsuariosPage />
                      </ProtectedRoute>
                    </Route>
                    <Route>
                      <div className="text-center py-8">
                        <h2 className="text-2xl font-bold mb-2">Página não encontrada</h2>
                        <p className="text-muted-foreground">A página que você está procurando não existe.</p>
                      </div>
                    </Route>
                  </Switch>
                </AppLayout>
              </ProtectedRoute>
            </Route>
          </Switch>
          <Toaster />
          </TooltipProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
