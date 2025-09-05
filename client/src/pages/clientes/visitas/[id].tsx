import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'wouter'
import { 
  FileText, 
  Plus, 
  ArrowLeft, 
  Calendar, 
  Users, 
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import dayjs from '@/lib/dayjs'

export function ClienteVisitasPage() {
  const params = useParams()
  const clientId = params.id
  const [showNewVisitModal, setShowNewVisitModal] = useState(false)
  const [formData, setFormData] = useState({
    data: '',
    participantes: '',
    descricao: ''
  })
  const { toast } = useToast()

  // Buscar dados do cliente
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: () => api.clients.get(clientId!),
    enabled: !!clientId,
  })

  // Buscar visitas do cliente da API
  const { data: clientVisits, isLoading: isLoadingVisits } = useQuery({
    queryKey: [`/api/clients/${clientId}/visits`],
    queryFn: () => api.clients.visits(clientId!),
    enabled: !!clientId,
    initialData: []
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.data || !formData.participantes || !formData.descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      })
      return
    }

    try {
      // Criar nova visita/ATA
      const visitData = {
        clientId: clientId,
        date: new Date(formData.data + 'T10:00:00').toISOString(),
        participants: formData.participantes,
        description: formData.descricao,
        type: 'technical_visit',
        status: 'completed'
      }

      await api.visits.create(visitData)
      
      // Invalidar cache para recarregar a lista
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/visits`] })
      
      toast({
        title: "ATA registrada",
        description: "A nova ATA foi registrada com sucesso.",
      })
      
      // Limpar formulário e fechar modal
      setFormData({ data: '', participantes: '', descricao: '' })
      setShowNewVisitModal(false)
      
    } catch (error) {
      console.error('Erro ao salvar ATA:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({
        title: "Erro ao salvar",
        description: `Ocorreu um erro ao salvar a ATA: ${errorMessage}`,
        variant: "destructive"
      })
    }
  }

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  if (isLoadingClient) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/visitas">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Visitas - {client?.companyName}
            </h1>
            <p className="text-muted-foreground">
              Histórico de visitas e ATAs registradas
            </p>
          </div>
        </div>
        <Button onClick={() => setShowNewVisitModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova ATA
        </Button>
      </div>

      {/* Informações do Cliente */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{client?.companyName}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>CNPJ: {client?.cnpj}</span>
                {client?.contactName && <span>Contato: {client?.contactName}</span>}
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  {client?.status === 'active' ? 'Ativo' : client?.status === 'onboarding' ? 'Onboarding' : client?.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Visitas */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">ATAs de Visitas ({clientVisits.length})</h2>
        
        {clientVisits.length > 0 ? (
          <div className="grid gap-6">
            {clientVisits.map((visita: any) => (
              <Card key={visita.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          ATA - {dayjs(visita.scheduledStart || visita.date).format('DD/MM/YYYY')}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-green-50 text-green-600">
                            Concluída
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {dayjs(visita.scheduledStart || visita.date).format('dddd, DD [de] MMMM [de] YYYY')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {visita.satisfacao && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {getStarRating(visita.satisfacao)}
                        </div>
                        <span className="font-medium">{visita.satisfacao}/10</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Participantes */}
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Participantes</p>
                      <p className="text-sm text-muted-foreground">{visita.participantes || visita.participants}</p>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <p className="text-sm font-medium mb-1">Descrição da ATA</p>
                    <p className="text-sm text-muted-foreground">{visita.descricao || visita.description}</p>
                  </div>

                  {/* Decisões */}
                  {visita.decisoes && visita.decisoes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Decisões Tomadas
                      </p>
                      <ul className="space-y-1">
                        {visita.decisoes.map((decisao: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></span>
                            {decisao}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pendências */}
                  {visita.pendencias && visita.pendencias.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Ações Pendentes
                      </p>
                      <ul className="space-y-1">
                        {visita.pendencias.map((pendencia: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0"></span>
                            {pendencia}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma ATA registrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Registre a primeira ATA de visita técnica para este cliente.
              </p>
              <Button onClick={() => setShowNewVisitModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova ATA
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Nova Visita */}
      <Dialog open={showNewVisitModal} onOpenChange={setShowNewVisitModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova ATA de Visita Técnica</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data da Visita *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantes">Participantes *</Label>
                <Input
                  id="participantes"
                  placeholder="Ex: João Silva, Maria Santos"
                  value={formData.participantes}
                  onChange={(e) => setFormData(prev => ({ ...prev, participantes: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição da Visita *</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva tudo que foi tratado durante a visita..."
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                rows={6}
                required
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowNewVisitModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Salvar ATA
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}