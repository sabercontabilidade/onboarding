import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'wouter'
import { useState } from 'react'
import { 
  ArrowLeft, 
  Building, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const clientId = id || ''
  
  // Estado para controlar etapas concluídas (sincronizado com localStorage)
  const [completedStages, setCompletedStages] = useState<string[]>(() => {
    const savedStages = localStorage.getItem(`completedStages_${clientId}`)
    return savedStages ? JSON.parse(savedStages) : []
  })
  
  const { data: client, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: () => api.clients.get(clientId),
  })

  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments', clientId],
    queryFn: () => api.clients.appointments(clientId),
  })

  const { data: visits } = useQuery({
    queryKey: ['/api/visits', clientId],
    queryFn: () => api.clients.visits(clientId),
  })
  
  // Função para marcar/desmarcar etapa como concluída
  const toggleStageCompletion = (stageId: string) => {
    const newCompletedStages = completedStages.includes(stageId) 
      ? completedStages.filter(id => id !== stageId)
      : [...completedStages, stageId]
    
    setCompletedStages(newCompletedStages)
    // Persistir no localStorage para sincronizar com página de onboarding
    localStorage.setItem(`completedStages_${clientId}`, JSON.stringify(newCompletedStages))
    
    // Disparar evento personalizado para atualizar outras páginas
    window.dispatchEvent(new CustomEvent('localStorageChange'))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-2">Cliente não encontrado</h2>
        <p className="text-muted-foreground mb-4">O cliente que você está procurando não existe.</p>
        <Link href="/clientes">
          <Button>Voltar para Clientes</Button>
        </Link>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'onboarding': 'bg-blue-100 text-blue-700',
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-red-100 text-red-700',
      'pending': 'bg-gray-100 text-gray-700',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'onboarding': 'Onboarding',
      'active': 'Ativo',
      'inactive': 'Inativo',
      'pending': 'Pendente',
    }
    return labels[status as keyof typeof labels] || status
  }

  // Calcular etapas obrigatórias de follow-up
  const getFollowUpStages = () => {
    if (!client?.createdAt) return []
    
    const createdDate = dayjs(client.createdAt)
    const today = dayjs()
    
    const stages = [
      {
        id: 'inicial',
        title: 'Follow-up da Reunião Inicial',
        description: 'Follow-up pós-onboarding para garantir que tudo está funcionando bem',
        targetDate: createdDate.add(3, 'day'),
        isOverdue: today.isAfter(createdDate.add(3, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('inicial')
      },
      {
        id: 'd5',
        title: 'D+5: Verificação de Integração',
        description: 'Verificar se a integração dos sistemas está funcionando corretamente',
        targetDate: createdDate.add(5, 'day'),
        isOverdue: today.isAfter(createdDate.add(5, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('d5')
      },
      {
        id: 'd15',
        title: 'D+15: Reforçar Presença',
        description: 'Garantir bom atendimento e reforçar presença da empresa',
        targetDate: createdDate.add(15, 'day'),
        isOverdue: today.isAfter(createdDate.add(15, 'day')),
        priority: 'medium' as const,
        isCompleted: completedStages.includes('d15')
      },
      {
        id: 'd50',
        title: 'D+50: Avaliação do 1º Ciclo',
        description: 'Avaliar percepção do cliente sobre o 1º ciclo (DP e Fiscal)',
        targetDate: createdDate.add(50, 'day'),
        isOverdue: today.isAfter(createdDate.add(50, 'day')),
        priority: 'medium' as const,
        isCompleted: completedStages.includes('d50')
      },
      {
        id: 'd80',
        title: 'D+80: Prevenção de Churn',
        description: 'Reforçar presença, entender satisfação e prevenir churn',
        targetDate: createdDate.add(80, 'day'),
        isOverdue: today.isAfter(createdDate.add(80, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('d80')
      },
      {
        id: 'd100',
        title: 'D+100: Fim do Onboarding Técnico',
        description: 'Informar fim do onboarding técnico e apresentar novos responsáveis',
        targetDate: createdDate.add(100, 'day'),
        isOverdue: today.isAfter(createdDate.add(100, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('d100')
      },
      {
        id: 'd180',
        title: 'D+180: Avaliação de Satisfação',
        description: 'Medir grau de satisfação, receber sugestões e solicitar indicações',
        targetDate: createdDate.add(180, 'day'),
        isOverdue: today.isAfter(createdDate.add(180, 'day')),
        priority: 'medium' as const,
        isCompleted: completedStages.includes('d180')
      }
    ]
    
    return stages
  }

  const getPriorityColor = (priority: string, isOverdue: boolean, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-100 text-green-700 border-green-200'
    if (isOverdue) return 'bg-red-100 text-red-700 border-red-200'
    
    const colors = {
      'high': 'bg-orange-100 text-orange-700 border-orange-200',
      'medium': 'bg-blue-100 text-blue-700 border-blue-200',
      'low': 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[priority as keyof typeof colors] || colors.low
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{client.companyName}</h1>
            <Badge 
              variant="secondary" 
              className={getStatusColor(client.status)}
            >
              {getStatusLabel(client.status)}
            </Badge>
            {client.currentStage && (
              <Badge variant="outline">
                {client.currentStage.stage}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{client.cnpj}</span>
            <span>Cadastrado: {dayjs(client.createdAt).format('DD/MM/YYYY')}</span>
            {client.contactName && (
              <span>Contato: {client.contactName}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/onboarding">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Onboarding
            </Button>
          </Link>
          <Button asChild>
            <Link href={`/clientes/${client.id}/editar`}>
              <Settings className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="onboarding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="visitas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Visitas
          </TabsTrigger>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Dados & Canais
          </TabsTrigger>
        </TabsList>

        {/* Tab: Etapas Obrigatórias de Follow-up */}
        <TabsContent value="onboarding" className="space-y-6">
          <div className="grid gap-4">
            {getFollowUpStages().map((stage, index) => (
              <Card 
                key={stage.id} 
                className={`transition-all hover:shadow-md border-l-4 ${getPriorityColor(stage.priority, stage.isOverdue, stage.isCompleted)}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          stage.isCompleted 
                            ? 'bg-green-100 border-green-200'
                            : stage.isOverdue 
                              ? 'bg-red-100 border-red-200' 
                              : stage.priority === 'high' 
                                ? 'bg-orange-100 border-orange-200'
                                : 'bg-blue-100 border-blue-200'
                        } border-2`}>
                          {stage.isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          ) : stage.isOverdue ? (
                            <AlertCircle className="h-6 w-6 text-red-600" />
                          ) : stage.priority === 'high' ? (
                            <Star className="h-6 w-6 text-orange-600" />
                          ) : (
                            <Calendar className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{stage.title}</h3>
                          {stage.isCompleted ? (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                              Concluído
                            </Badge>
                          ) : stage.isOverdue ? (
                            <Badge variant="destructive" className="text-xs">
                              Atrasado
                            </Badge>
                          ) : !stage.isOverdue && dayjs().isAfter(stage.targetDate.subtract(7, 'day')) ? (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                              Próximo
                            </Badge>
                          ) : null}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {stage.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className={stage.isOverdue ? 'text-red-600 font-medium' : ''}>
                              Data prevista: {stage.targetDate.format('DD/MM/YYYY')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-muted-foreground">
                              {stage.targetDate.fromNow()}
                            </span>
                          </div>
                          
                          {stage.isOverdue && (
                            <div className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">
                                {Math.abs(dayjs().diff(stage.targetDate, 'day'))} dias em atraso
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleStageCompletion(stage.id)}
                        className={stage.isCompleted 
                          ? "text-gray-600 border-gray-200 hover:bg-gray-50"
                          : "text-green-600 border-green-200 hover:bg-green-50"
                        }
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {stage.isCompleted ? 'Desmarcar' : 'Marcar Concluído'}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Resumo das Etapas */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {getFollowUpStages().filter(s => s.isCompleted).length}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Concluídas</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {getFollowUpStages().filter(s => !s.isCompleted && s.isOverdue).length}
                  </div>
                  <div className="text-sm text-red-600 font-medium">Atrasadas</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {getFollowUpStages().filter(s => !s.isCompleted && !s.isOverdue).length}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Pendentes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Agendamentos */}
        <TabsContent value="agendamentos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments && appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{appointment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {dayjs(appointment.scheduledStart).format('DD/MM/YYYY - HH:mm')}
                          </p>
                          {appointment.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {appointment.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                        {appointment.status === 'completed' ? 'Realizado' : 
                         appointment.status === 'scheduled' ? 'Agendado' : 
                         appointment.status === 'cancelled' ? 'Cancelado' : appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Visitas (ATAs) */}
        <TabsContent value="visitas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visitas Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              {visits && visits.length > 0 ? (
                <div className="space-y-4">
                  {visits.map((visita: any) => (
                    <div key={visita.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{visita.tipo_visita}</h4>
                          <Badge variant="outline">
                            {dayjs(visita.data).format('DD/MM/YYYY')}
                          </Badge>
                        </div>
                        {visita.satisfacao && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{visita.satisfacao}/10</span>
                          </div>
                        )}
                      </div>
                      
                      {visita.participantes && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Participantes: {visita.participantes}
                        </p>
                      )}
                      
                      {visita.resumo && (
                        <p className="text-sm mb-3">{visita.resumo}</p>
                      )}
                      
                      {visita.decisoes && visita.decisoes.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-2">Decisões:</h5>
                          <ul className="space-y-1">
                            {visita.decisoes.map((decisao: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {decisao}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {visita.pendencias && visita.pendencias.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Pendências:</h5>
                          <ul className="space-y-1">
                            {visita.pendencias.map((pendencia: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                {pendencia}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma visita registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dados & Canais */}
        <TabsContent value="dados" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dados da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                  <p className="font-medium">{client.companyName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                  <p className="font-medium">{client.cnpj}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                  <p className="font-medium">{dayjs(client.createdAt).format('DD/MM/YYYY - HH:mm')}</p>
                </div>
                {client.sector && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Setor</label>
                    <p className="text-sm">{client.sector}</p>
                  </div>
                )}
                {client.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações</label>
                    <p className="text-sm">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contatos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contato Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">{client.contactName}</p>
                  <div className="flex flex-col gap-1 mt-2">
                    {client.contactEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>{client.contactEmail}</span>
                      </div>
                    )}
                    {client.contactPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>{client.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status e Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Status e Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status Atual</label>
                  <div className="mt-1">
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(client.status)}
                    >
                      {getStatusLabel(client.status)}
                    </Badge>
                  </div>
                </div>
                
                {client.currentStage && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Etapa Atual</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {client.currentStage.stage}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {client.lastActivity && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Última Atividade</label>
                    <p className="text-sm mt-1">{client.lastActivity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(client.lastActivity.createdAt).format('DD/MM/YYYY - HH:mm')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}