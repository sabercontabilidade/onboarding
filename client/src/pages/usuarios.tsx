import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, Search, Edit, Power, Shield, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  nome: string;
  email: string;
  funcao: 'comercial' | 'integracao' | 'onboarding' | 'admin';
  nivelPermissao: 'administrador' | 'operador' | 'analista';
  fotoUrl?: string;
  telefone?: string;
  ativo: boolean;
  bloqueado: boolean;
  ultimoLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  nome: string;
  email: string;
  senha?: string;
  funcao: string;
  nivelPermissao: string;
  telefone: string;
  fotoUrl: string;
}

export function UsuariosPage() {
  const { token, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    nome: '',
    email: '',
    senha: '',
    funcao: 'onboarding',
    nivelPermissao: 'operador',
    telefone: '',
    fotoUrl: '',
  });

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar usuários');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar usuário');
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso',
      });

      setIsCreateModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const updateData = { ...formData };
      if (!updateData.senha) {
        delete updateData.senha;
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar usuário');
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      });

      setIsEditModalOpen(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar status do usuário');
      }

      toast({
        title: 'Sucesso',
        description: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      senha: '',
      funcao: user.funcao,
      nivelPermissao: user.nivelPermissao,
      telefone: user.telefone || '',
      fotoUrl: user.fotoUrl || '',
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      funcao: 'onboarding',
      nivelPermissao: 'operador',
      telefone: '',
      fotoUrl: '',
    });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFuncaoLabel = (funcao: string) => {
    const labels: Record<string, string> = {
      comercial: 'Comercial',
      integracao: 'Integração',
      onboarding: 'Onboarding',
      admin: 'Administrador',
    };
    return labels[funcao] || funcao;
  };

  const getNivelPermissaoLabel = (nivel: string) => {
    const labels: Record<string, string> = {
      administrador: 'Administrador',
      operador: 'Operador',
      analista: 'Analista',
    };
    return labels[nivel] || nivel;
  };

  const getNivelPermissaoBadgeColor = (nivel: string) => {
    switch (nivel) {
      case 'administrador':
        return 'bg-red-500';
      case 'operador':
        return 'bg-blue-500';
      case 'analista':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
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
              Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-[#EA610B]" />
            </div>
            Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários e suas permissões no sistema
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-[#EA610B] hover:bg-orange-600 text-white shadow-sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="saber-modal max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@saber.com.br"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <Input
                  id="senha"
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="funcao">Função *</Label>
                <Select value={formData.funcao} onValueChange={(value) => setFormData({ ...formData, funcao: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="integracao">Integração</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivelPermissao">Nível de Permissão *</Label>
                <Select
                  value={formData.nivelPermissao}
                  onValueChange={(value) => setFormData({ ...formData, nivelPermissao: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="analista">Analista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="fotoUrl">URL da Foto</Label>
                <Input
                  id="fotoUrl"
                  value={formData.fotoUrl}
                  onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="hover:bg-gray-100">
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} className="bg-[#EA610B] hover:bg-orange-600 text-white">Criar Usuário</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <Card className="saber-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 border-gray-200 focus:border-[#EA610B] focus:ring-[#EA610B]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <Card className="saber-card col-span-full">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Carregando usuários...</p>
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="saber-card col-span-full">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Nenhum usuário encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="saber-card animate-scale-in">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-orange-100">
                      <AvatarImage src={user.fotoUrl} />
                      <AvatarFallback className="bg-orange-100 text-[#EA610B] font-semibold">
                        {user.nome.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{user.nome}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getNivelPermissaoBadgeColor(user.nivelPermissao)}>
                    {getNivelPermissaoLabel(user.nivelPermissao)}
                  </Badge>
                  <Badge variant="outline" className="border-gray-200">{getFuncaoLabel(user.funcao)}</Badge>
                  <Badge className={user.ativo ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}>
                    {user.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {user.telefone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {user.telefone}
                  </div>
                )}

                {user.ultimoLogin && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Último login: {format(new Date(user.ultimoLogin), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]" onClick={() => openEditModal(user)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={user.ativo ? 'destructive' : 'default'}
                    size="sm"
                    className={`flex-1 ${!user.ativo ? 'bg-[#EA610B] hover:bg-orange-600 text-white' : ''}`}
                    onClick={() => handleToggleUserStatus(user.id, user.ativo)}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    {user.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="saber-modal max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize os dados do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome Completo *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-senha">Nova Senha (deixe vazio para manter)</Label>
              <Input
                id="edit-senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-funcao">Função *</Label>
              <Select value={formData.funcao} onValueChange={(value) => setFormData({ ...formData, funcao: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="integracao">Integração</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nivelPermissao">Nível de Permissão *</Label>
              <Select
                value={formData.nivelPermissao}
                onValueChange={(value) => setFormData({ ...formData, nivelPermissao: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="analista">Analista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-fotoUrl">URL da Foto</Label>
              <Input
                id="edit-fotoUrl"
                value={formData.fotoUrl}
                onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="hover:bg-gray-100">
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} className="bg-[#EA610B] hover:bg-orange-600 text-white">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
