import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function Clients() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Clientes" 
          subtitle="Gerencie todos os seus clientes"
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center text-muted-foreground">
            Página de clientes em desenvolvimento
          </div>
        </div>
      </main>
    </div>
  );
}
