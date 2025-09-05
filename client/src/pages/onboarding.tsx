import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'wouter'
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
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export function OnboardingPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  
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

  const getStageLabel = (stage: string) => {
    const labels = {
      'initial_meeting': 'Reunião Inicial',
      'documentation': 'Documentação',
      'review': 'Revisão',
      'completed': 'Concluído'
    }
    return labels[stage as keyof typeof labels] || stage
  }

  const getStageColor = (status: string) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-700',
      'in_progress': 'bg-blue-100 text-blue-700',
      'completed': 'bg-green-100 text-green-700',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding de Clientes</h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso de onboarding dos novos clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/clientes">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Ver Todos os Clientes
            </Button>
          </Link>
          <Link href="/clientes/novo">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Total em Onboarding</p>
                <p className="text-3xl font-bold text-gray-900">{onboardingClients.length}</p>
              </div>
              <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-gray-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50/30 rounded-full -translate-y-12 translate-x-12"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-3xl font-bold text-gray-900">{getOnboardingInProgress()}</p>
              </div>
              <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50/30 rounded-full -translate-y-12 translate-x-12"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Finalizados</p>
                <p className="text-3xl font-bold text-gray-900">{getOnboardingCompleted()}</p>
              </div>
              <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-gray-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50/30 rounded-full -translate-y-12 translate-x-12"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Em Revisão</p>
                <p className="text-3xl font-bold text-gray-900">
                  {onboardingClients.filter(c => c.currentStage?.stage === 'review').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50/30 rounded-full -translate-y-12 translate-x-12"></div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes em Onboarding */}
      {isLoading ? (
        <div className="grid gap-4">
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
        <div className="space-y-6">
          {onboardingClients.map((client: any) => (
            <Card 
              key={client.id} 
              className="group relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.01] border border-gray-100"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-gray-25/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardContent className="p-8 relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-6 flex-1">
                    {/* Avatar moderno */}
                    <div className="relative">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                        <Building className="h-8 w-8 text-gray-600" />
                      </div>
                      {/* Indicador de progresso no avatar */}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200">
                        <span className="text-xs font-bold text-gray-700">
                          {Math.round(getFollowUpProgress(client))}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                            {client.companyName}
                          </h3>
                          <div className="flex items-center gap-2">
                            {client.currentStage && (
                              <Badge 
                                variant="outline"
                                className="border-gray-200 text-gray-700 bg-gray-50 font-medium px-3 py-1"
                              >
                                {getStageLabel(client.currentStage.stage)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Section */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3 group-hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Progresso do Follow-up</span>
                          <span className="text-sm font-bold text-gray-800">
                            {Math.round(getFollowUpProgress(client))}%
                          </span>
                        </div>
                        <div className="relative">
                          <Progress 
                            value={getFollowUpProgress(client)} 
                            className="h-2 bg-gray-200 [&>div]:bg-gradient-to-r [&>div]:from-gray-600 [&>div]:to-gray-700"
                          />
                        </div>
                      </div>
                      
                      {/* Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100/70 transition-colors">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          <div>
                            <p className="text-xs text-gray-600 font-medium">Iniciado em</p>
                            <p className="text-sm font-semibold text-gray-800">
                              {dayjs(client.createdAt).format('DD/MM/YYYY')}
                            </p>
                          </div>
                        </div>
                        
                        {client.nextAppointment && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100/70 transition-colors">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="text-xs text-gray-600 font-medium">Próximo</p>
                              <p className="text-sm font-semibold text-gray-800">
                                {dayjs(client.nextAppointment.scheduledStart).format('DD/MM HH:mm')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {client.contactName && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100/70 transition-colors">
                            <Users className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="text-xs text-gray-600 font-medium">Contato</p>
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {client.contactName}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Link href={`/clientes/${client.id}`}>
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="ml-6 border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 group-hover:shadow-md transition-all duration-300"
                    >
                      <Eye className="h-5 w-5 text-gray-600" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100/20 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-125 transition-transform duration-500"></div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente em onboarding</h3>
            <p className="text-muted-foreground text-center mb-4">
              Todos os clientes já concluíram o processo de onboarding ou ainda não há clientes cadastrados.
            </p>
            <Link href="/clientes/novo">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Cadastrar Novo Cliente
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
