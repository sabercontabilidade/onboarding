import { useQuery } from "@tanstack/react-query";
import type { DashboardMetrics } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsGrid from "@/components/dashboard/metrics-grid";
import OnboardingPipeline from "@/components/dashboard/onboarding-pipeline";
import UpcomingSchedule from "@/components/dashboard/upcoming-schedule";
import RecentActivity from "@/components/dashboard/recent-activity";
import ClientOverview from "@/components/dashboard/client-overview";
import { useState } from "react";
import NewClientModal from "@/components/modals/new-client-modal";

export default function Dashboard() {
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const handleAddClient = () => {
    setIsNewClientModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Header 
            title="Dashboard" 
            subtitle="Visão geral do processo de onboarding"
            onAddClient={handleAddClient}
          />
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center">Carregando...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Header 
          title="Dashboard" 
          subtitle="Visão geral do processo de onboarding"
          onAddClient={handleAddClient}
        />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <MetricsGrid 
            activeClients={metrics?.activeClients || 0}
            onboardingClients={metrics?.onboardingClients || 0}
            todayMeetings={metrics?.todayMeetings || 0}
            scheduledVisits={metrics?.scheduledVisits || 0}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OnboardingPipeline clients={metrics?.onboardingClientsList || []} />
            </div>
            <UpcomingSchedule appointments={metrics?.upcomingAppointments || []} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity activities={metrics?.recentActivities || []} />
            <div className="bg-card border border-border rounded-lg">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Status das Integrações</h2>
                  <button className="text-muted-foreground hover:text-foreground">
                    <i className="fas fa-sync-alt w-4 h-4"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500">
                    <i className="fab fa-google text-white w-4 h-4"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Google Calendar</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Desconectado</span>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <i className="fas fa-cog w-4 h-4"></i>
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500">
                    <i className="fab fa-google text-white w-4 h-4"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Gmail</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Desconectado</span>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <i className="fas fa-cog w-4 h-4"></i>
                  </button>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <button className="w-full bg-muted text-muted-foreground py-2 rounded-md text-sm hover:bg-muted/80 transition-colors">
                    Configurar Integrações
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <ClientOverview />
        </div>
      </main>

      <NewClientModal 
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
      />
    </div>
  );
}
