import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleAuthButton } from '@/components/forms/google-auth-button'
import { Settings, User, Bell, Shield } from 'lucide-react'

export function ConfiguracoesPage() {
  // Mock user ID - em uma aplicação real, isso viria do contexto de autenticação
  const userId = 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e integrações do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Integração Google */}
        <div className="md:col-span-2">
          <GoogleAuthButton userId={userId} />
        </div>

        {/* Perfil do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription>
              Informações básicas do seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="font-medium">João Silva</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Função</label>
              <p className="font-medium">Contador Sênior</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="font-medium">joao.silva@saber.com.br</p>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure como você deseja receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">E-mail</p>
                <p className="text-sm text-muted-foreground">Receber notificações por e-mail</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lembretes de Agendamento</p>
                <p className="text-sm text-muted-foreground">Alertas para próximos agendamentos</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Relatórios Semanais</p>
                <p className="text-sm text-muted-foreground">Resumo semanal das atividades</p>
              </div>
              <div className="w-3 h-3 bg-gray-300 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configurações de segurança da conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Autenticação de Dois Fatores</p>
                <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
              </div>
              <div className="w-3 h-3 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sessões Ativas</p>
                <p className="text-sm text-muted-foreground">Gerencie dispositivos conectados</p>
              </div>
              <span className="text-sm text-muted-foreground">1 dispositivo</span>
            </div>
          </CardContent>
        </Card>

        {/* Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sistema
            </CardTitle>
            <CardDescription>
              Configurações gerais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fuso Horário</label>
              <p className="font-medium">America/Sao_Paulo (BRT)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Idioma</label>
              <p className="font-medium">Português (Brasil)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Versão</label>
              <p className="font-medium">SABER v1.0.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}