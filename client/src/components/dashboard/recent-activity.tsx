import type { ActivityWithDetails } from "@shared/schema";

interface RecentActivityProps {
  activities: ActivityWithDetails[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "client_created": return "fas fa-user-plus";
      case "stage_completed": return "fas fa-check";
      case "meeting_scheduled": return "fas fa-calendar-plus";
      case "email_sent": return "fas fa-envelope";
      default: return "fas fa-info-circle";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "client_created": return "chart-4";
      case "stage_completed": return "accent";
      case "meeting_scheduled": return "chart-1";
      case "email_sent": return "chart-2";
      default: return "muted";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minutos atrás`;
    } else if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
    } else {
      return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg" data-testid="recent-activity">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Atividades Recentes</h2>
          <button className="text-primary hover:text-primary/80 transition-colors text-sm" data-testid="button-view-all-activities">
            Ver todas
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8" data-testid="empty-activities">
            Nenhuma atividade recente
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3" data-testid={`activity-${activity.id}`}>
              <div className={`w-8 h-8 bg-${getActivityColor(activity.type)}/10 rounded-full flex items-center justify-center flex-shrink-0`}>
                <i className={`${getActivityIcon(activity.type)} text-${getActivityColor(activity.type)} w-4 h-4`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground" data-testid={`activity-description-${activity.id}`}>
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`activity-time-${activity.id}`}>
                  {formatTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
