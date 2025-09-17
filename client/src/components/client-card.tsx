import { Link } from 'wouter'
import { 
  Building, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Play, 
  Clock, 
  Calendar,
  Users 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import dayjs from '@/lib/dayjs'

interface ClientCardProps {
  client: any
  showProgress?: boolean
  showOnboardingButton?: boolean
  onStartOnboarding?: (clientId: string) => void
  onDelete?: (clientId: string) => void
  isStartingOnboarding?: boolean
  isDeletingClient?: boolean
  variant?: 'default' | 'compact'
}

export function ClientCard({
  client,
  showProgress = false,
  showOnboardingButton = false,
  onStartOnboarding,
  onDelete,
  isStartingOnboarding = false,
  isDeletingClient = false,
  variant = 'default'
}: ClientCardProps) {
  
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

  const getFollowUpProgress = (client: any) => {
    if (!showProgress) return 0
    
    const followUpStages = ['plano_sucesso', 'inicial', 'd5', 'd15', 'd50', 'd80', 'd100', 'd180']
    const completedStagesKey = `completedStages_${client.id}`
    const completedStagesStr = localStorage.getItem(completedStagesKey) || '[]'
    const completedStages = JSON.parse(completedStagesStr)
    const completedStagesCount = completedStages.length
    
    return (completedStagesCount / followUpStages.length) * 100
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className={`${variant === 'compact' ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className={`${variant === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} bg-primary/10 rounded-lg flex items-center justify-center`}>
              <Building className={`${variant === 'compact' ? 'h-5 w-5' : 'h-6 w-6'} text-primary`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`${variant === 'compact' ? 'text-base' : 'text-lg'} font-semibold uppercase`}>
                  {client.companyName}
                </h3>
                <Badge 
                  variant="secondary" 
                  className={getStatusColor(client.status)}
                >
                  {getStatusLabel(client.status)}
                </Badge>
              </div>
              
              {/* Progresso do Follow-up - apenas se showProgress for true */}
              {showProgress && (
                <div className="mb-4 pr-8">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso do Follow-up</span>
                    <span className="ml-2">{Math.round(getFollowUpProgress(client))}%</span>
                  </div>
                  <Progress value={getFollowUpProgress(client)} className="h-1.5 w-full max-w-md" />
                </div>
              )}
              
              <div className={`flex items-center gap-4 text-sm text-muted-foreground ${variant === 'compact' ? 'flex-col items-start gap-2' : ''}`}>
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
                
                {/* Informações adicionais para onboarding */}
                {showProgress && client.nextAppointment && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Próximo: {dayjs(client.nextAppointment.scheduledStart).format('DD/MM HH:mm')}</span>
                  </div>
                )}
                
                {showProgress && client.contactName && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{client.contactName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 ${variant === 'compact' ? 'flex-col gap-1' : ''}`}>
            {/* Botão Iniciar Onboarding - condicional */}
            {showOnboardingButton && onStartOnboarding && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartOnboarding(client.id)}
                disabled={isStartingOnboarding || client.status === 'onboarding'}
                data-testid={`button-iniciar-onboarding-${client.id}`}
                className={variant === 'compact' ? 'text-xs px-2 py-1 h-6' : ''}
              >
                <Play className={`${variant === 'compact' ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                {isStartingOnboarding 
                  ? 'Iniciando...' 
                  : client.status === 'onboarding' 
                    ? 'Onboarding Iniciado' 
                    : 'Iniciar Onboarding'
                }
              </Button>
            )}
            
            {/* Sempre mostrar menu dropdown para ações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={variant === 'compact' ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0'}
                  data-testid={`menu-actions-${client.id}`}
                >
                  <MoreHorizontal className={variant === 'compact' ? 'h-3 w-3' : 'h-4 w-4'} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/clientes/${client.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/clientes/${client.id}/editar`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                {onDelete && (
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
                          onClick={() => onDelete(client.id)}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={isDeletingClient}
                        >
                          {isDeletingClient ? 'Excluindo...' : 'Excluir'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}