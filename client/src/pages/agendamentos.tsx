import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Calendar, 
  Plus, 
  Clock, 
  Users, 
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building,
  Mail,
  Phone,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'wouter'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export function AgendamentosPage() {
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
  })
  const [searchTerm, setSearchTerm] = useState('')

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments', filters],
    queryFn: () => api.appointments.list({
      status: filters.status === 'all' ? '' : filters.status,
      type: filters.type === 'all' ? '' : filters.type,
    }),
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

  const filteredAppointments = appointments?.filter((appointment: any) => {
    if (searchTerm && !appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !appointment.client?.companyName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  }) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os agendamentos e reuniões com clientes
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="AGENDADO">Agendado</SelectItem>
                <SelectItem value="REALIZADO">Realizado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="REUNIAO">Reunião</SelectItem>
                <SelectItem value="LIGACAO">Ligação</SelectItem>
                <SelectItem value="VISITA">Visita</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Agendamentos */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAppointments.length > 0 ? (
        <div className="grid gap-4">
          {filteredAppointments.map((agendamento: any) => (
            <Card key={agendamento.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{agendamento.titulo}</h3>
                        <Badge variant="outline">{agendamento.tipo}</Badge>
                      </div>
                      
                      {/* Informações do Cliente */}
                      {agendamento.client && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900">{agendamento.client.companyName}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {agendamento.client.cnpj && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">CNPJ:</span>
                                <span>{agendamento.client.cnpj}</span>
                              </div>
                            )}
                            
                            {agendamento.client.contactName && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{agendamento.client.contactName}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {agendamento.client.contactEmail && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                <span>{agendamento.client.contactEmail}</span>
                              </div>
                            )}
                            
                            {agendamento.client.contactPhone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                <span>{agendamento.client.contactPhone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{dayjs(agendamento.data_agendada).format('DD/MM/YYYY - HH:mm')}</span>
                        </div>
                        
                        {agendamento.google_event_id && (
                          <Badge variant="outline" className="text-xs">
                            Google Calendar
                          </Badge>
                        )}
                      </div>
                      
                      {agendamento.descricao && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {agendamento.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {dayjs(agendamento.data_agendada).isBefore(dayjs()) && 
                     agendamento.status === 'AGENDADO' && (
                      <Badge variant="destructive" className="text-xs">
                        Atrasado
                      </Badge>
                    )}
                    
                    {dayjs(agendamento.data_agendada).isSame(dayjs(), 'day') && (
                      <Badge className="text-xs bg-blue-500">
                        Hoje
                      </Badge>
                    )}
                    
                    {/* Botão para ver agendamentos do cliente */}
                    {agendamento.client && (
                      <Link href={`/cliente-agendamentos/${agendamento.client.id || agendamento.clientId}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || (filters.status !== 'all') || (filters.type !== 'all')
                ? 'Tente ajustar sua pesquisa ou remover os filtros.'
                : 'Comece criando seu primeiro agendamento.'
              }
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}