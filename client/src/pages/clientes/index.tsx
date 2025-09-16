import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'wouter'
import { 
  Search, 
  Plus, 
  Users, 
  Building,
  Phone,
  Mail,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import dayjs from '@/lib/dayjs'

export function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients', searchTerm],
    queryFn: () => api.clients.list(searchTerm || undefined),
  })

  const deleteClientMutation = useMutation({
    mutationFn: (clientId: string) => {
      console.log('🗑️ Excluindo cliente com ID:', clientId)
      return api.clients.delete(clientId)
    },
    onSuccess: (data, clientId) => {
      console.log('✅ Cliente excluído com sucesso:', clientId)
      // Invalidar todas as queries relacionadas a clientes
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] })
      // Também forçar refetch para atualizar a lista imediatamente
      queryClient.refetchQueries({ queryKey: ['/api/clients', searchTerm] })
      toast({
        title: 'Cliente excluído',
        description: 'O cliente foi removido com sucesso.',
      })
    },
    onError: (error: any) => {
      console.error('❌ Erro ao excluir cliente:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o cliente. Tente novamente.',
        variant: 'destructive',
      })
    },
  })

  const startOnboardingMutation = useMutation({
    mutationFn: (clientId: string) => {
      console.log('🚀 Iniciando onboarding para cliente:', clientId)
      return api.clients.startOnboarding(clientId)
    },
    onSuccess: (data, clientId) => {
      console.log('✅ Onboarding iniciado com sucesso:', clientId)
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] })
      toast({
        title: 'Onboarding iniciado!',
        description: 'O processo de onboarding foi iniciado com sucesso. Verifique o menu Onboarding.',
      })
    },
    onError: (error: any) => {
      console.error('❌ Erro ao iniciar onboarding:', error)
      let errorMessage = 'Não foi possível iniciar o onboarding. Tente novamente.'
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Erro ao iniciar onboarding',
        description: errorMessage,
        variant: 'destructive',
      })
    },
  })

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e acompanhe o processo de onboarding
          </p>
        </div>
        <Button 
          onClick={() => setLocation('/clientes/novo')}
          data-testid="button-novo-cliente"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
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
      ) : clients && clients.length > 0 ? (
        <div className="grid gap-4">
          {clients.map((client: any) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{client.companyName}</h3>
                        <Badge 
                          variant="secondary" 
                          className={getStatusColor(client.status)}
                        >
                          {getStatusLabel(client.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{client.cnpj}</span>
                        </div>
                        
                        {client.createdAt && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Cliente cadastrado em:</span>
                            <span>{dayjs(client.createdAt).format('DD/MM/YYYY')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Botão Iniciar Onboarding - sempre visível por enquanto */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startOnboardingMutation.mutate(client.id)}
                      disabled={startOnboardingMutation.isPending}
                      data-testid={`button-iniciar-onboarding-${client.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {startOnboardingMutation.isPending ? 'Iniciando...' : 'Iniciar Onboarding'}
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/clientes/${client.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation(`/clientes/${client.id}/editar`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza de que deseja excluir o cliente "{client.companyName}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteClientMutation.mutate(client.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteClientMutation.isPending}
                              >
                                {deleteClientMutation.isPending ? 'Excluindo...' : 'Excluir'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? 'Tente ajustar sua pesquisa ou remover os filtros.'
                : 'Comece cadastrando seu primeiro cliente.'
              }
            </p>
            <Button onClick={() => setLocation('/clientes/novo')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}