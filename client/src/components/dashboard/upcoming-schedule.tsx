import type { AppointmentWithDetails } from "@shared/schema";

interface UpcomingScheduleProps {
  appointments: AppointmentWithDetails[];
}

export default function UpcomingSchedule({ appointments }: UpcomingScheduleProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "meeting": return "fas fa-video";
      case "visit": return "fas fa-map-marker-alt";
      case "call": return "fas fa-phone";
      default: return "fas fa-calendar";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "meeting": return "accent";
      case "visit": return "chart-1";
      case "call": return "chart-2";
      default: return "muted";
    }
  };

  const formatDateTime = (dateTime: Date) => {
    const date = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateLabel = "";
    if (date.toDateString() === today.toDateString()) {
      dateLabel = "Hoje";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateLabel = "Amanhã";
    } else {
      dateLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    const timeLabel = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dateLabel}, ${timeLabel}`;
  };

  return (
    <div className="bg-card border border-border rounded-lg" data-testid="upcoming-schedule">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Próximos Agendamentos</h2>
      </div>
      
      <div className="p-6 space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8" data-testid="empty-schedule">
            Nenhum agendamento próximo
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors" data-testid={`appointment-${appointment.id}`}>
                <div className={`w-2 h-2 bg-${getTypeColor(appointment.type)} rounded-full mt-2 flex-shrink-0`}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm" data-testid={`appointment-title-${appointment.id}`}>
                    {appointment.title}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`appointment-time-${appointment.id}`}>
                    {formatDateTime(appointment.scheduledStart)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <i className={`${getTypeIcon(appointment.type)} text-muted-foreground w-3 h-3`}></i>
                    <span className="text-xs text-muted-foreground" data-testid={`appointment-location-${appointment.id}`}>
                      {appointment.type === "meeting" && appointment.meetingUrl && "Google Meet"}
                      {appointment.type === "visit" && appointment.location}
                      {appointment.type === "call" && "Ligação telefônica"}
                    </span>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground" data-testid={`button-join-${appointment.id}`}>
                  <i className={`${getTypeIcon(appointment.type)} w-3 h-3`}></i>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="pt-4 border-t border-border">
          <button className="w-full text-center text-primary hover:text-primary/80 transition-colors text-sm" data-testid="button-view-full-schedule">
            Ver agenda completa
          </button>
        </div>
      </div>
    </div>
  );
}
