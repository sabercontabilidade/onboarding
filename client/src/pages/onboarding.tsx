import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'wouter'
import { 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Building,
  Calendar,
  FileText,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ViewToggle, type ViewType } from '@/components/ui/view-toggle'
import { ClientCard } from '@/components/client-card'
import { KanbanView } from '@/components/kanban-view'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export function OnboardingPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentView, setCurrentView] = useState<ViewType>('list')
  const [, setLocation] = useLocation()
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients', refreshKey],
    queryFn: () => api.clients.list(),
  })

  const onboardingClients = clients?.filter(client => client.status === 'onboarding') || []
  
  // Detectar mudanças no localStorage para atualizar progresso
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1)
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Também escutar mudanças personalizadas no localStorage
    window.addEventListener('localStorageChange', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageChange', handleStorageChange)
    }
  }, [])

  const getFollowUpProgress = (client: any) => {
    // Buscar etapas concluídas do localStorage
    const followUpStages = ['plano_sucesso', 'inicial', 'd5', 'd15', 'd50', 'd80', 'd100', 'd180']
    const completedStagesKey = `completedStages_${client.id}`
    const completedStagesStr = localStorage.getItem(completedStagesKey) || '[]'
    const completedStages = JSON.parse(completedStagesStr)
    const completedStagesCount = completedStages.length
    
    return (completedStagesCount / followUpStages.length) * 100
  }

  const getOnboardingInProgress = () => {
    return onboardingClients.filter(client => getFollowUpProgress(client) < 100).length
  }

  const getOnboardingCompleted = () => {
    return onboardingClients.filter(client => getFollowUpProgress(client) === 100).length
  }

  // Estas funções foram movidas para o ClientCard component

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding de Clientes</h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso de onboarding dos novos clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle
            currentView={currentView}
            onViewChange={setCurrentView}
          />
          <Button variant="outline" onClick={() => setLocation('/clientes')}>
            <Users className="mr-2 h-4 w-4" />
            Ver Todos os Clientes
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total em Onboarding</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{onboardingClients.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Onboarding em Andamento</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {getOnboardingInProgress()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Onboarding Finalizados</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {getOnboardingCompleted()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Revisão</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {onboardingClients.filter(c => c.currentStage?.stage === 'review').length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes em Onboarding */}
      {isLoading ? (
        <div className={currentView === 'kanban' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' : 'grid gap-4'}>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente em onboarding</h3>
            <p className="text-muted-foreground text-center mb-4">
              Todos os clientes já concluíram o processo de onboarding ou ainda não há clientes cadastrados.
            </p>
            <Button variant="outline" onClick={() => setLocation('/clientes')}>
              <Users className="mr-2 h-4 w-4" />
              Ver Todos os Clientes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
