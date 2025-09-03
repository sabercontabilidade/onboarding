import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Mail, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

interface GoogleAuthButtonProps {
  userId: number
  onConnect?: () => void
  onDisconnect?: () => void
}

export function GoogleAuthButton({ userId, onConnect, onDisconnect }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const { data: status, isLoading: loadingStatus, refetch } = useQuery({
    queryKey: ['/api/integrations/google/status', userId],
    queryFn: () => api.integrations.googleStatus(userId),
  })

  const handleConnect = () => {
    setIsLoading(true)
    // Redirecionar para a URL de OAuth2
    if (status?.oauth_init_url) {
      window.location.href = status.oauth_init_url
    }
    onConnect?.()
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      await api.integrations.googleDisconnect(userId)
      refetch()
      onDisconnect?.()
    } catch (error) {
      console.error('Erro ao desconectar:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    refetch()
  }

  if (loadingStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Integração Google
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Conecte sua conta Google para sincronização automática com Calendar e Gmail
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status da Conexão */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              status?.google_connected ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div>
              <p className="font-medium">
                {status?.user_name || 'Usuário'}
              </p>
              <p className="text-sm text-muted-foreground">
                {status?.google_connected ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
          </div>
          <Badge variant={status?.google_connected ? 'default' : 'secondary'}>
            {status?.google_connected ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* Funcionalidades */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span>Google Calendar</span>
            {status?.google_connected ? (
              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
            ) : (
              <span className="text-muted-foreground ml-auto">Desconectado</span>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-red-500" />
            <span>Gmail</span>
            {status?.google_connected ? (
              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
            ) : (
              <span className="text-muted-foreground ml-auto">Desconectado</span>
            )}
          </div>
        </div>

        {/* Benefícios */}
        {!status?.google_connected && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Benefícios da Integração:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Criação automática de eventos no Google Calendar</li>
              <li>• Envio automático de e-mails de confirmação</li>
              <li>• Lembretes automáticos para agendamentos</li>
              <li>• Sincronização em tempo real</li>
            </ul>
          </div>
        )}

        {/* Scopes autorizados */}
        {status?.google_connected && status.scopes && (
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Permissões Ativas:</h4>
            <div className="flex flex-wrap gap-1">
              {status.scopes.map((scope: string) => (
                <Badge key={scope} variant="outline" className="text-xs">
                  {scope.includes('calendar') ? 'Calendar' : 
                   scope.includes('gmail') ? 'Gmail' : 
                   scope}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2">
          {status?.google_connected ? (
            <Button 
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Desconectando...
                </>
              ) : (
                'Desconectar Google'
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Conectar Google
                </>
              )}
            </Button>
          )}
        </div>

        {/* Informações de Segurança */}
        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
          <p>🔒 Suas credenciais são armazenadas com criptografia segura.</p>
          <p>📧 Utilizamos apenas as permissões mínimas necessárias.</p>
        </div>
      </CardContent>
    </Card>
  )
}