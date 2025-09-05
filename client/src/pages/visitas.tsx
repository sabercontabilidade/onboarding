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

  // Buscar visitas da API
  const { data: allVisits, refetch: refetchVisits } = useQuery({
    queryKey: ['/api/visits'],
    queryFn: () => api.visits.list(),
    initialData: []
  })

  const filteredVisitas = []

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">ATAs Realizadas</p>
                <div className="flex items-center">
                  <span className="text-2xl font-bold">{allVisits?.length || 0}</span>
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

    </div>
  )
}