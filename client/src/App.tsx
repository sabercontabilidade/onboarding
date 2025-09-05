import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { AppLayout } from "@/components/layout/app-layout";
import { Dashboard } from "@/pages/dashboard";
import { ClientesPage } from "@/pages/clientes";
import { NovoClientePage } from "@/pages/clientes/novo";
import { ClienteDetalhePage } from "@/pages/clientes/[id]";
import { ClienteVisitasPage } from "@/pages/clientes/visitas/[id]";
import { EditarClientePage } from "@/pages/clientes/editar/[id]";
import { ConfiguracoesPage } from "@/pages/configuracoes";
import { AgendamentosPage } from "@/pages/agendamentos";
import { VisitasPage } from "@/pages/visitas";
import { OnboardingPage } from "@/pages/onboarding";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/clientes" component={ClientesPage} />
            <Route path="/clientes/novo" component={NovoClientePage} />
            <Route path="/clientes/:id" component={ClienteDetalhePage} />
            <Route path="/clientes/:id/visitas" component={ClienteVisitasPage} />
            <Route path="/clientes/:id/editar" component={EditarClientePage} />
            <Route path="/onboarding" component={OnboardingPage} />
            <Route path="/agendamentos" component={AgendamentosPage} />
            <Route path="/visitas" component={VisitasPage} />
            <Route path="/configuracoes" component={ConfiguracoesPage} />
            <Route>
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold mb-2">Página não encontrada</h2>
                <p className="text-muted-foreground">A página que você está procurando não existe.</p>
              </div>
            </Route>
          </Switch>
        </AppLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
