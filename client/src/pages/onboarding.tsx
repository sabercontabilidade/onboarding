import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function Onboarding() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Onboarding" 
          subtitle="Gerencie o processo de onboarding"
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center text-muted-foreground">
            Página de onboarding em desenvolvimento
          </div>
        </div>
      </main>
    </div>
  );
}
