import { Link, useLocation } from "wouter";
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  Wrench,
  Bell,
  Settings,
  HelpCircle,
  User,
  LogOut,
  Shield,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';

export default function Sidebar() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

  // Buscar contadores dinâmicos
  const { data: counts } = useQuery({
    queryKey: ['/api/dashboard/counts'],
    queryFn: () => api.dashboard.counts(),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const navigationItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", count: null },
    { path: "/clientes", icon: Users, label: "Clientes", count: null },
    { path: "/onboarding", icon: UserPlus, label: "Onboarding", count: counts?.onboardingInProgress || null },
    { path: "/agendamentos", icon: Calendar, label: "Agendamentos", count: null },
    { path: "/visitas", icon: Wrench, label: "Visitas Técnicas", count: null },
    { path: "/relatorios", icon: BarChart3, label: "Relatórios", count: null },
    { path: "/notificacoes", icon: Bell, label: "Notificações", count: null },
  ];

  const adminItems = [
    { path: "/auditoria", icon: Shield, label: "Auditoria", count: null },
    { path: "/usuarios", icon: Users, label: "Usuários", count: null },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/" || location === "/dashboard";
    }
    return location.startsWith(path);
  };

  return (
    <aside className="w-64 saber-sidebar flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src="/icon-saber.png"
            alt="SABER Logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="font-bold text-[#EA610B]">SABER</h1>
            <p className="text-xs text-muted-foreground">Onboarding System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" data-testid="nav-menu">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                isActive(item.path)
                  ? "bg-[#EA610B] text-white shadow-md"
                  : "text-muted-foreground hover:bg-orange-50 hover:text-[#EA610B]"
              }`}>
                <IconComponent className="w-4 h-4" />
                <span>{item.label}</span>
                {item.count && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    isActive(item.path)
                      ? "bg-white/20 text-white"
                      : "bg-[#EA610B]/10 text-[#EA610B]"
                  }`}>
                    {item.count}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-4 border-t border-border mt-4">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administração
            </div>
            {adminItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                    isActive(item.path)
                      ? "bg-[#EA610B] text-white shadow-md"
                      : "text-muted-foreground hover:bg-orange-50 hover:text-[#EA610B]"
                  }`}>
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.count && (
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                        isActive(item.path)
                          ? "bg-white/20 text-white"
                          : "bg-[#EA610B]/10 text-[#EA610B]"
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-border mt-4">
          <Link href="/configuracoes">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
              isActive("/configuracoes")
                ? "bg-[#EA610B] text-white shadow-md"
                : "text-muted-foreground hover:bg-orange-50 hover:text-[#EA610B]"
            }`} data-testid="nav-settings">
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </div>
          </Link>
          <Link href="/ajuda">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-orange-50 hover:text-[#EA610B] transition-all duration-200 cursor-pointer" data-testid="nav-help">
              <HelpCircle className="w-4 h-4" />
              <span>Ajuda</span>
            </div>
          </Link>
        </div>
      </nav>

      <UserSection />
    </aside>
  );
}

function UserSection() {
  const { user, logout } = useAuth();

  const getFuncaoLabel = (funcao?: string) => {
    const labels: Record<string, string> = {
      comercial: 'Comercial',
      integracao: 'Integração',
      onboarding: 'Onboarding',
      admin: 'Administrador',
    };
    return funcao ? labels[funcao] || funcao : 'Usuário';
  };

  return (
    <div className="p-4 border-t border-border bg-gray-50">
      <div className="flex items-center gap-3">
        {user?.fotoUrl ? (
          <img
            src={user.fotoUrl}
            alt={user.nome}
            className="w-10 h-10 rounded-full object-cover border-2 border-[#EA610B]/20"
          />
        ) : (
          <div className="w-10 h-10 bg-[#EA610B] rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate" data-testid="user-name">
            {user?.nome || 'Usuário'}
          </p>
          <p className="text-xs text-muted-foreground truncate" data-testid="user-role">
            {getFuncaoLabel(user?.funcao)}
          </p>
        </div>
        <button
          onClick={logout}
          className="p-2 text-muted-foreground hover:text-[#EA610B] hover:bg-orange-50 rounded-lg transition-all duration-200"
          data-testid="button-logout"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
