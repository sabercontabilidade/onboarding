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
import { ViewToggle, type ViewType } from '@/components/ui/view-toggle'
import { ClientCard } from '@/components/client-card'
import { KanbanView } from '@/components/kanban-view'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import dayjs from '@/lib/dayjs'

export function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentView, setCurrentView] = useState<ViewType>('list')
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

      {/* Busca e Toggle de Visualização */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <ViewToggle
              currentView={currentView}
              onViewChange={setCurrentView}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      {isLoading ? (
        <div className={currentView === 'kanban' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' : 'grid gap-4'}>
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
        <div data-testid="clients-content">
          {currentView === 'list' ? (
            <div className="space-y-4" data-testid="list-view">
              {clients.map((client: any) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  showOnboardingButton={true}
                  onStartOnboarding={(clientId) => startOnboardingMutation.mutate(clientId)}
                  onDelete={(clientId) => deleteClientMutation.mutate(clientId)}
                  isStartingOnboarding={startOnboardingMutation.isPending}
                  isDeletingClient={deleteClientMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <KanbanView
              clients={clients}
              showOnboardingButton={true}
              onStartOnboarding={(clientId) => startOnboardingMutation.mutate(clientId)}
              onDelete={(clientId) => deleteClientMutation.mutate(clientId)}
              isStartingOnboarding={startOnboardingMutation.isPending}
              isDeletingClient={deleteClientMutation.isPending}
            />
          )}
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