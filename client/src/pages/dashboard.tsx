import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Calendar,
  AlertCircle,
  FileText,
  Star,
  Clock,
  CheckCircle2,
  TrendingUp
} from 'lucide-react'
import { StatsCard } from '@/components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export function Dashboard() {
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['/api/relacionamento/metricas'],
    queryFn: () => api.dashboard.metrics(),
  })

  const { data: upcomingContacts, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['/api/relacionamento/proximos-contatos'],
    queryFn: () => api.dashboard.upcomingContacts(),
  })

  const { data: overdueAppointments, isLoading: loadingOverdue } = useQuery({
    queryKey: ['/api/relacionamento/agendamentos-atrasados'],
    queryFn: () => api.dashboard.overdueAppointments(),
  })

  const { data: recentVisits, isLoading: loadingVisits } = useQuery({
    queryKey: ['/api/relacionamento/visitas-recentes'],
    queryFn: () => api.dashboard.recentVisits(),
  })

  if (loadingMetrics) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="saber-card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const resumo = metrics?.resumo || {}
  const hoje = metrics?.hoje || {}

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do relacionamento com clientes
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Clientes"
          value={resumo.total_clientes || 0}
          description="Clientes cadastrados"
          icon={Users}
          iconColor="bg-[#EA610B]"
        />

        <StatsCard
          title="Clientes Ativos"
          value={resumo.clientes_ativos || 0}
          description="Em processo de onboarding"
          icon={TrendingUp}
          iconColor="bg-saber-success"
        />

        <StatsCard
          title="Reuniões Hoje"
          value={hoje.reunioes_hoje || 0}
          description="Agendamentos para hoje"
          icon={Calendar}
          iconColor="bg-blue-500"
        />

        <StatsCard
          title="Atas Salvas"
          value={resumo.total_atas_salvas || 0}
          description="Total de atas técnicas"
          icon={FileText}
          iconColor="bg-purple-500"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Próximos Contatos */}
        <Card className="saber-card animate-scale-in">
          <CardHeader className="saber-card-header">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              Próximos Contatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUpcoming ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : upcomingContacts && upcomingContacts.length > 0 ? (
              <div className="space-y-3">
                {upcomingContacts.slice(0, 5).map((agendamento: any) => (
                  <div key={agendamento.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{agendamento.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {dayjs(agendamento.data_agendada).format('DD/MM - HH:mm')}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{agendamento.tipo}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum contato agendado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Agendamentos Atrasados */}
        <Card className="saber-card animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="saber-card-header">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-[#EA610B]" />
              </div>
              Agendamentos Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOverdue ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : overdueAppointments && overdueAppointments.length > 0 ? (
              <div className="space-y-3">
                {overdueAppointments.slice(0, 5).map((agendamento: any) => (
                  <div key={agendamento.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <div>
                      <p className="font-medium text-foreground">{agendamento.titulo}</p>
                      <p className="text-sm text-orange-600">
                        Atrasado {dayjs(agendamento.data_agendada).fromNow()}
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Atrasado</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-muted-foreground">
                  Nenhum agendamento atrasado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visitas Recentes */}
      {recentVisits && recentVisits.length > 0 && (
        <Card className="saber-card animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="saber-card-header">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              Visitas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentVisits.slice(0, 3).map((visita: any) => (
                <div key={visita.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{visita.cliente?.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {dayjs(visita.data).format('DD/MM/YYYY')} - {visita.tipo_visita}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-lg">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-yellow-700">{visita.satisfacao}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
