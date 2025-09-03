import type { ClientWithDetails } from "@shared/schema";

interface OnboardingPipelineProps {
  clients: ClientWithDetails[];
}

export default function OnboardingPipeline({ clients }: OnboardingPipelineProps) {
  const getStatusColor = (stage?: string) => {
    switch (stage) {
      case "initial_meeting": return "chart-1";
      case "documentation": return "accent";
      case "review": return "chart-3";
      default: return "muted";
    }
  };

  const getStatusLabel = (stage?: string) => {
    switch (stage) {
      case "initial_meeting": return "Reunião Inicial";
      case "documentation": return "Documentação";
      case "review": return "Revisão Final";
      default: return "Pendente";
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-card border border-border rounded-lg" data-testid="onboarding-pipeline">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Pipeline de Onboarding</h2>
          <button className="text-primary hover:text-primary/80 transition-colors" data-testid="button-expand-pipeline">
            <i className="fas fa-external-link-alt w-4 h-4"></i>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {clients.length === 0 ? (
            <div className="text-center text-muted-foreground py-8" data-testid="empty-onboarding">
              Nenhum cliente em onboarding no momento
            </div>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border" data-testid={`onboarding-client-${client.id}`}>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm" data-testid={`client-initials-${client.id}`}>
                    {getInitials(client.companyName)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground" data-testid={`client-name-${client.id}`}>{client.companyName}</p>
                  <p className="text-sm text-muted-foreground" data-testid={`client-contact-${client.id}`}>{client.contactName} • {client.contactEmail}</p>
                </div>
                <div className="text-right">
                  <span className={`bg-${getStatusColor(client.currentStage?.stage)}/10 text-${getStatusColor(client.currentStage?.stage)} px-3 py-1 rounded-full text-xs font-medium`} data-testid={`client-status-${client.id}`}>
                    {getStatusLabel(client.currentStage?.stage)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1" data-testid={`client-next-action-${client.id}`}>
                    {client.nextAppointment 
                      ? `Próxima: ${new Date(client.nextAppointment.scheduledStart).toLocaleDateString('pt-BR')} ${new Date(client.nextAppointment.scheduledStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      : "Aguardando agendamento"
                    }
                  </p>
                </div>
                <button className="text-muted-foreground hover:text-foreground" data-testid={`button-client-details-${client.id}`}>
                  <i className="fas fa-chevron-right w-4 h-4"></i>
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6">
          <button className="w-full text-center text-primary hover:text-primary/80 transition-colors py-2" data-testid="button-view-all-onboarding">
            Ver todos os onboardings em andamento
          </button>
        </div>
      </div>
    </div>
  );
}
