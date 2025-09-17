import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientCard } from '@/components/client-card'

interface KanbanViewProps {
  clients: any[]
  showProgress?: boolean
  showOnboardingButton?: boolean
  onStartOnboarding?: (clientId: string) => void
  onDelete?: (clientId: string) => void
  isStartingOnboarding?: boolean
  isDeletingClient?: boolean
}

const STATUS_COLUMNS = [
  {
    key: 'pending',
    title: 'Pendentes',
    description: 'Clientes aguardando onboarding',
    color: 'bg-gray-100 text-gray-700'
  },
  {
    key: 'onboarding', 
    title: 'Em Onboarding',
    description: 'Clientes em processo de onboarding',
    color: 'bg-blue-100 text-blue-700'
  },
  {
    key: 'active',
    title: 'Ativos',
    description: 'Clientes com onboarding concluído',
    color: 'bg-green-100 text-green-700'
  },
  {
    key: 'inactive',
    title: 'Inativos',
    description: 'Clientes inativos',
    color: 'bg-red-100 text-red-700'
  }
]

export function KanbanView({
  clients,
  showProgress = false,
  showOnboardingButton = false,
  onStartOnboarding,
  onDelete,
  isStartingOnboarding = false,
  isDeletingClient = false
}: KanbanViewProps) {
  
  const clientsByStatus = useMemo(() => {
    const grouped = STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.key] = clients.filter(client => client.status === column.key)
      return acc
    }, {} as Record<string, any[]>)
    
    // Adicionar clientes com status não reconhecidos na coluna 'pending'
    const recognizedStatuses = STATUS_COLUMNS.map(col => col.key)
    const unrecognizedClients = clients.filter(client => !recognizedStatuses.includes(client.status))
    grouped.pending = [...grouped.pending, ...unrecognizedClients]
    
    return grouped
  }, [clients])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto" data-testid="kanban-view">
      {STATUS_COLUMNS.map((column) => {
        const columnClients = clientsByStatus[column.key] || []
        
        return (
          <div key={column.key} className="space-y-3 min-w-0 max-w-sm">
            {/* Cabeçalho da coluna */}
            <Card className="border-2 border-dashed border-muted">
              <CardHeader className="pb-2 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate flex-1">
                    {column.title}
                  </CardTitle>
                  <Badge variant="secondary" className={`${column.color} flex-shrink-0 text-xs px-1.5 py-0.5`}>
                    {columnClients.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {column.description}
                </p>
              </CardHeader>
            </Card>

            {/* Lista de clientes da coluna */}
            <div className="space-y-2 overflow-y-auto max-h-screen" data-testid={`kanban-column-${column.key}`}>
              {columnClients.map((client) => (
                <div key={client.id} className="w-full">
                  <ClientCard
                    client={client}
                    variant="compact"
                    showProgress={showProgress}
                    showOnboardingButton={showOnboardingButton}
                    onStartOnboarding={onStartOnboarding}
                    onDelete={onDelete}
                    isStartingOnboarding={isStartingOnboarding}
                    isDeletingClient={isDeletingClient}
                  />
                </div>
              ))}
              
              {/* Estado vazio */}
              {columnClients.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhum cliente {column.title.toLowerCase()}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}