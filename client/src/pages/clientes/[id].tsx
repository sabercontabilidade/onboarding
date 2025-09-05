import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'wouter'
import { useState } from 'react'
import { 
  ArrowLeft, 
  Building, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  StickyNote,
  Upload,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const clientId = id || ''
  
  // Estado para controlar etapas concluídas (sincronizado com localStorage)
  const [completedStages, setCompletedStages] = useState<string[]>(() => {
    const savedStages = localStorage.getItem(`completedStages_${clientId}`)
    return savedStages ? JSON.parse(savedStages) : []
  })

  // Estado para anotações de cada etapa
  const [stageNotes, setStageNotes] = useState<{[key: string]: string}>(() => {
    const savedNotes = localStorage.getItem(`stageNotes_${clientId}`)
    return savedNotes ? JSON.parse(savedNotes) : {}
  })

  // Estado para controlar qual modal de anotação está aberto
  const [openNotesModal, setOpenNotesModal] = useState<string | null>(null)
  
  // Estado para controlar aviso de etapas anteriores
  const [showSequenceWarningModal, setShowSequenceWarningModal] = useState<boolean>(false)
  
  // Estado para controlar modal do Plano de Sucesso
  const [showPlanoSucessoModal, setShowPlanoSucessoModal] = useState<boolean>(false)
  
  // Estado para os dados do formulário do Plano de Sucesso
  const [planoSucessoData, setPlanoSucessoData] = useState({
    nomeCliente: '',
    telefoneEmail: '',
    dataInicioContrato: '',
    quantidadeCnpjs: '',
    cnpjsRegimeTributario: '',
    cnpjPrincipal: '',
    foiFeitoPlanejamento: '',
    detalhePlanejamento: '',
    motivosTrocaContador: '',
    havera_abertura_empresa: '',
    prazoAberturaRegime: '',
    empresaFolhaPagamento: '',
    haveraTranferenciaFuncionarios: '',
    funcionariosTransferidos: '',
    sistemaUtilizado: '',
    clientePossuiRiscos: '',
    clientePossuiTimeInterno: '',
    detalheTimeInterno: '',
    contatoAntigaContabilidade: '',
    contabilidadeComunicadaRescisao: '',
    perfilCliente: ''
  })
  
  const { data: client, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: () => api.clients.get(clientId),
  })

  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments', clientId],
    queryFn: () => api.clients.appointments(clientId),
  })

  const { data: visits } = useQuery({
    queryKey: ['/api/visits', clientId],
    queryFn: () => api.clients.visits(clientId),
  })
  
  // Função para marcar/desmarcar etapa como concluída
  const toggleStageCompletion = (stageId: string) => {
    const stageOrder = ['plano_sucesso', 'inicial', 'd5', 'd15', 'd50', 'd80', 'd100', 'd180']
    const currentIndex = stageOrder.indexOf(stageId)
    
    // Se está desmarcando, permite sempre
    if (completedStages.includes(stageId)) {
      const newCompletedStages = completedStages.filter(id => id !== stageId)
      setCompletedStages(newCompletedStages)
      localStorage.setItem(`completedStages_${clientId}`, JSON.stringify(newCompletedStages))
      window.dispatchEvent(new CustomEvent('localStorageChange'))
      return
    }
    
    // Se está marcando, verifica se a etapa anterior está concluída
    if (currentIndex > 0) {
      const previousStageId = stageOrder[currentIndex - 1]
      if (!completedStages.includes(previousStageId)) {
        setShowSequenceWarningModal(true)
        return
      }
    }
    
    // Se chegou até aqui, pode marcar como concluído
    const newCompletedStages = [...completedStages, stageId]
    setCompletedStages(newCompletedStages)
    localStorage.setItem(`completedStages_${clientId}`, JSON.stringify(newCompletedStages))
    window.dispatchEvent(new CustomEvent('localStorageChange'))
  }

  // Função para salvar anotação de uma etapa
  const saveStageNote = (stageId: string, note: string) => {
    const newNotes = { ...stageNotes, [stageId]: note }
    setStageNotes(newNotes)
    localStorage.setItem(`stageNotes_${clientId}`, JSON.stringify(newNotes))
  }

  // Função para lidar com upload de arquivos
  const handleFileUpload = (stageId: string) => {
    // Aqui você pode implementar a lógica de upload de arquivos
    alert(`Função de upload de arquivos para a etapa ${stageId} será implementada`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-2">Cliente não encontrado</h2>
        <p className="text-muted-foreground mb-4">O cliente que você está procurando não existe.</p>
        <Link href="/clientes">
          <Button>Voltar para Clientes</Button>
        </Link>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'onboarding': 'bg-blue-100 text-blue-700',
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-red-100 text-red-700',
      'pending': 'bg-gray-100 text-gray-700',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'onboarding': 'Onboarding',
      'active': 'Ativo',
      'inactive': 'Inativo',
      'pending': 'Pendente',
    }
    return labels[status as keyof typeof labels] || status
  }

  // Calcular etapas obrigatórias de follow-up
  // Verificar se o Plano de Sucesso foi preenchido
  const isPlanoSucessoCompleted = () => {
    return completedStages.includes('plano_sucesso')
  }

  const getFollowUpStages = () => {
    if (!client?.createdAt) return []
    
    const createdDate = dayjs(client.createdAt)
    const today = dayjs()
    
    const stages = [
      {
        id: 'plano_sucesso',
        title: 'Plano de Sucesso do Cliente',
        description: 'Preencher plano de sucesso para definir objetivos e expectativas do cliente',
        targetDate: createdDate,
        isOverdue: false,
        priority: 'high' as const,
        isCompleted: completedStages.includes('plano_sucesso'),
        isPlanoSucesso: true
      },
      {
        id: 'inicial',
        title: 'Follow-up da Reunião Inicial',
        description: 'Follow-up pós-onboarding para garantir que tudo está funcionando bem',
        targetDate: createdDate.add(3, 'day'),
        isOverdue: today.isAfter(createdDate.add(3, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('inicial')
      },
      {
        id: 'd5',
        title: 'D+5: Verificação de Integração',
        description: 'Verificar se a integração dos sistemas está funcionando corretamente',
        targetDate: createdDate.add(5, 'day'),
        isOverdue: today.isAfter(createdDate.add(5, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('d5')
      },
      {
        id: 'd15',
        title: 'D+15: Reforçar Presença',
        description: 'Garantir bom atendimento e reforçar presença da empresa',
        targetDate: createdDate.add(15, 'day'),
        isOverdue: today.isAfter(createdDate.add(15, 'day')),
        priority: 'medium' as const,
        isCompleted: completedStages.includes('d15')
      },
      {
        id: 'd50',
        title: 'D+50: Avaliação do 1º Ciclo',
        description: 'Avaliar percepção do cliente sobre o 1º ciclo (DP e Fiscal)',
        targetDate: createdDate.add(50, 'day'),
        isOverdue: today.isAfter(createdDate.add(50, 'day')),
        priority: 'medium' as const,
        isCompleted: completedStages.includes('d50')
      },
      {
        id: 'd80',
        title: 'D+80: Prevenção de Churn',
        description: 'Reforçar presença, entender satisfação e prevenir churn',
        targetDate: createdDate.add(80, 'day'),
        isOverdue: today.isAfter(createdDate.add(80, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('d80')
      },
      {
        id: 'd100',
        title: 'D+100: Fim do Onboarding Técnico',
        description: 'Informar fim do onboarding técnico e apresentar novos responsáveis',
        targetDate: createdDate.add(100, 'day'),
        isOverdue: today.isAfter(createdDate.add(100, 'day')),
        priority: 'high' as const,
        isCompleted: completedStages.includes('d100')
      },
      {
        id: 'd180',
        title: 'D+180: Avaliação de Satisfação',
        description: 'Medir grau de satisfação, receber sugestões e solicitar indicações',
        targetDate: createdDate.add(180, 'day'),
        isOverdue: today.isAfter(createdDate.add(180, 'day')),
        priority: 'medium' as const,
        isCompleted: completedStages.includes('d180')
      }
    ]
    
    return stages
  }

  const getPriorityColor = (priority: string, isOverdue: boolean, isCompleted: boolean) => {
    if (isCompleted) return 'bg-gray-50 text-gray-700 border-gray-300'
    if (isOverdue) return 'bg-gray-100 text-gray-700 border-gray-400'
    
    const colors = {
      'high': 'bg-gray-100 text-gray-800 border-gray-300',
      'medium': 'bg-gray-100 text-gray-700 border-gray-300',
      'low': 'bg-gray-50 text-gray-600 border-gray-200'
    }
    return colors[priority as keyof typeof colors] || colors.low
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{client.companyName}</h1>
            <Badge 
              variant="secondary" 
              className={getStatusColor(client.status)}
            >
              {getStatusLabel(client.status)}
            </Badge>
            {client.currentStage && (
              <Badge variant="outline">
                {client.currentStage.stage}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{client.cnpj}</span>
            <span>Cadastrado: {dayjs(client.createdAt).format('DD/MM/YYYY')}</span>
            {client.contactName && (
              <span>Contato: {client.contactName}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/onboarding">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Onboarding
            </Button>
          </Link>
          <Button asChild>
            <Link href={`/clientes/${client.id}/editar`}>
              <Settings className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="onboarding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="visitas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Visitas
          </TabsTrigger>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Dados & Canais
          </TabsTrigger>
        </TabsList>

        {/* Tab: Etapas Obrigatórias de Follow-up */}
        <TabsContent value="onboarding" className="space-y-6">
          
          {/* Modal de Aviso de Sequência */}
          <Dialog open={showSequenceWarningModal} onOpenChange={setShowSequenceWarningModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  Atenção
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-700">
                  Você deve concluir as etapas em ordem sequencial. Complete a etapa anterior primeiro.
                </p>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowSequenceWarningModal(false)}
                  className="w-20"
                >
                  OK
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal do Plano de Sucesso do Cliente */}
          <Dialog open={showPlanoSucessoModal} onOpenChange={setShowPlanoSucessoModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-orange-600">
                  Plano de Sucesso do Cliente
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Preencha as informações para definir os objetivos e expectativas do cliente
                </p>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Informações do Cliente */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-sm text-gray-700 mb-2">Cliente:</h3>
                  <p className="font-semibold">{client?.companyName}</p>
                  <p className="text-sm text-muted-foreground">{client?.contactName}</p>
                </div>

                {/* Formulário do Plano de Sucesso */}
                <div className="space-y-8">
                  
                  {/* Seção 1: Informações Básicas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                      Informações Básicas
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Nome do cliente *</label>
                        <input 
                          type="text"
                          value={planoSucessoData.nomeCliente}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, nomeCliente: e.target.value})}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Nome completo do cliente"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Telefone e e-mail de contato *</label>
                        <input 
                          type="text"
                          value={planoSucessoData.telefoneEmail}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, telefoneEmail: e.target.value})}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="(11) 99999-9999 - email@exemplo.com"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Data de início do contrato *</label>
                        <input 
                          type="date"
                          value={planoSucessoData.dataInicioContrato}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, dataInicioContrato: e.target.value})}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Quantos CNPJs o cliente possui? *</label>
                        <select 
                          value={planoSucessoData.quantidadeCnpjs}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, quantidadeCnpjs: e.target.value})}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Selecione</option>
                          <option value="1">1 CNPJ</option>
                          <option value="2">2 CNPJs</option>
                          <option value="3">3 CNPJs</option>
                          <option value="4+">4 ou mais CNPJs</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Informações Tributárias */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                      Informações Tributárias
                    </h3>
                    
                    <div>
                      <label className="text-sm font-medium">Informe o(s) CNPJ(s) e regime tributário da(s) empresa(s) que iremos atender *</label>
                      <Textarea 
                        value={planoSucessoData.cnpjsRegimeTributario}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, cnpjsRegimeTributario: e.target.value})}
                        placeholder="Ex: 12.345.678/0001-90 - Simples Nacional"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    {parseInt(planoSucessoData.quantidadeCnpjs) > 1 && (
                      <div>
                        <label className="text-sm font-medium">Se o cliente possuir mais de um CNPJ, existe um que seja principal? Se sim, qual?</label>
                        <input 
                          type="text"
                          value={planoSucessoData.cnpjPrincipal}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, cnpjPrincipal: e.target.value})}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="CNPJ principal ou 'Não possui'"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium">Foi feito planejamento tributário? *</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center">
                          <input 
                            type="radio" 
                            name="planejamento" 
                            value="Sim"
                            checked={planoSucessoData.foiFeitoPlanejamento === 'Sim'}
                            onChange={(e) => setPlanoSucessoData({...planoSucessoData, foiFeitoPlanejamento: e.target.value})}
                            className="mr-2"
                          />
                          Sim
                        </label>
                        <label className="flex items-center">
                          <input 
                            type="radio" 
                            name="planejamento" 
                            value="Não"
                            checked={planoSucessoData.foiFeitoPlanejamento === 'Não'}
                            onChange={(e) => setPlanoSucessoData({...planoSucessoData, foiFeitoPlanejamento: e.target.value})}
                            className="mr-2"
                          />
                          Não
                        </label>
                      </div>
                    </div>
                    
                    {planoSucessoData.foiFeitoPlanejamento === 'Sim' && (
                      <div>
                        <label className="text-sm font-medium">Detalhe abaixo o planejamento feito</label>
                        <Textarea 
                          value={planoSucessoData.detalhePlanejamento}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, detalhePlanejamento: e.target.value})}
                          placeholder="Descreva os detalhes do planejamento tributário realizado..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* Seção 3: Motivação e Contexto */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                      Motivação e Contexto
                    </h3>
                    
                    <div>
                      <label className="text-sm font-medium">Quais os motivos (dores) que levaram o cliente a trocar de contador? *</label>
                      <Textarea 
                        value={planoSucessoData.motivosTrocaContador}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, motivosTrocaContador: e.target.value})}
                        placeholder="Descreva os principais motivos e problemas enfrentados..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Haverá abertura de empresa? Se sim, qual o prazo máximo para a abertura e o regime tributário da nova empresa?</label>
                      <Textarea 
                        value={planoSucessoData.havera_abertura_empresa}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, havera_abertura_empresa: e.target.value})}
                        placeholder="Ex: Sim, prazo de 30 dias, Simples Nacional / Não"
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Seção 4: Recursos Humanos */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                      Recursos Humanos
                    </h3>
                    
                    <div>
                      <label className="text-sm font-medium">Empresa(s) com folha de pagamento? Quantos funcionários? Tem apontamentos? Qual a data de pagamento dos funcionários?</label>
                      <Textarea 
                        value={planoSucessoData.empresaFolhaPagamento}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, empresaFolhaPagamento: e.target.value})}
                        placeholder="Ex: Sim, 15 funcionários, sem apontamentos, pagamento dia 5"
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Haverá transferência de funcionários? Se sim, para qual empresa?</label>
                      <input 
                        type="text"
                        value={planoSucessoData.haveraTranferenciaFuncionarios}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, haveraTranferenciaFuncionarios: e.target.value})}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Ex: Sim, para empresa X / Não"
                      />
                    </div>
                    
                    {planoSucessoData.haveraTranferenciaFuncionarios.toLowerCase().includes('sim') && (
                      <div>
                        <label className="text-sm font-medium">Quais funcionários serão transferidos?</label>
                        <Textarea 
                          value={planoSucessoData.funcionariosTransferidos}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, funcionariosTransferidos: e.target.value})}
                          placeholder="Liste os funcionários que serão transferidos..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>

                  {/* Seção 5: Tecnologia e Processos */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                      Tecnologia e Processos
                    </h3>
                    
                    <div>
                      <label className="text-sm font-medium">Qual o sistema (software) utilizado pelo cliente? *</label>
                      <input 
                        type="text"
                        value={planoSucessoData.sistemaUtilizado}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, sistemaUtilizado: e.target.value})}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Ex: SAP, Totvs, Oracle, planilhas Excel, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Cliente possui riscos (contábeis, fiscais e trabalhistas)? Explique *</label>
                      <Textarea 
                        value={planoSucessoData.clientePossuiRiscos}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, clientePossuiRiscos: e.target.value})}
                        placeholder="Descreva os riscos identificados ou 'Não possui riscos'"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Seção 6: Time Interno e Relacionamento */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                      Time Interno e Relacionamento
                    </h3>
                    
                    <div>
                      <label className="text-sm font-medium">O cliente possui time interno? *</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center">
                          <input 
                            type="radio" 
                            name="timeInterno" 
                            value="Sim"
                            checked={planoSucessoData.clientePossuiTimeInterno === 'Sim'}
                            onChange={(e) => setPlanoSucessoData({...planoSucessoData, clientePossuiTimeInterno: e.target.value})}
                            className="mr-2"
                          />
                          Sim
                        </label>
                        <label className="flex items-center">
                          <input 
                            type="radio" 
                            name="timeInterno" 
                            value="Não"
                            checked={planoSucessoData.clientePossuiTimeInterno === 'Não'}
                            onChange={(e) => setPlanoSucessoData({...planoSucessoData, clientePossuiTimeInterno: e.target.value})}
                            className="mr-2"
                          />
                          Não
                        </label>
                      </div>
                    </div>
                    
                    {planoSucessoData.clientePossuiTimeInterno === 'Sim' && (
                      <div>
                        <label className="text-sm font-medium">Detalhe abaixo o nome, departamento e e-mail da(s) pessoa(s)</label>
                        <Textarea 
                          value={planoSucessoData.detalheTimeInterno}
                          onChange={(e) => setPlanoSucessoData({...planoSucessoData, detalheTimeInterno: e.target.value})}
                          placeholder="Ex: João Silva - Financeiro - joao@empresa.com"
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium">Qual o contato da antiga contabilidade?</label>
                      <input 
                        type="text"
                        value={planoSucessoData.contatoAntigaContabilidade}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, contatoAntigaContabilidade: e.target.value})}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Nome e telefone da contabilidade anterior"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">A contabilidade já foi comunicada da rescisão contratual? *</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center">
                          <input 
                            type="radio" 
                            name="rescisao" 
                            value="Sim"
                            checked={planoSucessoData.contabilidadeComunicadaRescisao === 'Sim'}
                            onChange={(e) => setPlanoSucessoData({...planoSucessoData, contabilidadeComunicadaRescisao: e.target.value})}
                            className="mr-2"
                          />
                          Sim
                        </label>
                        <label className="flex items-center">
                          <input 
                            type="radio" 
                            name="rescisao" 
                            value="Não"
                            checked={planoSucessoData.contabilidadeComunicadaRescisao === 'Não'}
                            onChange={(e) => setPlanoSucessoData({...planoSucessoData, contabilidadeComunicadaRescisao: e.target.value})}
                            className="mr-2"
                          />
                          Não
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Qual o perfil do cliente? Fale um pouco sobre ele *</label>
                      <Textarea 
                        value={planoSucessoData.perfilCliente}
                        onChange={(e) => setPlanoSucessoData({...planoSucessoData, perfilCliente: e.target.value})}
                        placeholder="Descreva o perfil, personalidade e características do cliente..."
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowPlanoSucessoModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      // Validação básica
                      const camposObrigatorios = [
                        'nomeCliente', 'telefoneEmail', 'dataInicioContrato', 'quantidadeCnpjs',
                        'cnpjsRegimeTributario', 'foiFeitoPlanejamento', 'motivosTrocaContador',
                        'sistemaUtilizado', 'clientePossuiRiscos', 'clientePossuiTimeInterno',
                        'contabilidadeComunicadaRescisao', 'perfilCliente'
                      ]
                      
                      const camposVazios = camposObrigatorios.filter(campo => !planoSucessoData[campo as keyof typeof planoSucessoData])
                      
                      if (camposVazios.length > 0) {
                        alert('Por favor, preencha todos os campos obrigatórios (marcados com *)')
                        return
                      }
                      
                      // Salvar no localStorage
                      localStorage.setItem(`planoSucesso_${clientId}`, JSON.stringify(planoSucessoData))
                      
                      // Marcar como concluído
                      const newCompletedStages = [...completedStages, 'plano_sucesso']
                      setCompletedStages(newCompletedStages)
                      localStorage.setItem(`completedStages_${clientId}`, JSON.stringify(newCompletedStages))
                      window.dispatchEvent(new CustomEvent('localStorageChange'))
                      
                      alert('Plano de Sucesso salvo com sucesso!')
                      setShowPlanoSucessoModal(false)
                    }}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Salvar Plano
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <div className="grid gap-4">
            {getFollowUpStages().map((stage, index) => {
              // Se não for o Plano de Sucesso e o Plano de Sucesso não foi preenchido, desabilitar o card
              const isDisabled = !stage.isPlanoSucesso && !isPlanoSucessoCompleted()
              
              return (
                <Card 
                  key={stage.id} 
                  className={`transition-all border-l-4 ${
                    isDisabled 
                      ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                      : 'hover:shadow-md'
                  } ${getPriorityColor(stage.priority, stage.isOverdue, stage.isCompleted)}`}
                >
                <CardContent className="p-6">
                  {isDisabled && !stage.isPlanoSucesso && (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-700 font-medium">
                        ⚠️ Esta etapa estará disponível após o preenchimento do "Plano de Sucesso do Cliente"
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isDisabled && !stage.isPlanoSucesso
                            ? 'bg-gray-100 border-gray-300'
                            : stage.isCompleted 
                              ? 'bg-gray-100 border-gray-400'
                              : stage.isOverdue 
                                ? 'bg-gray-200 border-gray-400' 
                                : stage.priority === 'high' 
                                  ? 'bg-gray-50 border-gray-300'
                                  : 'bg-gray-100 border-gray-300'
                        } border-2`}>
                          {isDisabled && !stage.isPlanoSucesso ? (
                            <Calendar className="h-6 w-6 text-gray-400" />
                          ) : stage.isCompleted ? (
                            <CheckCircle2 className="h-6 w-6 text-gray-600" />
                          ) : stage.isOverdue ? (
                            <AlertCircle className="h-6 w-6 text-gray-700" />
                          ) : stage.priority === 'high' ? (
                            <Star className="h-6 w-6 text-gray-600" />
                          ) : (
                            <Calendar className="h-6 w-6 text-gray-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{stage.title}</h3>
                          {stage.isCompleted ? (
                            <Badge variant="default" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                              Concluído
                            </Badge>
                          ) : stage.isOverdue ? (
                            <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 border-gray-400">
                              Atrasado
                            </Badge>
                          ) : !stage.isOverdue && dayjs().isAfter(stage.targetDate.subtract(7, 'day')) ? (
                            <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
                              Próximo
                            </Badge>
                          ) : null}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {stage.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className={stage.isOverdue ? 'text-gray-700 font-medium' : ''}>
                              Data prevista: {stage.targetDate.format('DD/MM/YYYY')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-muted-foreground">
                              {stage.targetDate.fromNow()}
                            </span>
                          </div>
                          
                          {stage.isOverdue && (
                            <div className="flex items-center gap-1 text-gray-700">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">
                                {Math.abs(dayjs().diff(stage.targetDate, 'day'))} dias em atraso
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      {stage.isPlanoSucesso ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowPlanoSucessoModal(true)}
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Preencher
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleStageCompletion(stage.id)}
                            disabled={isDisabled}
                            className={
                              isDisabled 
                                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                                : stage.isCompleted 
                                  ? "text-gray-600 border-gray-200 hover:bg-gray-50"
                                  : "text-green-600 border-green-200 hover:bg-green-50"
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {stage.isCompleted ? 'Desmarcar' : 'Marcar Concluído'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isDisabled}
                            className={isDisabled ? "text-gray-400 border-gray-200 cursor-not-allowed" : ""}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Agendar
                          </Button>
                        </>
                      )}
                      
                      {/* Botões de Anotações e Upload apenas para etapas que não são Plano de Sucesso */}
                      {!stage.isPlanoSucesso && (
                        <>
                          {/* Botão de Anotações */}
                          <Dialog 
                            open={openNotesModal === stage.id} 
                            onOpenChange={(open) => setOpenNotesModal(open ? stage.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={isDisabled}
                                className={isDisabled ? "text-gray-400 border-gray-200 cursor-not-allowed" : ""}
                              >
                                <StickyNote className="mr-2 h-4 w-4" />
                                Anotações
                                {stageNotes[stage.id] && (
                                  <div className="ml-1 w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Anotações - {stage.title}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Digite suas anotações para esta etapa..."
                                  value={stageNotes[stage.id] || ''}
                                  onChange={(e) => saveStageNote(stage.id, e.target.value)}
                                  className="min-h-[200px] text-sm"
                                />
                                <Button 
                                  onClick={() => setOpenNotesModal(null)}
                                  className="w-full"
                                >
                                  Salvar e Fechar
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {/* Botão de Upload */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFileUpload(stage.id)}
                            disabled={isDisabled}
                            className={
                              isDisabled 
                                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                                : "text-purple-600 border-purple-200 hover:bg-purple-50"
                            }
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
          
          {/* Resumo das Etapas */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Follow-up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">
                    {getFollowUpStages().filter(s => s.isCompleted).length}
                  </div>
                  <div className="text-sm text-orange-600 font-medium">Concluídas</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {getFollowUpStages().filter(s => !s.isCompleted && s.isOverdue).length}
                  </div>
                  <div className="text-sm text-red-600 font-medium">Atrasadas</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-600">
                    {getFollowUpStages().filter(s => !s.isCompleted && !s.isOverdue).length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Pendentes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Agendamentos */}
        <TabsContent value="agendamentos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments && appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-medium">{appointment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {dayjs(appointment.scheduledStart).format('DD/MM/YYYY - HH:mm')}
                          </p>
                          {appointment.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {appointment.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                        {appointment.status === 'completed' ? 'Realizado' : 
                         appointment.status === 'scheduled' ? 'Agendado' : 
                         appointment.status === 'cancelled' ? 'Cancelado' : appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum agendamento encontrado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Visitas (ATAs) */}
        <TabsContent value="visitas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visitas Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              {visits && visits.length > 0 ? (
                <div className="space-y-4">
                  {visits.map((visita: any) => (
                    <div key={visita.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{visita.tipo_visita}</h4>
                          <Badge variant="outline">
                            {dayjs(visita.data).format('DD/MM/YYYY')}
                          </Badge>
                        </div>
                        {visita.satisfacao && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-orange-400 text-orange-400" />
                            <span className="font-medium">{visita.satisfacao}/10</span>
                          </div>
                        )}
                      </div>
                      
                      {visita.participantes && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Participantes: {visita.participantes}
                        </p>
                      )}
                      
                      {visita.resumo && (
                        <p className="text-sm mb-3">{visita.resumo}</p>
                      )}
                      
                      {visita.decisoes && visita.decisoes.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-2">Decisões:</h5>
                          <ul className="space-y-1">
                            {visita.decisoes.map((decisao: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {decisao}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {visita.pendencias && visita.pendencias.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Pendências:</h5>
                          <ul className="space-y-1">
                            {visita.pendencias.map((pendencia: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                {pendencia}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma visita registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dados & Canais */}
        <TabsContent value="dados" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dados da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                  <p className="font-medium">{client.companyName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                  <p className="font-medium">{client.cnpj}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                  <p className="font-medium">{dayjs(client.createdAt).format('DD/MM/YYYY - HH:mm')}</p>
                </div>
                {client.sector && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Setor</label>
                    <p className="text-sm">{client.sector}</p>
                  </div>
                )}
                {client.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações</label>
                    <p className="text-sm">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contatos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contato Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">{client.contactName}</p>
                  <div className="flex flex-col gap-1 mt-2">
                    {client.contactEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>{client.contactEmail}</span>
                      </div>
                    )}
                    {client.contactPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" />
                        <span>{client.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status e Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Status e Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status Atual</label>
                  <div className="mt-1">
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(client.status)}
                    >
                      {getStatusLabel(client.status)}
                    </Badge>
                  </div>
                </div>
                
                {client.currentStage && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Etapa Atual</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {client.currentStage.stage}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {client.lastActivity && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Última Atividade</label>
                    <p className="text-sm mt-1">{client.lastActivity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(client.lastActivity.createdAt).format('DD/MM/YYYY - HH:mm')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}