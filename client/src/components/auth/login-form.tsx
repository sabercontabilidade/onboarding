import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'wouter'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [, setLocation] = useLocation()
  const { login } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.senha) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      await login(formData.email, formData.senha)
      setLocation('/')
    } catch (err: any) {
      toast({
        title: 'Erro ao fazer login',
        description: err.message || 'Verifique suas credenciais e tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className={cn('flex flex-col gap-5', className)} {...props}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header com Logo */}
        <div className="flex flex-col items-center gap-2 text-center animate-fade-in">
          <img
            src="/icon-saber.png"
            alt="SABER Logo"
            className="w-12 h-12 object-contain"
          />
          <div>
            <h2 className="text-base font-bold text-[#EA610B]">
              SABER - Sistema de Onboarding
            </h2>
            <p className="text-gray-600 mt-1 text-xs">
              {isLoading
                ? 'Autenticando...'
                : 'Faça login para acessar o sistema'}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div
            className="space-y-1.5 animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <Label
              htmlFor="email"
              className="text-xs font-semibold text-gray-700"
            >
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                required
                disabled={isLoading}
                className="h-9 pl-8 pr-3 text-sm border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B] transition-all duration-200 disabled:opacity-50"
              />
            </div>
          </div>

          <div
            className="space-y-1.5 animate-slide-up"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="flex items-center justify-between">
              <Label
                htmlFor="senha"
                className="text-xs font-semibold text-gray-700"
              >
                Senha
              </Label>
              <Link
                href="/forgot-password"
                className="text-[10px] text-[#EA610B] hover:underline font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={formData.senha}
                onChange={e => handleInputChange('senha', e.target.value)}
                required
                disabled={isLoading}
                className="h-9 pl-8 pr-10 text-sm border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B] transition-all duration-200 disabled:opacity-50"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0.5 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-md disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                )}
              </Button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="animate-slide-up pt-2" style={{ animationDelay: '0.5s' }}>
            <Button
              type="submit"
              className={cn(
                'w-full h-9 bg-gradient-to-r from-[#EA610B] to-orange-600 hover:from-[#EA610B]/90 hover:to-orange-600/90 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform',
                isLoading
                  ? 'scale-100 cursor-not-allowed opacity-90'
                  : 'hover:scale-[1.02]'
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Security Notice */}
      <div
        className="text-center animate-fade-in"
        style={{ animationDelay: '0.6s' }}
      >
        <div className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded">
          <Lock className="h-2.5 w-2.5" />
          <span>Conexão segura via HTTPS</span>
        </div>
      </div>
    </div>
  )
}
