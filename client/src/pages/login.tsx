import { LoginForm } from '@/components/auth/login-form'

export function LoginPage() {
  return (
    <div className="h-svh w-full overflow-hidden relative bg-white">
      {/* Faixa laranja + curva ocupando até 50% da página */}
      <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
        {/* Fundo laranja */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
        {/* Curva ondulada na parte inferior */}
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

      {/* Card de login centralizado na página */}
      <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 animate-scale-in">
            <LoginForm />
          </div>

          {/* Footer */}
          <div
            className="mt-3 text-center animate-fade-in"
            style={{ animationDelay: '0.5s' }}
          >
            <p className="text-gray-500 text-[11px]">
              Sistema de Onboarding de Clientes - Versão 1.0.0
            </p>
            <p className="text-gray-400 text-[10px] mt-0.5">
              © 2025 SABER Contábil. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
