import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { GoogleAuthButton } from '@/components/forms/google-auth-button';
import { TwoFactorSetup } from '@/components/two-factor-setup';
import { Settings, User, Bell, Shield, Lock, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

// Schema para edição de perfil
const profileSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

// Schema para preferências
const preferencesSchema = z.object({
  notificacoes: z.boolean(),
  emailNotificacoes: z.boolean(),
});

type PreferencesForm = z.infer<typeof preferencesSchema>;

// Schema para alteração de senha
const passwordSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
    novaSenha: z
      .string()
      .min(6, 'Nova senha deve ter pelo menos 6 caracteres')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Deve conter pelo menos um número'),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export function ConfiguracoesPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: user?.nome || '',
      telefone: user?.telefone || '',
    },
  });

  const preferencesForm = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      notificacoes: user?.preferencias?.notificacoes ?? true,
      emailNotificacoes: user?.preferencias?.emailNotificacoes ?? true,
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      senhaAtual: '',
      novaSenha: '',
      confirmarSenha: '',
    },
  });

  const getFuncaoLabel = (funcao?: string) => {
    const labels: Record<string, string> = {
      comercial: 'Comercial',
      integracao: 'Integração',
      onboarding: 'Onboarding',
      admin: 'Administrador',
    };
    return funcao ? labels[funcao] || funcao : 'Usuário';
  };

  const getNivelPermissaoLabel = (nivel?: string) => {
    const labels: Record<string, string> = {
      administrador: 'Administrador',
      operador: 'Operador',
      analista: 'Analista',
    };
    return nivel ? labels[nivel] || nivel : 'Operador';
  };

  const onSaveProfile = async (data: ProfileForm) => {
    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/users/${user?.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar perfil');
      }

      await refreshUser?.();
      setIsEditingProfile(false);
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onSavePreferences = async (data: PreferencesForm) => {
    setIsSavingPreferences(true);
    try {
      const response = await fetch(`/api/users/${user?.id}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar preferências');
      }

      await refreshUser?.();
      toast({
        title: 'Preferências atualizadas',
        description: 'Suas preferências foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar preferências',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setIsSavingPassword(true);
    try {
      await api.auth.changePassword(data.senhaAtual, data.novaSenha);
      setIsChangingPassword(false);
      passwordForm.reset();
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao alterar senha',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e integrações do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Integração Google */}
        {user?.id && (
          <div className="md:col-span-2">
            <GoogleAuthButton userId={parseInt(user.id)} />
          </div>
        )}

        {/* 2FA Setup */}
        <div className="md:col-span-2">
          <TwoFactorSetup />
        </div>

        {/* Perfil do Usuário */}
        <Card className="saber-card">
          <CardHeader className="saber-card-header">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-[#EA610B]" />
                  </div>
                  Perfil do Usuário
                </CardTitle>
                <CardDescription>Informações básicas do seu perfil</CardDescription>
              </div>
              {!isEditingProfile && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]">
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSavingProfile} className="bg-[#EA610B] hover:bg-orange-600 text-white">
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditingProfile(false);
                        profileForm.reset();
                      }}
                      className="hover:bg-gray-100"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="font-medium">{user?.nome || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Função</label>
                  <p className="font-medium">{getFuncaoLabel(user?.funcao)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nível de Permissão
                  </label>
                  <p className="font-medium">{getNivelPermissaoLabel(user?.nivelPermissao)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{user?.email || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="font-medium">{user?.telefone || 'Não informado'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card className="saber-card">
          <CardHeader className="saber-card-header">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
              Notificações
            </CardTitle>
            <CardDescription>Configure como você deseja receber notificações</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...preferencesForm}>
              <form
                onChange={preferencesForm.handleSubmit(onSavePreferences)}
                className="space-y-4"
              >
                <FormField
                  control={preferencesForm.control}
                  name="notificacoes"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="font-medium">Notificações no Sistema</FormLabel>
                        <FormDescription>Receber notificações dentro do sistema</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={preferencesForm.control}
                  name="emailNotificacoes"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="font-medium">Notificações por E-mail</FormLabel>
                        <FormDescription>Receber resumos e alertas por e-mail</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {isSavingPreferences && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando preferências...
                  </p>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="saber-card">
          <CardHeader className="saber-card-header">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              Segurança
            </CardTitle>
            <CardDescription>Configurações de segurança da conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-foreground">Alterar Senha</p>
                <p className="text-sm text-muted-foreground">
                  Atualize sua senha de acesso
                </p>
              </div>
              <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]">
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar
                  </Button>
                </DialogTrigger>
                <DialogContent className="saber-modal">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Alterar Senha</DialogTitle>
                    <DialogDescription>
                      Digite sua senha atual e a nova senha desejada.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...passwordForm}>
                    <form
                      onSubmit={passwordForm.handleSubmit(onChangePassword)}
                      className="space-y-4"
                    >
                      <FormField
                        control={passwordForm.control}
                        name="senhaAtual"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showCurrentPassword ? 'text' : 'password'}
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="novaSenha"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input type={showNewPassword ? 'text' : 'password'} {...field} />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Mín. 6 caracteres, 1 maiúscula, 1 número
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmarSenha"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Nova Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsChangingPassword(false);
                            passwordForm.reset();
                          }}
                          className="hover:bg-gray-100"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSavingPassword} className="bg-[#EA610B] hover:bg-orange-600 text-white">
                          {isSavingPassword ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Alterando...
                            </>
                          ) : (
                            'Alterar Senha'
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-foreground">Autenticação de Dois Fatores</p>
                <p className="text-sm text-muted-foreground">
                  {user?.twoFactorEnabled
                    ? 'Ativada - sua conta está protegida'
                    : 'Desativada - adicione segurança extra'}
                </p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${user?.twoFactorEnabled ? 'bg-saber-success' : 'bg-gray-300'}`}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-foreground">Sessões Ativas</p>
                <p className="text-sm text-muted-foreground">Gerencie dispositivos conectados</p>
              </div>
              <span className="text-sm text-muted-foreground">1 dispositivo</span>
            </div>
          </CardContent>
        </Card>

        {/* Sistema */}
        <Card className="saber-card">
          <CardHeader className="saber-card-header">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-purple-600" />
              </div>
              Sistema
            </CardTitle>
            <CardDescription>Configurações gerais do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-sm font-medium text-muted-foreground">Fuso Horário</label>
              <p className="font-medium text-foreground">America/Sao_Paulo (BRT)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-sm font-medium text-muted-foreground">Idioma</label>
              <p className="font-medium text-foreground">Português (Brasil)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-sm font-medium text-muted-foreground">Versão</label>
              <p className="font-medium text-[#EA610B]">SABER v1.0.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
