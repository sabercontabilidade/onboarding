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
  const clientId = parseInt(id || '0')
  
  const { data: client, isLoading } = useQuery({
    queryKey: ['/api/clientes', clientId],
    queryFn: () => api.clients.get(clientId),
  })

  const { data: contacts } = useQuery({
    queryKey: ['/api/clientes', clientId, 'contatos'],
    queryFn: () => api.clients.contacts(clientId),
  })

  const { data: appointments } = useQuery({
    queryKey: ['/api/clientes', clientId, 'agendamentos'],
    queryFn: () => api.clients.appointments(clientId),
  })

  const { data: visits } = useQuery({
    queryKey: ['/api/clientes', clientId, 'visitas'],
    queryFn: () => api.clients.visits(clientId),
  })

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
      'INICIADO': 'bg-blue-100 text-blue-700',
      'EM_ANDAMENTO': 'bg-yellow-100 text-yellow-700',
      'CONCLUIDO': 'bg-green-100 text-green-700',
      'SUSPENSO': 'bg-red-100 text-red-700',
      'PENDENTE': 'bg-gray-100 text-gray-700',
      'ATIVO': 'bg-green-100 text-green-700',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
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
            <h1 className="text-3xl font-bold tracking-tight">{client.nome}</h1>
            <Badge 
              variant="secondary" 
              className={getStatusColor(client.status_onboarding)}
            >
              {client.status_onboarding}
            </Badge>
            <Badge variant="outline">
              {client.status_relacionamento}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{client.cnpj}</span>
            {client.data_inicio_contrato && (
              <span>Início: {dayjs(client.data_inicio_contrato).format('DD/MM/YYYY')}</span>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/clientes/${client.id}/editar`}>
            <Settings className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
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

        {/* Tab: Timeline de Onboarding */}
        <TabsContent value="onboarding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Contatos</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts && contacts.length > 0 ? (
                <div className="space-y-4">
                  {contacts.map((contato: any) => (
                    <div key={contato.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        contato.status === 'REALIZADO' ? 'bg-green-100' : 
                        contato.status === 'AGENDADO' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {contato.status === 'REALIZADO' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : contato.status === 'AGENDADO' ? (
                          <Clock className="h-5 w-5 text-blue-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{contato.tipo}</h4>
                          <Badge variant={contato.status === 'REALIZADO' ? 'default' : 'secondary'}>
                            {contato.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {contato.descricao}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {contato.data_prevista && (
                            <span>Previsto: {dayjs(contato.data_prevista).format('DD/MM/YYYY')}</span>
                          )}
                          {contato.data_realizado && (
                            <span>Realizado: {dayjs(contato.data_realizado).format('DD/MM/YYYY')}</span>
                          )}
                        </div>
                        {contato.observacoes && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            {contato.observacoes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum contato registrado
                </p>
              )}
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
                  {appointments.map((agendamento: any) => (
                    <div key={agendamento.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{agendamento.titulo}</p>
                          <p className="text-sm text-muted-foreground">
                            {dayjs(agendamento.data_agendada).format('DD/MM/YYYY - HH:mm')}
                          </p>
                          {agendamento.descricao && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {agendamento.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={agendamento.status === 'REALIZADO' ? 'default' : 'secondary'}>
                        {agendamento.status}
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
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="font-medium">{client.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                  <p className="font-medium">{client.cnpj}</p>
                </div>
                {client.data_inicio_contrato && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Início do Contrato</label>
                    <p className="font-medium">{dayjs(client.data_inicio_contrato).format('DD/MM/YYYY')}</p>
                  </div>
                )}
                {client.observacoes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações</label>
                    <p className="text-sm">{client.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contatos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contatos da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.contatos_empresa && client.contatos_empresa.length > 0 ? (
                  <div className="space-y-4">
                    {client.contatos_empresa.map((contato: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="font-medium">{contato.nome}</p>
                        {contato.cargo && (
                          <p className="text-sm text-muted-foreground">{contato.cargo}</p>
                        )}
                        <div className="flex flex-col gap-1 mt-2">
                          {contato.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4" />
                              <span>{contato.email}</span>
                            </div>
                          )}
                          {contato.telefone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4" />
                              <span>{contato.telefone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum contato cadastrado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Canais de Comunicação */}
            <Card>
              <CardHeader>
                <CardTitle>Canais de Comunicação</CardTitle>
              </CardHeader>
              <CardContent>
                {client.canais && client.canais.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {client.canais.map((canal: string) => (
                      <Badge key={canal} variant="outline">
                        {canal}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum canal configurado
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}