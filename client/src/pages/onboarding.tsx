import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import {
  UserPlus,
  Clock,
  CheckCircle2,
  Users,
  RefreshCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ViewToggle, type ViewType } from '@/components/ui/view-toggle'
import { ClientCard } from '@/components/client-card'
import { KanbanView } from '@/components/kanban-view'
import { api } from '@/lib/api'

export function OnboardingPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentView, setCurrentView] = useState<ViewType>('list')
  const [, setLocation] = useLocation()

  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients', refreshKey],
    queryFn: () => api.clients.list(),
  })

  const onboardingClients = clients?.filter(client => client.status === 'onboarding') || []

  // Buscar estatísticas de onboarding da API
  const { data: onboardingStats } = useQuery({
    queryKey: ['/api/onboarding/stats'],
    queryFn: () => api.onboarding.stats(),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Onboarding de Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o progresso de onboarding dos novos clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle
            currentView={currentView}
            onViewChange={setCurrentView}
          />
          <Button
            variant="outline"
            onClick={() => setLocation('/clientes')}
            className="hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]"
          >
            <Users className="mr-2 h-4 w-4" />
            Ver Todos os Clientes
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="saber-card p-6 animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total em Onboarding</p>
              <p className="text-2xl font-bold text-foreground mt-1">{onboardingClients.length}</p>
            </div>
            <div className="w-12 h-12 bg-[#EA610B] rounded-xl flex items-center justify-center shadow-sm">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="saber-card p-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
              <p className="text-2xl font-bold text-foreground mt-1">{onboardingStats?.inProgress || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="saber-card p-6 animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Finalizados</p>
              <p className="text-2xl font-bold text-foreground mt-1">{onboardingStats?.completed || 0}</p>
            </div>
            <div className="w-12 h-12 bg-saber-success rounded-xl flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="saber-card p-6 animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Revisão</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {onboardingClients.filter(c => c.currentStage?.stage === 'review').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-sm">
              <RefreshCcw className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Clientes em Onboarding */}
      {isLoading ? (
        <div className={currentView === 'kanban' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' : 'grid gap-4'}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="saber-card p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : onboardingClients.length > 0 ? (
        <div data-testid="onboarding-clients-content">
          {currentView === 'list' ? (
            <div className="space-y-4" data-testid="list-view">
              {onboardingClients.map((client: any) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  showProgress={true}
                />
              ))}
            </div>
          ) : (
            <KanbanView
              clients={onboardingClients}
              showProgress={true}
            />
          )}
        </div>
      ) : (
        <Card className="saber-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-[#EA610B]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cliente em onboarding</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Todos os clientes já concluíram o processo de onboarding ou ainda não há clientes cadastrados.
            </p>
            <Button
              onClick={() => setLocation('/clientes')}
              className="bg-[#EA610B] hover:bg-orange-600 text-white shadow-sm"
            >
              <Users className="mr-2 h-4 w-4" />
              Ver Todos os Clientes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
