import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  Star,
  CheckCircle2,
  AlertCircle,
  Filter,
  Building,
  Clock,
  Eye,
  UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'
import { Link } from 'wouter'

export function VisitasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Buscar clientes da API
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => api.clients.list(),
  })

  const allClients = clients || []
  
  // Função para calcular progresso do follow-up
  const getFollowUpProgress = (client: any) => {
    const followUpStages = ['inicial', 'd5', 'd15', 'd50', 'd80', 'd100', 'd180']
    const completedStagesKey = `completedStages_${client.id}`
    const completedStagesStr = localStorage.getItem(completedStagesKey) || '[]'
    const completedStages = JSON.parse(completedStagesStr)
    const completedStagesCount = completedStages.length
    
    return (completedStagesCount / followUpStages.length) * 100
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
      'in_progress': 'bg-orange-100 text-orange-700',
      'completed': 'bg-orange-50 text-orange-600',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  // Mock data para visitas - em uma aplicação real, isso viria da API
  const mockVisitas = [
    {
      id: 1,
      cliente: { nome: 'Empresa ABC Ltda', id: 1 },
      tipo_visita: 'Implementação',
      data: '2024-01-15',
      participantes: 'João Silva, Maria Santos',
      resumo: 'Reunião para definir cronograma de implementação do novo sistema contábil.',
      satisfacao: 9,
      decisoes: [
        'Aprovado cronograma de 3 meses para implementação',
        'Definido treinamento da equipe para março'
      ],
      pendencias: [
        'Enviar documentação técnica',
        'Agendar próxima reunião'
      ]
    },
    {
      id: 2,
      cliente: { nome: 'Tech Solutions LTDA', id: 2 },
      tipo_visita: 'Follow-up',
      data: '2024-01-10',
      participantes: 'Ana Costa, Pedro Lima',
      resumo: 'Acompanhamento do progresso da migração de dados.',
      satisfacao: 8,
      decisoes: [
        'Migração 80% concluída',
        'Ajustes nos relatórios personalizados'
      ],
      pendencias: [
        'Finalizar migração até fim do mês',
        'Validar relatórios com equipe cliente'
      ]
    }
  ]

  const filteredVisitas = mockVisitas.filter((visita: any) => {
    if (searchTerm && !visita.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !visita.tipo_visita.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (typeFilter && typeFilter !== 'all' && visita.tipo_visita !== typeFilter) {
      return false
    }
    return true
  })

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visitas Técnicas</h1>
          <p className="text-muted-foreground">
            Acompanhe as ATAs e resultados das visitas realizadas
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova ATA
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou tipo de visita..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Implementação">Implementação</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
                <SelectItem value="Treinamento">Treinamento</SelectItem>
                <SelectItem value="Suporte">Suporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas dos Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{allClients.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Em Onboarding</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {allClients.filter(c => c.status === 'onboarding').length}
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
                <p className="text-sm font-medium text-muted-foreground">Ativos</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">
                    {allClients.filter(c => c.status === 'active').length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">ATAs Realizadas</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{filteredVisitas.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      {isLoadingClients ? (
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
      ) : allClients.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Clientes</h2>
          {allClients.map((client: any) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{client.companyName}</h3>
                        <Badge 
                          variant="secondary" 
                          className={client.status === 'active' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}
                        >
                          {client.status === 'active' ? 'Ativo' : client.status === 'onboarding' ? 'Onboarding' : client.status}
                        </Badge>
                      </div>
                      
                      {/* Progresso */}
                      <div className="mb-4 pr-8">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progresso do Follow-up</span>
                          <span className="ml-2">{Math.round(getFollowUpProgress(client))}%</span>
                        </div>
                        <Progress value={getFollowUpProgress(client)} className="h-1.5 w-full max-w-md" />
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Cadastrado em {dayjs(client.createdAt).format('DD/MM/YYYY')}</span>
                        </div>
                        
                        {client.contactName && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{client.contactName}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <span>CNPJ: {client.cnpj}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Link href={`/clientes/${client.id}/visitas`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece cadastrando seus clientes para acompanhar as visitas técnicas.
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

      {/* Lista de Visitas */}
      {filteredVisitas.length > 0 ? (
        <div className="grid gap-6">
          {filteredVisitas.map((visita: any) => (
            <Card key={visita.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{visita.cliente.nome}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{visita.tipo_visita}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {dayjs(visita.data).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getStarRating(visita.satisfacao)}
                    </div>
                    <span className="font-medium">{visita.satisfacao}/10</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Participantes */}
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Participantes</p>
                    <p className="text-sm text-muted-foreground">{visita.participantes}</p>
                  </div>
                </div>

                {/* Resumo */}
                <div>
                  <p className="text-sm font-medium mb-1">Resumo</p>
                  <p className="text-sm text-muted-foreground">{visita.resumo}</p>
                </div>

                {/* Decisões */}
                {visita.decisoes && visita.decisoes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Decisões Tomadas
                    </p>
                    <ul className="space-y-1">
                      {visita.decisoes.map((decisao: string, index: number) => (
                        <li key={index} className="text-sm flex items-start gap-2 ml-6">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          {decisao}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pendências */}
                {visita.pendencias && visita.pendencias.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Pendências
                    </p>
                    <ul className="space-y-1">
                      {visita.pendencias.map((pendencia: string, index: number) => (
                        <li key={index} className="text-sm flex items-start gap-2 ml-6">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          {pendencia}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma visita encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || (typeFilter !== 'all')
                ? 'Tente ajustar sua pesquisa ou remover os filtros.'
                : 'Comece registrando sua primeira ATA de visita.'
              }
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova ATA
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}