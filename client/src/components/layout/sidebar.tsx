import { Link, useLocation } from "wouter";
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
  Building2
} from 'lucide-react';

export default function Sidebar() {
  const [location] = useLocation();

  const navigationItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard", count: null },
    { path: "/clientes", icon: Users, label: "Clientes", count: null },
    { path: "/onboarding", icon: UserPlus, label: "Onboarding", count: 3 },
    { path: "/agendamentos", icon: Calendar, label: "Agendamentos", count: null },
    { path: "/visitas", icon: Wrench, label: "Visitas Técnicas", count: null },
    { path: "/notificacoes", icon: Bell, label: "Notificações", count: null },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/" || location === "/dashboard";
    }
    return location.startsWith(path);
  };

  return (
    <aside className="w-64 bg-card border-r border-border sidebar-shadow flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">SABER</h1>
            <p className="text-xs text-muted-foreground">Onboarding System</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1" data-testid="nav-menu">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
                <IconComponent className="w-4 h-4" />
                <span>{item.label}</span>
                {item.count && (
                  <span className="ml-auto bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        
        <div className="pt-4 border-t border-border mt-4">
          <Link href="/configuracoes">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" data-testid="nav-settings">
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </div>
          </Link>
          <Link href="/ajuda">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" data-testid="nav-help">
              <HelpCircle className="w-4 h-4" />
              <span>Ajuda</span>
            </div>
          </Link>
        </div>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="user-name">João Silva</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="user-role">Contador Sênior</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
