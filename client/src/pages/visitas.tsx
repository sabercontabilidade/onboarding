import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  Star,
  CheckCircle2,
  AlertCircle,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export function VisitasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Mock data para visitas - em uma aplicação real, isso viria da API
  const mockVisitas = [
    {
      id: 1,
      cliente: { nome: 'Empresa ABC Ltda', id: 1 },
      tipo_visita: 'Implementação',
      data: '2024-01-15',
      participantes: 'João Silva, Maria Santos',
      resumo: 'Reunião para definir cronograma de implementação do novo sistema contábil.',
      satisfacao: 9,
      decisoes: [
        'Aprovado cronograma de 3 meses para implementação',
        'Definido treinamento da equipe para março'
      ],
      pendencias: [
        'Enviar documentação técnica',
        'Agendar próxima reunião'
      ]
    },
    {
      id: 2,
      cliente: { nome: 'Tech Solutions LTDA', id: 2 },
      tipo_visita: 'Follow-up',
      data: '2024-01-10',
      participantes: 'Ana Costa, Pedro Lima',
      resumo: 'Acompanhamento do progresso da migração de dados.',
      satisfacao: 8,
      decisoes: [
        'Migração 80% concluída',
        'Ajustes nos relatórios personalizados'
      ],
      pendencias: [
        'Finalizar migração até fim do mês',
        'Validar relatórios com equipe cliente'
      ]
    }
  ]

  const filteredVisitas = mockVisitas.filter((visita: any) => {
    if (searchTerm && !visita.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !visita.tipo_visita.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (typeFilter && typeFilter !== 'all' && visita.tipo_visita !== typeFilter) {
      return false
    }
    return true
  })

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visitas Técnicas</h1>
          <p className="text-muted-foreground">
            Acompanhe as ATAs e resultados das visitas realizadas
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova ATA
        </Button>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou tipo de visita..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de visita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Implementação">Implementação</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
                <SelectItem value="Treinamento">Treinamento</SelectItem>
                <SelectItem value="Suporte">Suporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Visitas */}
      {filteredVisitas.length > 0 ? (
        <div className="grid gap-6">
          {filteredVisitas.map((visita: any) => (
            <Card key={visita.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{visita.cliente.nome}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{visita.tipo_visita}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {dayjs(visita.data).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getStarRating(visita.satisfacao)}
                    </div>
                    <span className="font-medium">{visita.satisfacao}/10</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Participantes */}
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Participantes</p>
                    <p className="text-sm text-muted-foreground">{visita.participantes}</p>
                  </div>
                </div>

                {/* Resumo */}
                <div>
                  <p className="text-sm font-medium mb-1">Resumo</p>
                  <p className="text-sm text-muted-foreground">{visita.resumo}</p>
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
                        <li key={index} className="text-sm flex items-start gap-2 ml-6">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
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
                      Pendências
                    </p>
                    <ul className="space-y-1">
                      {visita.pendencias.map((pendencia: string, index: number) => (
                        <li key={index} className="text-sm flex items-start gap-2 ml-6">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
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
            <h3 className="text-lg font-medium mb-2">Nenhuma visita encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || (typeFilter !== 'all')
                ? 'Tente ajustar sua pesquisa ou remover os filtros.'
                : 'Comece registrando sua primeira ATA de visita.'
              }
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova ATA
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}