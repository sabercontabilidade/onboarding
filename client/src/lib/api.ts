import { queryClient } from './queryClient'

const API_BASE_URL = '/api'

// Função helper para requisições
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // Obter token do localStorage
  const token = localStorage.getItem('auth_token')

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)

  // Se receber 401, redirecionar para login
  if (response.status === 401) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_login_time')
    window.location.href = '/login'
    throw new Error('Sessão expirada. Por favor, faça login novamente.')
  }

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(errorData || `Erro ${response.status}`)
  }

  // Para status 204 (No Content), não há corpo JSON para fazer parse
  if (response.status === 204) {
    return undefined as T
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
    
    startOnboarding: (id: string, assigneeId?: string) =>
      apiRequest<{ success: boolean; message: string }>(`/clients/${id}/start-onboarding`, {
        method: 'POST',
        body: JSON.stringify({ assigneeId }),
      }),
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

    counts: () =>
      apiRequest<any>('/dashboard/counts'),

    fullDashboard: () =>
      apiRequest<any>('/relacionamento/dashboard'),

    upcomingContacts: () =>
      apiRequest<any[]>('/relacionamento/proximos-contatos'),

    overdueAppointments: () =>
      apiRequest<any[]>('/relacionamento/agendamentos-atrasados'),

    recentVisits: () =>
      apiRequest<any[]>('/relacionamento/visitas-recentes'),
  },

  // Onboarding
  onboarding: {
    stats: () =>
      apiRequest<any>('/onboarding/stats'),

    progress: (clientId: string) =>
      apiRequest<any>(`/clients/${clientId}/onboarding-progress`),
  },

  // Integrações
  integrations: {
    googleStatus: (userId: number) =>
      apiRequest<any>(`/integrations/google/status/${userId}`),

    googleDisconnect: (userId: number) =>
      apiRequest<any>(`/integrations/google/disconnect/${userId}`, {
        method: 'DELETE',
      }),

    // Gmail
    gmailStatus: () =>
      apiRequest<{ connected: boolean; gmailEnabled: boolean; message: string }>('/integrations/gmail/status'),

    sendEmail: (data: { to: string; subject: string; body: string; isHtml?: boolean; cc?: string; bcc?: string; replyTo?: string }) =>
      apiRequest<{ success: boolean; messageId?: string; message: string }>('/integrations/gmail/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    sendWelcomeEmail: (data: { recipientEmail: string; userName: string; tempPassword?: string }) =>
      apiRequest<{ success: boolean; message: string }>('/integrations/gmail/send-welcome', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    sendReminderEmail: (data: { recipientEmail: string; title: string; date: string; time: string; location?: string; meetingUrl?: string; clientName: string }) =>
      apiRequest<{ success: boolean; message: string }>('/integrations/gmail/send-reminder', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    sendStatusUpdateEmail: (data: { recipientEmail: string; clientName: string; oldStatus: string; newStatus: string; notes?: string }) =>
      apiRequest<{ success: boolean; message: string }>('/integrations/gmail/send-status-update', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // CNPJ
  cnpj: {
    lookup: (cnpj: string) =>
      apiRequest<any>(`/cnpj/${cnpj}`),
  },

  // Setores
  setores: {
    list: () =>
      apiRequest<any[]>('/setores'),

    get: (id: string) =>
      apiRequest<any>(`/setores/${id}`),

    create: (data: { nome: string; codigo: string; descricao?: string; cor?: string; icone?: string }) =>
      apiRequest<any>('/setores', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<{ nome: string; codigo: string; descricao?: string; cor?: string; icone?: string; ativo: boolean }>) =>
      apiRequest<any>(`/setores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiRequest<any>(`/setores/${id}`, {
        method: 'DELETE',
      }),

    getUsuarios: (id: string) =>
      apiRequest<any[]>(`/setores/${id}/usuarios`),
  },

  // Perfis
  perfis: {
    list: () =>
      apiRequest<any[]>('/perfis'),

    get: (id: string) =>
      apiRequest<any>(`/perfis/${id}`),
  },

  // User Setores (Atribuições de usuários a setores)
  userSetores: {
    listByUser: (userId: string) =>
      apiRequest<any[]>(`/setores/users/${userId}/setores`),

    assign: (userId: string, data: { setorId: string; perfilId: string; principal?: boolean }) =>
      apiRequest<any>(`/setores/users/${userId}/setores`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (userId: string, setorId: string, data: { perfilId?: string; principal?: boolean }) =>
      apiRequest<any>(`/setores/users/${userId}/setores/${setorId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    remove: (userId: string, setorId: string) =>
      apiRequest<any>(`/setores/users/${userId}/setores/${setorId}`, {
        method: 'DELETE',
      }),
  },

  // Autenticação
  auth: {
    forgotPassword: (email: string) =>
      apiRequest<{ success: boolean; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    verifyResetToken: (token: string) =>
      apiRequest<{ valid: boolean; message?: string; error?: string }>(`/auth/verify-reset-token/${token}`),

    resetPassword: (token: string, novaSenha: string) =>
      apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, novaSenha }),
      }),

    changePassword: (senhaAtual: string, novaSenha: string) =>
      apiRequest<{ success: boolean; message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ senhaAtual, novaSenha }),
      }),
  },

  // 2FA/TOTP
  twoFactor: {
    status: () =>
      apiRequest<{ enabled: boolean; hasBackupCodes: boolean; backupCodesCount: number }>('/auth/2fa/status'),

    setup: () =>
      apiRequest<{ success: boolean; secret: string; qrCode: string; message: string }>('/auth/2fa/setup', {
        method: 'POST',
      }),

    verifySetup: (token: string) =>
      apiRequest<{ success: boolean; message: string; backupCodes: string[]; warning: string }>('/auth/2fa/verify-setup', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),

    verify: (userId: string, token: string, isBackupCode?: boolean) =>
      apiRequest<{ success: boolean; verified: boolean }>('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ userId, token, isBackupCode }),
      }),

    disable: (password: string, token?: string) =>
      apiRequest<{ success: boolean; message: string }>('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password, token }),
      }),

    regenerateBackupCodes: (password: string, token: string) =>
      apiRequest<{ success: boolean; backupCodes: string[]; warning: string }>('/auth/2fa/regenerate-backup-codes', {
        method: 'POST',
        body: JSON.stringify({ password, token }),
      }),
  },

  // Exportação
  export: {
    downloadFile: async (url: string, filename: string) => {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao exportar arquivo')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    },

    clients: {
      csv: (filters?: { status?: string; startDate?: string; endDate?: string }) => {
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `clientes_${new Date().toISOString().split('T')[0]}.csv`
        return api.export.downloadFile(`/export/clients/csv${query}`, filename)
      },
      pdf: (filters?: { status?: string; startDate?: string; endDate?: string }) => {
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `clientes_${new Date().toISOString().split('T')[0]}.pdf`
        return api.export.downloadFile(`/export/clients/pdf${query}`, filename)
      },
    },

    appointments: {
      csv: (filters?: { status?: string; type?: string; startDate?: string; endDate?: string; clientId?: string }) => {
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.type) params.append('type', filters.type)
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        if (filters?.clientId) params.append('clientId', filters.clientId)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`
        return api.export.downloadFile(`/export/appointments/csv${query}`, filename)
      },
      pdf: (filters?: { status?: string; type?: string; startDate?: string; endDate?: string; clientId?: string }) => {
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.type) params.append('type', filters.type)
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        if (filters?.clientId) params.append('clientId', filters.clientId)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `agendamentos_${new Date().toISOString().split('T')[0]}.pdf`
        return api.export.downloadFile(`/export/appointments/pdf${query}`, filename)
      },
    },

    visits: {
      csv: (filters?: { status?: string; type?: string; startDate?: string; endDate?: string; clientId?: string }) => {
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.type) params.append('type', filters.type)
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        if (filters?.clientId) params.append('clientId', filters.clientId)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `visitas_${new Date().toISOString().split('T')[0]}.csv`
        return api.export.downloadFile(`/export/visits/csv${query}`, filename)
      },
      pdf: (filters?: { status?: string; type?: string; startDate?: string; endDate?: string; clientId?: string }) => {
        const params = new URLSearchParams()
        if (filters?.status) params.append('status', filters.status)
        if (filters?.type) params.append('type', filters.type)
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        if (filters?.clientId) params.append('clientId', filters.clientId)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `visitas_${new Date().toISOString().split('T')[0]}.pdf`
        return api.export.downloadFile(`/export/visits/pdf${query}`, filename)
      },
    },

    users: {
      csv: (filters?: { funcao?: string; ativo?: boolean }) => {
        const params = new URLSearchParams()
        if (filters?.funcao) params.append('funcao', filters.funcao)
        if (filters?.ativo !== undefined) params.append('ativo', String(filters.ativo))
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `usuarios_${new Date().toISOString().split('T')[0]}.csv`
        return api.export.downloadFile(`/export/users/csv${query}`, filename)
      },
    },

    audit: {
      csv: (filters?: { startDate?: string; endDate?: string; acao?: string; usuarioId?: string }) => {
        const params = new URLSearchParams()
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        if (filters?.acao) params.append('acao', filters.acao)
        if (filters?.usuarioId) params.append('usuarioId', filters.usuarioId)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `auditoria_${new Date().toISOString().split('T')[0]}.csv`
        return api.export.downloadFile(`/export/audit/csv${query}`, filename)
      },
      pdf: (filters?: { startDate?: string; endDate?: string; acao?: string; usuarioId?: string }) => {
        const params = new URLSearchParams()
        if (filters?.startDate) params.append('startDate', filters.startDate)
        if (filters?.endDate) params.append('endDate', filters.endDate)
        if (filters?.acao) params.append('acao', filters.acao)
        if (filters?.usuarioId) params.append('usuarioId', filters.usuarioId)
        const query = params.toString() ? `?${params.toString()}` : ''
        const filename = `auditoria_${new Date().toISOString().split('T')[0]}.pdf`
        return api.export.downloadFile(`/export/audit/pdf${query}`, filename)
      },
    },
  },
}

// Helper para invalidar cache após mutações
export const invalidateQueries = (queryKeys: string[]) => {
  queryKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] })
  })
}