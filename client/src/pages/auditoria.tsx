import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Calendar, User, Activity, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  descricao: string;
  dadosAnteriores?: any;
  dadosNovos?: any;
  ipOrigem?: string;
  userAgent?: string;
  createdAt: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    fotoUrl?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AuditoriaPage() {
  const { token, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    acao: 'all',
    entidade: 'all',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [pagination.page, isAdmin]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.acao && filters.acao !== 'all' && { acao: filters.acao }),
        ...(filters.entidade && filters.entidade !== 'all' && { entidade: filters.entidade }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar logs de auditoria');
      }

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      acao: 'all',
      entidade: 'all',
      startDate: '',
      endDate: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    setTimeout(fetchAuditLogs, 0);
  };

  const getAcaoBadgeColor = (acao: string) => {
    switch (acao) {
      case 'create':
        return 'bg-green-500';
      case 'update':
        return 'bg-blue-500';
      case 'delete':
        return 'bg-red-500';
      case 'login':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      create: 'Criação',
      update: 'Atualização',
      delete: 'Exclusão',
      login: 'Login',
      logout: 'Logout',
    };
    return labels[acao] || acao;
  };

  const getEntidadeLabel = (entidade: string) => {
    const labels: Record<string, string> = {
      users: 'Usuários',
      clients: 'Clientes',
      appointments: 'Agendamentos',
      visits: 'Visitas',
      assignments: 'Atribuições',
      comments: 'Comentários',
    };
    return labels[entidade] || entidade;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="saber-card w-full max-w-md">
          <CardHeader className="saber-card-header">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#EA610B]" />
              </div>
              Acesso Restrito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página. Apenas administradores podem visualizar logs de auditoria.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Shield className="h-6 w-6 text-[#EA610B]" />
          </div>
          Auditoria
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize e monitore todas as ações realizadas no sistema
        </p>
      </div>

      {/* Filtros */}
      <Card className="saber-card">
        <CardHeader className="saber-card-header">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Filter className="h-4 w-4 text-blue-600" />
            </div>
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar na descrição..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9 border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ação</label>
              <Select value={filters.acao} onValueChange={(value) => handleFilterChange('acao', value)}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-xl">
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="create">Criação</SelectItem>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Entidade</label>
              <Select value={filters.entidade} onValueChange={(value) => handleFilterChange('entidade', value)}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Todas as entidades" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-xl">
                  <SelectItem value="all">Todas as entidades</SelectItem>
                  <SelectItem value="users">Usuários</SelectItem>
                  <SelectItem value="clients">Clientes</SelectItem>
                  <SelectItem value="appointments">Agendamentos</SelectItem>
                  <SelectItem value="visits">Visitas</SelectItem>
                  <SelectItem value="assignments">Atribuições</SelectItem>
                  <SelectItem value="comments">Comentários</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data Início</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters} className="bg-[#EA610B] hover:bg-orange-600 text-white">
              <Search className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={clearFilters} className="hover:bg-gray-100">
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <div className="space-y-4">
        {loading ? (
          <Card className="saber-card">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Carregando logs...</p>
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <Card className="saber-card">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Nenhum log encontrado</p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="saber-card p-6 animate-scale-in">
              <div className="flex items-start gap-4">
                <Avatar className="border-2 border-orange-100">
                  <AvatarImage src={log.usuario?.fotoUrl} />
                  <AvatarFallback className="bg-orange-100 text-[#EA610B]">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{log.usuario?.nome || 'Sistema'}</span>
                      <Badge className={getAcaoBadgeColor(log.acao)}>
                        {getAcaoLabel(log.acao)}
                      </Badge>
                      <Badge variant="outline" className="border-gray-200">{getEntidadeLabel(log.entidade)}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(log.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>

                  <p className="text-sm text-foreground">{log.descricao}</p>

                  {log.ipOrigem && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-gray-50 p-2 rounded-lg">
                      <span>IP: {log.ipOrigem}</span>
                      {log.userAgent && (
                        <span className="truncate max-w-md">
                          User Agent: {log.userAgent}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <Card className="saber-card">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} logs)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
