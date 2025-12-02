import { Bell, User, Wifi, WifiOff, Plus, Settings, LogOut, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useWebSocket } from '@/contexts/websocket-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, useLocation } from 'wouter';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onAddClient?: () => void;
}

export default function Header({ title, subtitle, onAddClient }: HeaderProps) {
  const { user, logout } = useAuth();
  const { isConnected, unreadCount } = useWebSocket();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="header-title">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1" data-testid="header-subtitle">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Indicador de conexão WebSocket */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-saber-success" />
                ) : (
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isConnected ? 'Conectado em tempo real' : 'Reconectando...'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Notificações */}
          <Link href="/notificacoes">
            <button className="relative p-2 text-muted-foreground hover:text-[#EA610B] hover:bg-orange-50 rounded-lg transition-all duration-200" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E74C3C] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </Link>

          {onAddClient && (
            <Button
              onClick={onAddClient}
              className="saber-button-primary"
              data-testid="button-add-client"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          )}

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-all duration-200"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.fotoUrl} />
                  <AvatarFallback className="bg-[#EA610B] text-white text-sm font-medium">
                    {user?.nome
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.nome || 'Usuário'}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email || ''}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border border-gray-200 shadow-lg rounded-xl"
            >
              <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.fotoUrl} />
                  <AvatarFallback className="bg-[#EA610B] text-white text-sm font-medium">
                    {user?.nome
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{user?.nome || 'Usuário'}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email || ''}
                  </span>
                </div>
              </div>
              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => setLocation('/configuracoes')}
                  className="cursor-pointer rounded-lg hover:bg-orange-50 hover:text-[#EA610B] focus:bg-orange-50 focus:text-[#EA610B] transition-all duration-200"
                >
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation('/configuracoes')}
                  className="cursor-pointer rounded-lg hover:bg-orange-50 hover:text-[#EA610B] focus:bg-orange-50 focus:text-[#EA610B] transition-all duration-200"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-gray-100" />
              <div className="p-1">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-lg text-[#E74C3C] hover:bg-red-50 hover:text-[#E74C3C] focus:bg-red-50 focus:text-[#E74C3C] transition-all duration-200"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
