import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useParams } from 'wouter'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, Building, Users, Plus, X, Search, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { api, invalidateQueries } from '@/lib/api'

const contatoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
})

// Validação de CNPJ
function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '')
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false
  
  let soma = 0
  let peso = 2
  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  let digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  
  soma = 0
  peso = 2
  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  let digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  
  return digito1 === parseInt(cnpj.charAt(12)) && digito2 === parseInt(cnpj.charAt(13))
}

// Máscara para CNPJ
function formatarCNPJ(value: string): string {
  const cnpj = value.replace(/\D/g, '')
  return cnpj
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome da empresa é obrigatório'),
  cnpj: z.string().min(1, 'CNPJ é obrigatório').refine(validarCNPJ, 'CNPJ inválido'),
  data_inicio_contrato: z.string().min(1, 'Data de início do contrato é obrigatória'),
  contatos_empresa: z.array(contatoSchema).default([]),
  canais: z.array(z.string()).default([]),
  status_onboarding: z.enum(['INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'SUSPENSO']).default('INICIADO'),
  status_relacionamento: z.enum(['PENDENTE', 'ATIVO', 'INATIVO']).default('PENDENTE'),
  responsavel_followup_id: z.number().optional(),
  observacoes: z.string().optional(),
})

type ClienteFormData = z.infer<typeof clienteSchema>


export function EditarClientePage() {
  const params = useParams()
  const clientId = params.id
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [contatos, setContatos] = useState<Array<z.infer<typeof contatoSchema>>>([])
  const [novoContato, setNovoContato] = useState<z.infer<typeof contatoSchema>>({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
  })

  // Buscar dados do cliente
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: () => api.clients.get(clientId!),
    enabled: !!clientId,
  })

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: '',
      cnpj: '',
      data_inicio_contrato: '',
      contatos_empresa: [],
      canais: [],
      status_onboarding: 'INICIADO',
      status_relacionamento: 'PENDENTE',
      observacoes: '',
    },
  })

  // Preencher formulário com dados do cliente quando carregados
  useEffect(() => {
    if (client) {
      form.setValue('nome', client.companyName || '')
      form.setValue('cnpj', client.cnpj || '')
      form.setValue('observacoes', client.notes || '')
      
      // Criar contato principal com dados do cliente
      if (client.contactName || client.contactEmail || client.contactPhone) {
        const contatoPrincipal = {
          nome: client.contactName || 'Contato Principal',
          email: client.contactEmail || '',
          telefone: client.contactPhone || '',
          cargo: 'Responsável',
        }
        setContatos([contatoPrincipal])
        form.setValue('contatos_empresa', [contatoPrincipal])
      }
    }
  }, [client, form])

  const updateClientMutation = useMutation({
    mutationFn: (data: ClienteFormData) => {
      // Converter dados do frontend para o formato do backend
      const firstContact = contatos[0] || { nome: '', email: '', telefone: '' }
      
      const backendData = {
        companyName: data.nome,
        cnpj: data.cnpj,
        contactName: firstContact.nome || 'Sem contato',
        contactEmail: firstContact.email || '',
        contactPhone: firstContact.telefone || '',
        notes: data.observacoes || '',
      }
      
      return api.clients.update(clientId!, backendData)
    },
    onSuccess: () => {
      toast({
        title: 'Cliente atualizado com sucesso!',
        description: 'As informações do cliente foram atualizadas.',
      })
      invalidateQueries(['/api/clients'])
      invalidateQueries([`/api/clients/${clientId}`])
      setLocation('/clientes')
    },
    onError: (error) => {
      console.error('Erro ao atualizar cliente:', error)
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message || 'Erro desconhecido ao atualizar cliente',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: ClienteFormData) => {
    // Validar se há pelo menos um contato
    if (contatos.length === 0) {
      toast({
        title: 'Contato obrigatório',
        description: 'É necessário ter pelo menos um contato da empresa.',
        variant: 'destructive',
      })
      return
    }
    
    // Adicionar contatos ao form data
    const dataWithContacts = {
      ...data,
      contatos_empresa: contatos
    }
    
    updateClientMutation.mutate(dataWithContacts)
  }

  const adicionarContato = () => {
    if (novoContato.nome && novoContato.email && novoContato.telefone && novoContato.cargo) {
      const novosContatos = [...contatos, novoContato]
      setContatos(novosContatos)
      form.setValue('contatos_empresa', novosContatos)
      setNovoContato({ nome: '', email: '', telefone: '', cargo: '' })
    }
  }

  const removerContato = (index: number) => {
    const novosContatos = contatos.filter((_, i) => i !== index)
    setContatos(novosContatos)
    form.setValue('contatos_empresa', novosContatos)
  }


  if (isLoadingClient) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-2">Cliente não encontrado</h2>
        <p className="text-muted-foreground mb-4">O cliente que você está procurando não existe.</p>
        <Button onClick={() => setLocation('/clientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Clientes
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Cliente</h1>
          <p className="text-muted-foreground">
            Atualize as informações do cliente {client.companyName}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nome da empresa */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Empresa ABC Ltda" 
                        {...field}
                        data-testid="input-nome-empresa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo CNPJ */}
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="00.000.000/0000-00" 
                        {...field}
                        data-testid="input-cnpj"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="data_inicio_contrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início do Contrato *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status_onboarding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Onboarding</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INICIADO">Iniciado</SelectItem>
                          <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                          <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                          <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status_relacionamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status Relacionamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDENTE">Pendente</SelectItem>
                          <SelectItem value="ATIVO">Ativo</SelectItem>
                          <SelectItem value="INATIVO">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações sobre o cliente..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contatos da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contatos da Empresa *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contatos.length === 0 && (
                <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-800">
                    ⚠️ É obrigatório ter pelo menos um contato da empresa com todos os campos preenchidos.
                  </p>
                </div>
              )}
              
              {/* Lista de contatos */}
              {contatos.length > 0 && (
                <div className="space-y-2">
                  {contatos.map((contato, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{contato.nome}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {contato.cargo && <span>{contato.cargo}</span>}
                          {contato.email && <span>{contato.email}</span>}
                          {contato.telefone && <span>{contato.telefone}</span>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerContato(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Formulário para novo contato */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Adicionar Contato</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Nome *"
                    value={novoContato.nome}
                    onChange={(e) => setNovoContato({...novoContato, nome: e.target.value})}
                  />
                  <Input
                    placeholder="Cargo *"
                    value={novoContato.cargo}
                    onChange={(e) => setNovoContato({...novoContato, cargo: e.target.value})}
                  />
                  <Input
                    type="email"
                    placeholder="E-mail *"
                    value={novoContato.email}
                    onChange={(e) => setNovoContato({...novoContato, email: e.target.value})}
                  />
                  <Input
                    placeholder="Telefone *"
                    value={novoContato.telefone}
                    onChange={(e) => setNovoContato({...novoContato, telefone: e.target.value})}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarContato}
                  disabled={!novoContato.nome || !novoContato.email || !novoContato.telefone || !novoContato.cargo}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Contato
                </Button>
              </div>
            </CardContent>
          </Card>


          {/* Botões */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/clientes')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending ? 'Atualizando...' : 'Atualizar Cliente'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}