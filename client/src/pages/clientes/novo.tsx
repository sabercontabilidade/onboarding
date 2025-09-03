import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft, Building, Users, Plus, X } from 'lucide-react'
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
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  cargo: z.string().optional(),
})

const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome da empresa é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ deve ter pelo menos 14 caracteres'),
  data_inicio_contrato: z.string().optional(),
  contatos_empresa: z.array(contatoSchema).default([]),
  canais: z.array(z.string()).default([]),
  status_onboarding: z.enum(['INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'SUSPENSO']).default('INICIADO'),
  status_relacionamento: z.enum(['PENDENTE', 'ATIVO', 'INATIVO']).default('PENDENTE'),
  responsavel_followup_id: z.number().optional(),
  observacoes: z.string().optional(),
})

type ClienteFormData = z.infer<typeof clienteSchema>

const canaisDisponiveis = [
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TEAMS', label: 'Microsoft Teams' },
  { value: 'PRESENCIAL', label: 'Presencial' },
]

export function NovoClientePage() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [contatos, setContatos] = useState<Array<z.infer<typeof contatoSchema>>>([])
  const [canaisSelecionados, setCanaisSelecionados] = useState<string[]>([])
  const [novoContato, setNovoContato] = useState<z.infer<typeof contatoSchema>>({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
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

  const createClientMutation = useMutation({
    mutationFn: (data: ClienteFormData) => api.clients.create({
      ...data,
      contatos_empresa: contatos,
      canais: canaisSelecionados,
    }),
    onSuccess: () => {
      toast({
        title: 'Cliente criado com sucesso!',
        description: 'O cliente foi cadastrado e os agendamentos obrigatórios foram criados.',
      })
      invalidateQueries(['/api/clientes'])
      setLocation('/clientes')
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar cliente',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: ClienteFormData) => {
    createClientMutation.mutate(data)
  }

  const adicionarContato = () => {
    if (novoContato.nome) {
      setContatos([...contatos, novoContato])
      setNovoContato({ nome: '', email: '', telefone: '', cargo: '' })
    }
  }

  const removerContato = (index: number) => {
    setContatos(contatos.filter((_, i) => i !== index))
  }

  const toggleCanal = (canal: string) => {
    setCanaisSelecionados(prev => 
      prev.includes(canal) 
        ? prev.filter(c => c !== canal)
        : [...prev, canal]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Cliente</h1>
          <p className="text-muted-foreground">
            Cadastre um novo cliente e configure o processo de onboarding
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Empresa ABC Ltda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ *</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="data_inicio_contrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início do Contrato</FormLabel>
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
                Contatos da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    placeholder="Cargo"
                    value={novoContato.cargo}
                    onChange={(e) => setNovoContato({...novoContato, cargo: e.target.value})}
                  />
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={novoContato.email}
                    onChange={(e) => setNovoContato({...novoContato, email: e.target.value})}
                  />
                  <Input
                    placeholder="Telefone"
                    value={novoContato.telefone}
                    onChange={(e) => setNovoContato({...novoContato, telefone: e.target.value})}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarContato}
                  disabled={!novoContato.nome}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Contato
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Canais de Comunicação */}
          <Card>
            <CardHeader>
              <CardTitle>Canais de Comunicação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {canaisDisponiveis.map((canal) => (
                  <Badge
                    key={canal.value}
                    variant={canaisSelecionados.includes(canal.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCanal(canal.value)}
                  >
                    {canal.label}
                  </Badge>
                ))}
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
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}