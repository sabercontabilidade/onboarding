import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  CalendarIcon,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Building2,
  Calendar as CalendarIconSolid,
  MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ExportClientsButton, ExportAppointmentsButton, ExportVisitsButton } from '@/components/export-buttons';

// Cores para gráficos - Paleta SABER
const COLORS = ['#EA610B', '#2ECC71', '#3498DB', '#F1C40F', '#9B59B6', '#E74C3C'];

const STATUS_COLORS = {
  pending: '#F1C40F',
  onboarding: '#EA610B',
  active: '#2ECC71',
  inactive: '#6b7280',
};

type DateRange = {
  from: Date;
  to: Date;
};

export default function RelatoriosPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [selectedPeriod, setSelectedPeriod] = useState('last30days');

  // Queries para dados
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.clients.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.appointments.list(),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => api.visits.list(),
  });

  const { data: dashboardCounts } = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: () => api.dashboard.counts(),
  });

  const { data: onboardingStats } = useQuery({
    queryKey: ['onboarding-stats'],
    queryFn: () => api.onboarding.stats(),
  });

  // Handlers para período
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();

    switch (period) {
      case 'last7days':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'last30days':
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'last3months':
        setDateRange({ from: subMonths(now, 3), to: now });
        break;
      case 'thisYear':
        setDateRange({ from: startOfYear(now), to: now });
        break;
    }
  };

  // Calcular métricas
  const clientsByStatus = [
    { name: 'Pendentes', value: clients.filter((c: any) => c.status === 'pending').length, color: STATUS_COLORS.pending },
    { name: 'Em Onboarding', value: clients.filter((c: any) => c.status === 'onboarding').length, color: STATUS_COLORS.onboarding },
    { name: 'Ativos', value: clients.filter((c: any) => c.status === 'active').length, color: STATUS_COLORS.active },
    { name: 'Inativos', value: clients.filter((c: any) => c.status === 'inactive').length, color: STATUS_COLORS.inactive },
  ].filter(item => item.value > 0);

  const appointmentsByType = [
    { name: 'Reuniões', value: appointments.filter((a: any) => a.type === 'meeting').length },
    { name: 'Visitas', value: appointments.filter((a: any) => a.type === 'visit').length },
    { name: 'Ligações', value: appointments.filter((a: any) => a.type === 'call').length },
    { name: 'Follow-ups', value: appointments.filter((a: any) => a.type === 'followup').length },
  ].filter(item => item.value > 0);

  const appointmentsByStatus = [
    { name: 'Agendados', value: appointments.filter((a: any) => a.status === 'scheduled').length },
    { name: 'Concluídos', value: appointments.filter((a: any) => a.status === 'completed').length },
    { name: 'Cancelados', value: appointments.filter((a: any) => a.status === 'cancelled').length },
    { name: 'Reagendados', value: appointments.filter((a: any) => a.status === 'rescheduled').length },
  ].filter(item => item.value > 0);

  const visitsByType = [
    { name: 'Técnica', value: visits.filter((v: any) => v.type === 'technical_visit').length },
    { name: 'Manutenção', value: visits.filter((v: any) => v.type === 'maintenance').length },
    { name: 'Treinamento', value: visits.filter((v: any) => v.type === 'training').length },
    { name: 'Follow-up', value: visits.filter((v: any) => v.type === 'follow_up').length },
  ].filter(item => item.value > 0);

  // Calcular taxa de conversão
  const conversionRate = clients.length > 0
    ? Math.round((clients.filter((c: any) => c.status === 'active').length / clients.length) * 100)
    : 0;

  // Satisfação média das visitas
  const visitsWithRating = visits.filter((v: any) => v.satisfaction_rating);
  const avgSatisfaction = visitsWithRating.length > 0
    ? (visitsWithRating.reduce((acc: number, v: any) => acc + v.satisfaction_rating, 0) / visitsWithRating.length).toFixed(1)
    : 'N/A';

  // Agrupar dados por mês para gráfico de tendência
  const monthlyData = (() => {
    const months: Record<string, { month: string; clientes: number; agendamentos: number; visitas: number }> = {};

    clients.forEach((c: any) => {
      const month = format(new Date(c.createdAt), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { month, clientes: 0, agendamentos: 0, visitas: 0 };
      months[month].clientes++;
    });

    appointments.forEach((a: any) => {
      const month = format(new Date(a.scheduledStart), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { month, clientes: 0, agendamentos: 0, visitas: 0 };
      months[month].agendamentos++;
    });

    visits.forEach((v: any) => {
      const month = format(new Date(v.date), 'MMM/yy', { locale: ptBR });
      if (!months[month]) months[month] = { month, clientes: 0, agendamentos: 0, visitas: 0 };
      months[month].visitas++;
    });

    return Object.values(months).slice(-6);
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Análise de métricas e indicadores de desempenho
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px] border-gray-200">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-xl">
              <SelectItem value="last7days">Últimos 7 dias</SelectItem>
              <SelectItem value="last30days">Últimos 30 dias</SelectItem>
              <SelectItem value="thisMonth">Este mês</SelectItem>
              <SelectItem value="last3months">Últimos 3 meses</SelectItem>
              <SelectItem value="thisYear">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="saber-card p-6 animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold text-foreground mt-1">{clients.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {clients.filter((c: any) => c.status === 'active').length} ativos
              </p>
            </div>
            <div className="w-12 h-12 bg-[#EA610B] rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="saber-card p-6 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Agendamentos</p>
              <p className="text-2xl font-bold text-foreground mt-1">{appointments.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {appointments.filter((a: any) => a.status === 'scheduled').length} pendentes
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
              <CalendarIconSolid className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="saber-card p-6 animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Visitas Realizadas</p>
              <p className="text-2xl font-bold text-foreground mt-1">{visits.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Satisfação média: {avgSatisfaction}/5
              </p>
            </div>
            <div className="w-12 h-12 bg-saber-success rounded-xl flex items-center justify-center shadow-sm">
              <MapPin className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="saber-card p-6 animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-foreground mt-1">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes ativos/total
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs com diferentes visualizações */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="visits">Visitas</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de tendência */}
            <Card className="col-span-2 saber-card">
              <CardHeader className="saber-card-header flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-foreground">Tendência Mensal</CardTitle>
                  <CardDescription>Evolução de clientes, agendamentos e visitas</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="clientes"
                      name="Clientes"
                      stackId="1"
                      stroke="#EA610B"
                      fill="#EA610B"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="agendamentos"
                      name="Agendamentos"
                      stackId="2"
                      stroke="#2ECC71"
                      fill="#2ECC71"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="visitas"
                      name="Visitas"
                      stackId="3"
                      stroke="#3498DB"
                      fill="#3498DB"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clientes */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-end">
            <ExportClientsButton />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Status dos clientes */}
            <Card className="saber-card">
              <CardHeader className="saber-card-header">
                <CardTitle className="text-lg text-foreground">Clientes por Status</CardTitle>
                <CardDescription>Distribuição atual dos clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {clientsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Métricas de onboarding */}
            <Card className="saber-card">
              <CardHeader className="saber-card-header">
                <CardTitle className="text-lg text-foreground">Progresso do Onboarding</CardTitle>
                <CardDescription>Status dos processos de onboarding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <span className="text-sm font-medium text-foreground">Em Onboarding</span>
                    <span className="text-2xl font-bold text-[#EA610B]">
                      {clients.filter((c: any) => c.status === 'onboarding').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-sm font-medium text-foreground">Concluídos (Ativos)</span>
                    <span className="text-2xl font-bold text-saber-success">
                      {clients.filter((c: any) => c.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <span className="text-sm font-medium text-foreground">Pendentes</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      {clients.filter((c: any) => c.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-sm font-medium text-foreground">Taxa de Sucesso</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {conversionRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agendamentos */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex justify-end">
            <ExportAppointmentsButton />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Por tipo */}
            <Card className="saber-card">
              <CardHeader className="saber-card-header">
                <CardTitle className="text-lg text-foreground">Agendamentos por Tipo</CardTitle>
                <CardDescription>Distribuição por tipo de agendamento</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={appointmentsByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="value" fill="#EA610B" name="Quantidade" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Por status */}
            <Card className="saber-card">
              <CardHeader className="saber-card-header">
                <CardTitle className="text-lg text-foreground">Agendamentos por Status</CardTitle>
                <CardDescription>Status atual dos agendamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={appointmentsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {appointmentsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Visitas */}
        <TabsContent value="visits" className="space-y-4">
          <div className="flex justify-end">
            <ExportVisitsButton />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Por tipo */}
            <Card className="saber-card">
              <CardHeader className="saber-card-header">
                <CardTitle className="text-lg text-foreground">Visitas por Tipo</CardTitle>
                <CardDescription>Distribuição por tipo de visita</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={visitsByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="value" fill="#2ECC71" name="Quantidade" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Satisfação */}
            <Card className="saber-card">
              <CardHeader className="saber-card-header">
                <CardTitle className="text-lg text-foreground">Satisfação das Visitas</CardTitle>
                <CardDescription>Avaliação média dos clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[300px]">
                  <div className="text-6xl font-bold text-saber-success">
                    {avgSatisfaction}
                  </div>
                  <div className="text-lg text-muted-foreground mt-2">
                    de 5.0
                  </div>
                  <div className="text-sm text-muted-foreground mt-4">
                    Baseado em {visitsWithRating.length} avaliações
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
