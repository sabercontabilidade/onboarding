import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function TwoFactorSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Buscar status do 2FA
  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: api.twoFactor.status,
  });

  // Iniciar configuração
  const setupMutation = useMutation({
    mutationFn: api.twoFactor.setup,
    onSuccess: () => {
      setShowSetupDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao iniciar configuração',
        variant: 'destructive',
      });
    },
  });

  // Verificar e ativar
  const verifySetupMutation = useMutation({
    mutationFn: (token: string) => api.twoFactor.verifySetup(token),
    onSuccess: (data) => {
      setShowSetupDialog(false);
      setShowBackupCodesDialog(true);
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast({
        title: '2FA Ativado!',
        description: 'A autenticação em dois fatores foi ativada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Código inválido',
        description: error.message || 'Verifique o código e tente novamente',
        variant: 'destructive',
      });
    },
  });

  // Desativar 2FA
  const disableMutation = useMutation({
    mutationFn: () => api.twoFactor.disable(password, token),
    onSuccess: () => {
      setShowDisableDialog(false);
      setPassword('');
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast({
        title: '2FA Desativado',
        description: 'A autenticação em dois fatores foi desativada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao desativar 2FA',
        variant: 'destructive',
      });
    },
  });

  // Regenerar códigos de backup
  const regenerateMutation = useMutation({
    mutationFn: () => api.twoFactor.regenerateBackupCodes(password, token),
    onSuccess: (data) => {
      setShowRegenerateDialog(false);
      setShowBackupCodesDialog(true);
      setPassword('');
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast({
        title: 'Códigos Regenerados',
        description: 'Novos códigos de backup foram gerados.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao regenerar códigos',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async (text: string, type: 'secret' | 'codes') => {
    await navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  if (loadingStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação em Dois Fatores (2FA)
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {status?.enabled ? (
                <ShieldCheck className="h-6 w-6 text-green-500" />
              ) : (
                <ShieldOff className="h-6 w-6 text-gray-400" />
              )}
              <div>
                <p className="font-medium">
                  {status?.enabled ? '2FA Ativado' : '2FA Desativado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status?.enabled
                    ? 'Sua conta está protegida com autenticação em dois fatores'
                    : 'Adicione segurança extra à sua conta'}
                </p>
              </div>
            </div>
            <Badge variant={status?.enabled ? 'default' : 'secondary'}>
              {status?.enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>

          {/* Informações sobre códigos de backup */}
          {status?.enabled && status?.hasBackupCodes && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <span className="text-sm">
                  Códigos de backup: <strong>{status.backupCodesCount}</strong> restantes
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegenerateDialog(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerar
              </Button>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            {status?.enabled ? (
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Desativar 2FA
              </Button>
            ) : (
              <Button
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Ativar 2FA
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Instruções */}
          {!status?.enabled && (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Como funciona:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Baixe um aplicativo autenticador (Google Authenticator, Authy, etc.)</li>
                <li>Escaneie o QR code que será exibido</li>
                <li>Insira o código de 6 dígitos para confirmar</li>
                <li>Guarde os códigos de backup em local seguro</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de configuração */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar 2FA</DialogTitle>
            <DialogDescription>
              Escaneie o QR code com seu aplicativo autenticador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {setupMutation.data?.qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={setupMutation.data.qrCode}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}

            {setupMutation.data?.secret && (
              <div className="space-y-2">
                <Label>Chave manual:</Label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {setupMutation.data.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(setupMutation.data!.secret, 'secret')}
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="setup-token">Código do aplicativo:</Label>
              <Input
                id="setup-token"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSetupDialog(false);
                setToken('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => verifySetupMutation.mutate(token)}
              disabled={token.length !== 6 || verifySetupMutation.isPending}
            >
              {verifySetupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ativar 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de códigos de backup */}
      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Códigos de Backup</DialogTitle>
            <DialogDescription>
              Guarde estes códigos em local seguro. Eles não serão mostrados novamente.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Importante!</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Use estes códigos se perder acesso ao seu aplicativo autenticador. Cada código só pode ser usado uma vez.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {(verifySetupMutation.data?.backupCodes || regenerateMutation.data?.backupCodes)?.map((code: string, idx: number) => (
                <div key={idx} className="p-2 bg-background rounded text-center">
                  {code}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                copyToClipboard(
                  (verifySetupMutation.data?.backupCodes || regenerateMutation.data?.backupCodes)?.join('\n') || '',
                  'codes'
                )
              }
            >
              {copiedCodes ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar todos os códigos
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowBackupCodesDialog(false)}>
              Entendi, já guardei os códigos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de desativar 2FA */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar 2FA</DialogTitle>
            <DialogDescription>
              Para desativar a autenticação em dois fatores, confirme sua senha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Senha:</Label>
              <div className="relative">
                <Input
                  id="disable-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disable-token">Código 2FA (opcional):</Label>
              <Input
                id="disable-token"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setPassword('');
                setToken('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={!password || disableMutation.isPending}
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desativando...
                </>
              ) : (
                'Desativar 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de regenerar códigos */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerar Códigos de Backup</DialogTitle>
            <DialogDescription>
              Os códigos atuais serão invalidados. Para confirmar, insira sua senha e código 2FA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regen-password">Senha:</Label>
              <div className="relative">
                <Input
                  id="regen-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regen-token">Código 2FA:</Label>
              <Input
                id="regen-token"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRegenerateDialog(false);
                setPassword('');
                setToken('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => regenerateMutation.mutate()}
              disabled={!password || token.length !== 6 || regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar Novos Códigos'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
