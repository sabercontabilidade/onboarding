import { queryClient } from './queryClient'

const API_BASE_URL = '/api'

// Função helper para requisições
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(errorData || `Erro ${response.status}`)
  }

  return response.json()
}

// API Client
export const api = {
  // Clientes
  clients: {
    list: (search?: string) =>
      apiRequest<any[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    
    create: (data: any) =>
      apiRequest<any>('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    get: (id: string) =>
      apiRequest<any>(`/clients/${id}`),
    
    update: (id: string, data: any) =>
      apiRequest<any>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      apiRequest<void>(`/clients/${id}`, {
        method: 'DELETE',
      }),
    
    contacts: (id: string) =>
      apiRequest<any[]>(`/clients/${id}/contacts`),
    
    appointments: (id: string) =>
      apiRequest<any[]>(`/clients/${id}/appointments`),
    
    visits: (id: string) =>
      apiRequest<any[]>(`/clients/${id}/visits`),
  },

  // Contatos
  contacts: {
    create: (data: any) =>
      apiRequest<any>('/contatos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      apiRequest<any>(`/contatos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Agendamentos
  appointments: {
    list: (filters?: any) => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      
      return apiRequest<any[]>(`/appointments?${params.toString()}`)
    },
    
    create: (data: any) =>
      apiRequest<any>('/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: any) =>
      apiRequest<any>(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    cancel: (id: string) =>
      apiRequest<any>(`/appointments/${id}`, {
        method: 'DELETE',
      }),
  },

  // Visitas
  visits: {
    list: () =>
      apiRequest<any[]>('/visits'),
      
    create: (data: any) =>
      apiRequest<any>('/visits', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: number, data: any) =>
      apiRequest<any>(`/visits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Dashboard
  dashboard: {
    metrics: () =>
      apiRequest<any>('/relacionamento/metricas'),
    
    fullDashboard: () =>
      apiRequest<any>('/relacionamento/dashboard'),
    
    upcomingContacts: () =>
      apiRequest<any[]>('/relacionamento/proximos-contatos'),
    
    overdueAppointments: () =>
      apiRequest<any[]>('/relacionamento/agendamentos-atrasados'),
    
    recentVisits: () =>
      apiRequest<any[]>('/relacionamento/visitas-recentes'),
  },

  // Integrações
  integrations: {
    googleStatus: (userId: number) =>
      apiRequest<any>(`/integrations/google/status/${userId}`),
    
    googleDisconnect: (userId: number) =>
      apiRequest<any>(`/integrations/google/disconnect/${userId}`, {
        method: 'DELETE',
      }),
  },

  // CNPJ
  cnpj: {
    lookup: (cnpj: string) =>
      apiRequest<any>(`/cnpj/${cnpj}`),
  },
}

// Helper para invalidar cache após mutações
export const invalidateQueries = (queryKeys: string[]) => {
  queryKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] })
  })
}