import { useQuery } from "@tanstack/react-query";
import type { ClientWithDetails } from "@shared/schema";
import dayjs from '@/lib/dayjs';

export default function ClientOverview() {
  const { data: clients, isLoading } = useQuery<ClientWithDetails[]>({
    queryKey: ["/api/clients"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "onboarding": return "chart-1";
      case "active": return "accent";
      case "review": return "chart-3";
      case "inactive": return "muted";
      default: return "muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "onboarding": return "Onboarding";
      case "active": return "Ativo";
      case "review": return "Revisão";
      case "inactive": return "Inativo";
      default: return status;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatLastActivity = (activity?: any) => {
    if (!activity) return { description: "Sem atividade", time: "" };
    
    const time = new Date(activity.createdAt);
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    let timeLabel = "";
    if (hours < 1) {
      timeLabel = "agora";
    } else if (hours < 24) {
      timeLabel = `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
    } else {
      timeLabel = `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
    }

    return {
      description: activity.type === "stage_completed" ? "Etapa concluída" : 
                  activity.type === "meeting_scheduled" ? "Reunião agendada" :
                  activity.type === "email_sent" ? "Email enviado" : "Atividade",
      time: timeLabel
    };
  };

  const formatNextAction = (appointment?: any) => {
    if (!appointment) return { description: "Sem próxima ação", time: "" };
    
    const date = new Date(appointment.scheduledStart);
    return {
      description: appointment.title,
      time: `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    };
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6">
          <div className="text-center text-muted-foreground">Carregando clientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg" data-testid="client-overview">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Visão Geral dos Clientes</h2>
          <div className="flex items-center gap-2">
            <select className="bg-input border border-border rounded-md px-3 py-1 text-sm text-foreground" data-testid="filter-status">
              <option>Todos os status</option>
              <option>Em onboarding</option>
              <option>Ativo</option>
              <option>Pendente</option>
            </select>
            <button className="text-muted-foreground hover:text-foreground" data-testid="button-filter">
              <i className="fas fa-filter w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Cliente</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Última Atividade</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Próxima Ação</th>
              <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Responsável</th>
              <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!clients || clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground" data-testid="empty-clients">
                  Nenhum cliente cadastrado
                </td>
              </tr>
            ) : (
              clients.slice(0, 5).map((client) => {
                const lastActivity = formatLastActivity(client.lastActivity);
                const nextAction = formatNextAction(client.nextAppointment);
                
                return (
                  <tr key={client.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`client-row-${client.id}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-medium text-xs" data-testid={`client-initials-${client.id}`}>
                            {getInitials(client.companyName)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`client-company-${client.id}`}>{client.companyName}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`client-cnpj-${client.id}`}>{client.cnpj}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`client-created-${client.id}`}>Cliente desde {dayjs(client.createdAt).format('DD/MM/YYYY')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`bg-${getStatusColor(client.status)}/10 text-${getStatusColor(client.status)} px-3 py-1 rounded-full text-xs font-medium`} data-testid={`client-status-${client.id}`}>
                        {getStatusLabel(client.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-foreground" data-testid={`client-last-activity-${client.id}`}>{lastActivity.description}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`client-last-activity-time-${client.id}`}>{lastActivity.time}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-foreground" data-testid={`client-next-action-${client.id}`}>{nextAction.description}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`client-next-action-time-${client.id}`}>{nextAction.time}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-secondary/10 rounded-full flex items-center justify-center">
                          <span className="text-secondary text-xs font-medium" data-testid={`assignee-initials-${client.id}`}>
                            {client.assignee ? getInitials(client.assignee.name) : "?"}
                          </span>
                        </div>
                        <span className="text-sm text-foreground" data-testid={`assignee-name-${client.id}`}>
                          {client.assignee?.name || "Não atribuído"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-muted-foreground hover:text-foreground" data-testid={`button-view-client-${client.id}`}>
                          <i className="fas fa-eye w-4 h-4"></i>
                        </button>
                        <button className="text-muted-foreground hover:text-foreground" data-testid={`button-edit-client-${client.id}`}>
                          <i className="fas fa-edit w-4 h-4"></i>
                        </button>
                        <button className="text-muted-foreground hover:text-foreground" data-testid={`button-schedule-client-${client.id}`}>
                          <i className="fas fa-calendar-plus w-4 h-4"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-6 border-t border-border">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground" data-testid="pagination-info">
            Mostrando {clients ? Math.min(clients.length, 5) : 0} de {clients?.length || 0} clientes
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50" disabled data-testid="button-previous">
              Anterior
            </button>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 bg-primary text-primary-foreground rounded text-sm" data-testid="button-page-1">1</button>
            </div>
            <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground" data-testid="button-next">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
