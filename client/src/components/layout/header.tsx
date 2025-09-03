interface HeaderProps {
  title: string;
  subtitle?: string;
  onAddClient?: () => void;
}

export default function Header({ title, subtitle, onAddClient }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="header-title">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground" data-testid="header-subtitle">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors" data-testid="button-notifications">
            <i className="fas fa-bell w-5 h-5"></i>
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
              0
            </span>
          </button>
          
          {onAddClient && (
            <button 
              onClick={onAddClient}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
              data-testid="button-add-client"
            >
              <i className="fas fa-plus w-4 h-4 mr-2"></i>
              Novo Cliente
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
