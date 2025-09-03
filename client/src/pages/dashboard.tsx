import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Calendar, 
  AlertCircle, 
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
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const resumo = metrics?.resumo || {}
  const hoje = metrics?.hoje || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do relacionamento com clientes
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Clientes"
          value={resumo.total_clientes || 0}
          description="Clientes cadastrados"
          icon={<Users />}
        />
        
        <StatsCard
          title="Clientes Ativos"
          value={resumo.clientes_ativos || 0}
          description="Em processo de onboarding"
          icon={<TrendingUp />}
        />
        
        <StatsCard
          title="Reuniões Hoje"
          value={hoje.reunioes_hoje || 0}
          description="Agendamentos para hoje"
          icon={<Calendar />}
        />
        
        <StatsCard
          title="Satisfação Média"
          value={resumo.satisfacao_media ? `${resumo.satisfacao_media}/10` : 'N/A'}
          description="Últimas visitas"
          icon={<Star />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Próximos Contatos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
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
            ) : upcomingContacts?.length > 0 ? (
              <div className="space-y-4">
                {upcomingContacts.slice(0, 5).map((agendamento: any) => (
                  <div key={agendamento.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{agendamento.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {dayjs(agendamento.data_agendada).format('DD/MM - HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline">{agendamento.tipo}</Badge>
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

        {/* Visitas Atrasadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
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
            ) : overdueAppointments?.length > 0 ? (
              <div className="space-y-4">
                {overdueAppointments.slice(0, 5).map((agendamento: any) => (
                  <div key={agendamento.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <div>
                      <p className="font-medium">{agendamento.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        Atrasado {dayjs(agendamento.data_agendada).fromNow()}
                      </p>
                    </div>
                    <Badge variant="destructive">Atrasado</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Visitas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentVisits.slice(0, 3).map((visita: any) => (
                <div key={visita.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{visita.cliente?.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {dayjs(visita.data).format('DD/MM/YYYY')} - {visita.tipo_visita}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{visita.satisfacao}/10</span>
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
