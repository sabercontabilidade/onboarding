import { Link } from 'wouter'
import {
  Building,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Play,
  Clock,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      'onboarding': 'bg-blue-100 text-blue-700 border-blue-200',
      'active': 'bg-green-100 text-green-700 border-green-200',
      'inactive': 'bg-red-100 text-red-700 border-red-200',
      'pending': 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200'
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

  // Progresso agora vem do cliente (calculado pela API)
  const getFollowUpProgress = (client: any) => {
    if (!showProgress) return 0
    return client.onboardingProgress || 0
  }

  return (
    <div className={`saber-card animate-scale-in ${variant === 'compact' ? 'max-w-sm' : ''}`}>
      <div className={`${variant === 'compact' ? 'p-3' : 'p-6'}`}>
        <div className={`flex ${variant === 'compact' ? 'flex-col gap-3' : 'items-center justify-between'}`}>
          <div className={`flex items-center ${variant === 'compact' ? 'gap-3 w-full' : 'space-x-4 flex-1'}`}>
            <div className={`${variant === 'compact' ? 'w-10 h-10 flex-shrink-0' : 'w-12 h-12'} bg-orange-100 rounded-xl flex items-center justify-center`}>
              <Building className={`${variant === 'compact' ? 'h-5 w-5' : 'h-6 w-6'} text-[#EA610B]`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className={`flex items-center ${variant === 'compact' ? 'gap-2 mb-1' : 'gap-3 mb-2'}`}>
                <h3 className={`${variant === 'compact' ? 'text-sm' : 'text-lg'} font-bold text-foreground uppercase truncate flex-1`}>
                  {client.companyName}
                </h3>
                <Badge
                  className={`${getStatusColor(client.status)} ${variant === 'compact' ? 'text-xs px-1.5 py-0.5 flex-shrink-0' : 'px-2.5 py-0.5'} border font-medium`}
                >
                  {getStatusLabel(client.status)}
                </Badge>
              </div>

              {/* Progresso do Follow-up - apenas se showProgress for true */}
              {showProgress && (
                <div className={`${variant === 'compact' ? 'mb-2' : 'mb-4'}`}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className={variant === 'compact' ? 'text-xs' : ''}>Progresso do Onboarding</span>
                    <span className="ml-2 font-semibold text-[#EA610B]">{Math.round(getFollowUpProgress(client))}%</span>
                  </div>
                  <Progress
                    value={getFollowUpProgress(client)}
                    className={`h-2 w-full ${variant === 'compact' ? 'max-w-full' : 'max-w-md'}`}
                  />
                </div>
              )}

              <div className={`${variant === 'compact' ? 'space-y-1' : 'flex items-center gap-4'} text-sm text-muted-foreground`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building className={`${variant === 'compact' ? 'h-3 w-3' : 'h-4 w-4'} flex-shrink-0 text-gray-400`} />
                  <span className={`${variant === 'compact' ? 'text-xs truncate' : ''}`}>{client.cnpj}</span>
                </div>

                {client.createdAt && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`${variant === 'compact' ? 'text-xs' : ''}`}>
                      {variant === 'compact' ? 'Cadastrado:' : 'Cliente cadastrado em:'}
                    </span>
                    <span className={`font-medium ${variant === 'compact' ? 'text-xs' : ''}`}>
                      {dayjs(client.createdAt).format('DD/MM/YYYY')}
                    </span>
                  </div>
                )}

                {/* Informações adicionais para onboarding */}
                {showProgress && client.nextAppointment && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className={`${variant === 'compact' ? 'h-3 w-3' : 'h-4 w-4'} flex-shrink-0 text-blue-500`} />
                    <span className={`${variant === 'compact' ? 'text-xs truncate' : ''}`}>
                      {variant === 'compact' ? '' : 'Próximo: '}
                      {dayjs(client.nextAppointment.scheduledStart).format('DD/MM HH:mm')}
                    </span>
                  </div>
                )}

                {showProgress && client.contactName && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Users className={`${variant === 'compact' ? 'h-3 w-3' : 'h-4 w-4'} flex-shrink-0 text-gray-400`} />
                    <span className={`${variant === 'compact' ? 'text-xs truncate' : ''}`}>{client.contactName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`flex items-center ${variant === 'compact' ? 'gap-1 w-full justify-between' : 'gap-2'}`}>
            {/* Botão Iniciar Onboarding - condicional */}
            {showOnboardingButton && onStartOnboarding && (
              <Button
                onClick={() => onStartOnboarding(client.id)}
                disabled={isStartingOnboarding || client.status === 'onboarding'}
                data-testid={`button-iniciar-onboarding-${client.id}`}
                className={`${variant === 'compact' ? 'text-xs px-2 py-1 h-7 flex-1 min-w-0' : ''} ${
                  client.status === 'onboarding'
                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                    : 'bg-[#EA610B] hover:bg-orange-600 text-white shadow-sm'
                }`}
              >
                <Play className={`${variant === 'compact' ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'} flex-shrink-0`} />
                <span className={variant === 'compact' ? 'truncate' : ''}>
                  {isStartingOnboarding
                    ? 'Iniciando...'
                    : client.status === 'onboarding'
                      ? (variant === 'compact' ? 'Iniciado' : 'Onboarding Iniciado')
                      : (variant === 'compact' ? 'Iniciar' : 'Iniciar Onboarding')
                  }
                </span>
              </Button>
            )}

            {/* Sempre mostrar menu dropdown para ações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`${variant === 'compact' ? 'h-7 w-7 p-0 flex-shrink-0' : 'h-8 w-8 p-0'} hover:bg-orange-50 hover:text-[#EA610B]`}
                  data-testid={`menu-actions-${client.id}`}
                >
                  <MoreHorizontal className={variant === 'compact' ? 'h-4 w-4' : 'h-4 w-4'} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg rounded-xl">
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg hover:bg-orange-50 hover:text-[#EA610B] focus:bg-orange-50 focus:text-[#EA610B]">
                  <Link href={`/clientes/${client.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalhes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg hover:bg-orange-50 hover:text-[#EA610B] focus:bg-orange-50 focus:text-[#EA610B]">
                  <Link href={`/clientes/${client.id}/editar`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="cursor-pointer rounded-lg text-red-600 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600" onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="saber-modal">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza de que deseja excluir o cliente "{client.companyName}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-gray-100">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(client.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
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
      </div>
    </div>
  )
}
