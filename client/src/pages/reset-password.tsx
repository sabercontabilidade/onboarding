import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ArrowLeft, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

const resetPasswordSchema = z
  .object({
    novaSenha: z
      .string()
      .min(6, 'A senha deve ter no mínimo 6 caracteres')
      .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  // Extrair token da URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      novaSenha: '',
      confirmarSenha: '',
    },
  });

  // Verificar se o token é válido
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const response = await api.auth.verifyResetToken(token);
        setIsTokenValid(response.valid);
      } catch (error) {
        setIsTokenValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    setIsLoading(true);
    try {
      await api.auth.resetPassword(token, data.novaSenha);
      setIsSuccess(true);
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi alterada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao redefinir senha',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregando verificação do token
  if (isVerifying) {
    return (
      <div className="h-svh w-full overflow-hidden relative bg-white">
        <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: '80px' }}>
            <path d="M0,50 Q200,100 400,65 Q900,0 1440,90 L1440,120 L0,120 Z" fill="white" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#EA610B] mb-4" />
              <p className="text-gray-600">Verificando link...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Token inválido ou expirado
  if (!isTokenValid) {
    return (
      <div className="h-svh w-full overflow-hidden relative bg-white">
        <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: '80px' }}>
            <path d="M0,50 Q200,100 400,65 Q900,0 1440,90 L1440,120 L0,120 Z" fill="white" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-foreground">Link Inválido</CardTitle>
              <CardDescription className="text-base mt-2">
                Este link de recuperação de senha é inválido ou já expirou.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                <p className="font-medium mb-1">O que pode ter acontecido?</p>
                <ul className="list-disc list-inside space-y-1 text-orange-700">
                  <li>O link expirou (válido por 1 hora)</li>
                  <li>O link já foi utilizado</li>
                  <li>O link foi copiado incorretamente</li>
                </ul>
              </div>
              <Link href="/forgot-password">
                <Button className="w-full bg-[#EA610B] hover:bg-orange-600 text-white">
                  Solicitar Novo Link
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Sucesso ao redefinir senha
  if (isSuccess) {
    return (
      <div className="h-svh w-full overflow-hidden relative bg-white">
        <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: '80px' }}>
            <path d="M0,50 Q200,100 400,65 Q900,0 1440,90 L1440,120 L0,120 Z" fill="white" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
          <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-foreground">Senha Redefinida!</CardTitle>
              <CardDescription className="text-base mt-2">
                Sua senha foi alterada com sucesso. Agora você pode fazer login
                com sua nova senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full bg-[#EA610B] hover:bg-orange-600 text-white">
                  Ir para o Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Formulário de redefinição de senha
  return (
    <div className="h-svh w-full overflow-hidden relative bg-white">
      <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: '80px' }}>
          <path d="M0,50 Q200,100 400,65 Q900,0 1440,90 L1440,120 L0,120 Z" fill="white" />
        </svg>
      </div>
      <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
        <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <Lock className="h-6 w-6 text-[#EA610B]" />
            </div>
            <CardTitle className="text-2xl text-[#EA610B]">Redefinir Senha</CardTitle>
            <CardDescription className="text-base mt-2">
              Digite sua nova senha abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="novaSenha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? (
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
                  control={form.control}
                  name="confirmarSenha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

                <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600">
                  <p className="font-medium mb-1">Requisitos da senha:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Mínimo de 6 caracteres</li>
                    <li>Pelo menos uma letra maiúscula</li>
                    <li>Pelo menos um número</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full bg-[#EA610B] hover:bg-orange-600 text-white" disabled={isLoading}>
                  {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-[#EA610B] hover:text-orange-700 hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Voltar para o Login
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
