interface MetricsGridProps {
  activeClients: number;
  onboardingClients: number;
  todayMeetings: number;
  scheduledVisits: number;
}

export default function MetricsGrid({
  activeClients,
  onboardingClients,
  todayMeetings,
  scheduledVisits
}: MetricsGridProps) {
  const metrics = [
    {
      label: "Clientes Ativos",
      value: activeClients,
      icon: "fas fa-users",
      color: "accent",
      change: "+12%",
      period: "este mês"
    },
    {
      label: "Em Onboarding", 
      value: onboardingClients,
      icon: "fas fa-user-plus",
      color: "chart-1",
      change: `+${onboardingClients > 0 ? 1 : 0}`,
      period: "esta semana"
    },
    {
      label: "Reuniões Hoje",
      value: todayMeetings,
      icon: "fas fa-calendar-check", 
      color: "chart-2",
      change: null,
      period: "2 pendentes"
    },
    {
      label: "Visitas Agendadas",
      value: scheduledVisits,
      icon: "fas fa-map-marker-alt",
      color: "chart-4", 
      change: "3",
      period: "próximos 7 dias"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="metrics-grid">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-card border border-border rounded-lg p-6" data-testid={`metric-card-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm" data-testid={`metric-label-${index}`}>{metric.label}</p>
              <p className="text-2xl font-semibold text-foreground mt-1" data-testid={`metric-value-${index}`}>{metric.value}</p>
            </div>
            <div className={`w-10 h-10 bg-${metric.color}/10 rounded-lg flex items-center justify-center`}>
              <i className={`${metric.icon} text-${metric.color} w-5 h-5`}></i>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4">
            {metric.change && (
              <span className={`text-${metric.color} text-sm`} data-testid={`metric-change-${index}`}>{metric.change}</span>
            )}
            <span className="text-muted-foreground text-sm" data-testid={`metric-period-${index}`}>{metric.period}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
