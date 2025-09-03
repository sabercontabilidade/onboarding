import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();

  const navigationItems = [
    { path: "/", icon: "fas fa-home", label: "Dashboard", count: null },
    { path: "/clients", icon: "fas fa-users", label: "Clientes", count: null },
    { path: "/onboarding", icon: "fas fa-user-plus", label: "Onboarding", count: 3 },
    { path: "/appointments", icon: "fas fa-calendar", label: "Agendamentos", count: null },
    { path: "/visits", icon: "fas fa-tools", label: "Visitas Técnicas", count: null },
    { path: "/notifications", icon: "fas fa-envelope", label: "Notificações", count: null },
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
            <i className="fas fa-chart-line text-primary-foreground text-sm"></i>
          </div>
          <div>
            <h1 className="font-semibold text-foreground">SABER</h1>
            <p className="text-xs text-muted-foreground">Onboarding System</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1" data-testid="nav-menu">
        {navigationItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
          >
            <a className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${
              isActive(item.path)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}>
              <i className={`${item.icon} w-4 h-4`}></i>
              <span>{item.label}</span>
              {item.count && (
                <span className="ml-auto bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </a>
          </Link>
        ))}
        
        <div className="pt-4 border-t border-border mt-4">
          <Link href="/settings">
            <a className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" data-testid="nav-settings">
              <i className="fas fa-cog w-4 h-4"></i>
              <span>Configurações</span>
            </a>
          </Link>
          <Link href="/help">
            <a className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" data-testid="nav-help">
              <i className="fas fa-question-circle w-4 h-4"></i>
              <span>Ajuda</span>
            </a>
          </Link>
        </div>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <i className="fas fa-user text-muted-foreground text-sm"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="user-name">João Silva</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="user-role">Contador Sênior</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-logout">
            <i className="fas fa-sign-out-alt w-4 h-4"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}
