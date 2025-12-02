import { useState } from 'react';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await api.auth.forgotPassword(data.email);
      setEmailSent(true);
    } catch (error: any) {
      // Sempre mostrar sucesso por segurança (não revelar se email existe)
      setEmailSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="h-svh w-full overflow-hidden relative bg-white">
        {/* Faixa laranja + curva */}
        <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            style={{ height: '80px' }}
          >
            <path
              d="M0,50 Q200,100 400,65 Q900,0 1440,90 L1440,120 L0,120 Z"
              fill="white"
            />
          </svg>
        </div>

        <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 animate-scale-in">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Email Enviado!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Se o email informado estiver cadastrado, você receberá instruções
                  para recuperar sua senha em alguns minutos.
                </p>
              </div>

              <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                <p className="font-semibold mb-1">Não recebeu o email?</p>
                <ul className="list-disc list-inside space-y-1 text-orange-700 text-xs">
                  <li>Verifique sua caixa de spam</li>
                  <li>Confirme se digitou o email correto</li>
                  <li>Aguarde alguns minutos e tente novamente</li>
                </ul>
              </div>

              <div className="mt-6">
                <Link href="/login">
                  <Button variant="outline" className="w-full hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-svh w-full overflow-hidden relative bg-white">
      {/* Faixa laranja + curva */}
      <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ height: '80px' }}
        >
          <path
            d="M0,50 Q200,100 400,65 Q900,0 1440,90 L1440,120 L0,120 Z"
            fill="white"
          />
        </svg>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 animate-scale-in">
            <div className="flex flex-col items-center gap-2 text-center animate-fade-in mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Mail className="h-6 w-6 text-[#EA610B]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#EA610B]">
                  Esqueceu sua senha?
                </h2>
                <p className="text-gray-600 mt-1 text-xs">
                  Digite seu email e enviaremos instruções para recuperar sua senha.
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-xs font-semibold text-gray-700">
                        Email
                      </Label>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            className="h-9 pl-8 pr-3 text-sm border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B]"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-9 bg-gradient-to-r from-[#EA610B] to-orange-600 hover:from-[#EA610B]/90 hover:to-orange-600/90 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Email de Recuperação'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-xs text-[#EA610B] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Voltar para o Login
                  </Link>
                </div>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="mt-3 text-center animate-fade-in">
            <p className="text-gray-400 text-[10px]">
              © 2025 SABER Contábil. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
