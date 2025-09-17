import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRoute } from 'wouter'
import { 
  Calendar, 
  Clock, 
  Users, 
  ArrowLeft,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Link } from 'wouter'
import { api } from '@/lib/api'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import dayjs from '@/lib/dayjs'

export function ClienteAgendamentosPage() {
  const [, params] = useRoute('/cliente-agendamentos/:id')
  const clientId = params?.id
  const { toast } = useToast()
  const [selectedStage, setSelectedStage] = useState<any>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: () => clientId ? api.clients.get(clientId) : null,
    enabled: !!clientId,
  })

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['/api/clients', clientId, 'appointments'],
    queryFn: () => clientId ? api.clients.appointments(clientId) : null,
    enabled: !!clientId,
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'rescheduled':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-700',
      'scheduled': 'bg-blue-100 text-blue-700',
      'cancelled': 'bg-red-100 text-red-700',
      'rescheduled': 'bg-yellow-100 text-yellow-700',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'completed': 'Realizado',
      'scheduled': 'Agendado', 
      'cancelled': 'Cancelado',
      'rescheduled': 'Reagendado',
    }
    return labels[status as keyof typeof labels] || status
  }

  // Etapas do onboarding com suas respectivas datas
  const onboardingStages = [
    { id: 'plano_sucesso', name: 'Plano de Sucesso do Cliente', days: 0 },
    { id: 'followup_d3', name: 'Follow-up D+3', days: 3 },
    { id: 'followup_d5', name: 'Follow-up D+5', days: 5 },
    { id: 'followup_d15', name: 'Follow-up D+15', days: 15 },
    { id: 'followup_d50', name: 'Follow-up D+50', days: 50 },
    { id: 'followup_d80', name: 'Follow-up D+80', days: 80 },
    { id: 'followup_d100', name: 'Follow-up D+100', days: 100 },
    { id: 'followup_d180', name: 'Follow-up D+180', days: 180 },
  ]

  const getExpectedDate = (stage: any) => {
    if (!client?.createdAt) return null
    const clientCreatedDate = dayjs(client.createdAt)
    return clientCreatedDate.add(stage.days, 'day')
  }

  const getStageStatus = (stage: any) => {
    const expectedDate = getExpectedDate(stage)
    if (!expectedDate) return 'pending'
    
    const relatedAppointment = appointments?.find((apt: any) => 
      apt.title.toLowerCase().includes(stage.name.toLowerCase()) ||
      apt.description?.toLowerCase().includes(stage.name.toLowerCase())
    )

    if (relatedAppointment) {
      return relatedAppointment.status
    }

    // Se passou da data esperada e não tem agendamento, está atrasado
    if (expectedDate.isBefore(dayjs(), 'day')) {
      return 'overdue'
    }

    return 'pending'
  }

  const handleScheduleStage = async (stage: any) => {
    setSelectedStage(stage)
    setLoadingSlots(true)
    setShowScheduleModal(true)
    
    try {
      // TODO: Obter o user_id do responsável atual (por enquanto usando 1)
      const userId = 1
      const response = await fetch(`/api/v1/agendamentos/disponibilidade/${userId}?days_ahead=14`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erro ao consultar disponibilidade')
      }
      
      const data = await response.json()
      setAvailableSlots(data.available_slots || [])
      
      if (data.available_slots?.length === 0) {
        toast({
          title: "Nenhum horário disponível",
          description: "Não há horários disponíveis no período consultado. Verifique a configuração do Google Calendar.",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Erro ao consultar disponibilidade:', error)
      toast({
        title: "Erro ao consultar disponibilidade",
        description: error.message || "Não foi possível consultar os horários disponíveis.",
        variant: "destructive"
      })
      setShowScheduleModal(false)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleConfirmSchedule = async (slot: any) => {
    if (!selectedStage || !slot) return
    
    try {
      // Create appointment via API
      const appointmentData = {
        clientId: clientId,
        title: selectedStage.name,
        description: `Reunião de onboarding: ${selectedStage.name}`,
        scheduledStart: slot.start,
        scheduledEnd: slot.end,
        type: 'onboarding',
        status: 'scheduled'
      }

      await apiRequest('POST', '/api/appointments', appointmentData)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'appointments'] })
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] })
      
      toast({
        title: "Agendamento criado",
        description: `${selectedStage.name} agendado para ${slot.display}`,
      })
      setShowScheduleModal(false)
      setSelectedStage(null)
    } catch (error: any) {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Não foi possível criar o agendamento.",
        variant: "destructive"
      })
    }
  }

  if (isLoadingClient || isLoadingAppointments) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!client) {
    return <div>Cliente não encontrado</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/agendamentos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agendamentos do Cliente</h1>
            <p className="text-muted-foreground">
              {client.companyName}
            </p>
          </div>
        </div>
      </div>

      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-900">{client.companyName}</span>
            </div>
            
            {client.cnpj && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">CNPJ:</span>
                <span>{client.cnpj}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Cliente cadastrado em {dayjs(client.createdAt).format('DD/MM/YYYY')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="etapas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="etapas">Etapas do Onboarding</TabsTrigger>
          <TabsTrigger value="agendamentos">Todos os Agendamentos</TabsTrigger>
        </TabsList>

        {/* Tab: Etapas do Onboarding */}
        <TabsContent value="etapas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cronograma do Onboarding</CardTitle>
              <p className="text-sm text-muted-foreground">
                Acompanhe o progresso das etapas obrigatórias do processo de onboarding
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingStages.map((stage, index) => {
                  const expectedDate = getExpectedDate(stage)
                  const status = getStageStatus(stage)
                  const relatedAppointment = appointments?.find((apt: any) => 
                    apt.title.toLowerCase().includes(stage.name.toLowerCase()) ||
                    apt.description?.toLowerCase().includes(stage.name.toLowerCase())
                  )

                  return (
                    <div key={stage.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-medium text-primary">
                          {index + 1}
                        </div>
                        
                        <div>
                          <h4 className="font-medium">{stage.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {expectedDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Previsto: {expectedDate.format('DD/MM/YYYY')}</span>
                              </div>
                            )}
                            
                            {relatedAppointment && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Agendado: {dayjs(relatedAppointment.scheduledStart).format('DD/MM/YYYY HH:mm')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {status === 'completed' && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Concluído
                          </Badge>
                        )}
                        {status === 'scheduled' && (
                          <Badge className="bg-blue-100 text-blue-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Agendado
                          </Badge>
                        )}
                        {status === 'overdue' && (
                          <>
                            <Badge className="bg-red-100 text-red-700">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Atrasado
                            </Badge>
                            <Button 
                              size="sm" 
                              onClick={() => handleScheduleStage(stage)}
                              data-testid={`button-schedule-${stage.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Agendar
                            </Button>
                          </>
                        )}
                        {status === 'pending' && (
                          <>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleScheduleStage(stage)}
                              data-testid={`button-schedule-${stage.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Agendar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Todos os Agendamentos */}
        <TabsContent value="agendamentos" className="space-y-4">
          {appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appointment: any) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{appointment.title}</h3>
                            <Badge 
                              variant="secondary" 
                              className={getStatusColor(appointment.status)}
                            >
                              {getStatusIcon(appointment.status)}
                              <span className="ml-1">{getStatusLabel(appointment.status)}</span>
                            </Badge>
                            <Badge variant="outline">{appointment.type}</Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{dayjs(appointment.scheduledStart).format('DD/MM/YYYY - HH:mm')}</span>
                            </div>
                            
                            {appointment.assignee && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{appointment.assignee.name}</span>
                              </div>
                            )}
                          </div>
                          
                          {appointment.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {appointment.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {dayjs(appointment.scheduledStart).isBefore(dayjs()) && 
                         appointment.status === 'scheduled' && (
                          <Badge variant="destructive" className="text-xs">
                            Atrasado
                          </Badge>
                        )}
                        
                        {dayjs(appointment.scheduledStart).isSame(dayjs(), 'day') && (
                          <Badge className="text-xs bg-blue-500">
                            Hoje
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-muted-foreground text-center">
                  Este cliente ainda não possui agendamentos cadastrados.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Agendamento */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Agendar {selectedStage?.name}</DialogTitle>
            <DialogDescription>
              Selecione um horário disponível dentro do horário comercial (8h às 18h)
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse space-y-4 w-full">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="space-y-2">
                {availableSlots.map((slot, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleConfirmSchedule(slot)}
                    data-testid={`slot-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{slot.display}</p>
                            <p className="text-sm text-muted-foreground">
                              Duração: 1 hora
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Selecionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum horário disponível</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Não há horários disponíveis no momento. Isso pode indicar que:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>As credenciais do Google Calendar não estão configuradas</li>
                  <li>Todos os horários comerciais estão ocupados</li>
                  <li>Há um problema na conexão com o Google Calendar</li>
                </ul>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}