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
import { ViewToggle, type ViewType } from '@/components/ui/view-toggle'
import { ClientCard } from '@/components/client-card'
import { KanbanView } from '@/components/kanban-view'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'
import { Link } from 'wouter'

export function VisitasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentView, setCurrentView] = useState<ViewType>('list')

  // Buscar clientes da API
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => api.clients.list(),
  })

  const allClients = clients || []
  
  // Estas funções foram movidas para o ClientCard component

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Visitas Técnicas</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe as ATAs e resultados das visitas realizadas
        </p>
      </div>

      {/* Filtros e Busca */}
      <Card className="saber-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por cliente ou tipo de visita..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B]"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue placeholder="Tipo de visita" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Implementação">Implementação</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
                <SelectItem value="Treinamento">Treinamento</SelectItem>
                <SelectItem value="Suporte">Suporte</SelectItem>
              </SelectContent>
            </Select>
            <ViewToggle
              currentView={currentView}
              onViewChange={setCurrentView}
            />
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas dos Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="saber-card p-6 animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold text-foreground mt-1">{allClients.length}</p>
            </div>
            <div className="w-12 h-12 bg-[#EA610B] rounded-xl flex items-center justify-center shadow-sm">
              <Building className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="saber-card p-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ATAs Realizadas</p>
              <p className="text-2xl font-bold text-foreground mt-1">{allVisits?.length || 0}</p>
            </div>
            <div className="w-12 h-12 bg-saber-success rounded-xl flex items-center justify-center shadow-sm">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      {isLoadingClients ? (
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
      ) : allClients.length > 0 ? (
        <div data-testid="visitas-clients-content">
          <h2 className="text-xl font-bold text-foreground mb-4">Clientes</h2>
          {currentView === 'list' ? (
            <div className="space-y-4" data-testid="list-view">
              {allClients.map((client: any) => (
                <ClientCard
                  key={client.id}
                  client={client}
                />
              ))}
            </div>
          ) : (
            <KanbanView
              clients={allClients}
            />
          )}
        </div>
      ) : (
        <Card className="saber-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-[#EA610B]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Comece cadastrando seus clientes para acompanhar as visitas técnicas.
            </p>
            <Link href="/clientes/novo">
              <Button className="bg-[#EA610B] hover:bg-orange-600 text-white shadow-sm">
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