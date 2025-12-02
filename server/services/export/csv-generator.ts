/**
 * Serviço de geração de arquivos CSV
 */
import { stringify } from 'csv-stringify/sync';

export interface CSVColumn<T> {
  header: string;
  key: keyof T | string;
  formatter?: (value: any, row: T) => string;
}

/**
 * Gerar CSV a partir de dados
 */
export function generateCSV<T extends Record<string, any>>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  if (data.length === 0) {
    // Retornar apenas cabeçalhos se não houver dados
    return columns.map(col => col.header).join(',') + '\n';
  }

  // Transformar dados usando as colunas definidas
  const rows = data.map(row => {
    const transformedRow: Record<string, string> = {};

    columns.forEach(col => {
      const key = col.key as string;
      let value = key.includes('.')
        ? getNestedValue(row, key)
        : row[key];

      if (col.formatter) {
        value = col.formatter(value, row);
      }

      transformedRow[col.header] = formatValue(value);
    });

    return transformedRow;
  });

  // Gerar CSV
  const csv = stringify(rows, {
    header: true,
    columns: columns.map(col => col.header),
    bom: true, // Adicionar BOM para Excel
  });

  return csv;
}

/**
 * Obter valor aninhado (ex: "client.companyName")
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Formatar valor para CSV
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  if (Array.isArray(value)) {
    return value.join('; ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Formatar data para exibição
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatar data e hora para exibição
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ========================================
// DEFINIÇÕES DE COLUNAS PARA CADA ENTIDADE
// ========================================

export const clientColumns: CSVColumn<any>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Empresa', key: 'companyName' },
  { header: 'CNPJ', key: 'cnpj' },
  { header: 'Setor', key: 'sector' },
  { header: 'Contato', key: 'contactName' },
  { header: 'Email', key: 'contactEmail' },
  { header: 'Telefone', key: 'contactPhone' },
  {
    header: 'Status',
    key: 'status',
    formatter: (value) => {
      const statusMap: Record<string, string> = {
        pending: 'Pendente',
        onboarding: 'Em Onboarding',
        active: 'Ativo',
        inactive: 'Inativo',
      };
      return statusMap[value] || value;
    }
  },
  { header: 'Responsável', key: 'assignee.nome' },
  { header: 'Observações', key: 'notes' },
  { header: 'Criado em', key: 'createdAt', formatter: (v) => formatDateTime(v) },
  { header: 'Atualizado em', key: 'updatedAt', formatter: (v) => formatDateTime(v) },
];

export const appointmentColumns: CSVColumn<any>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Título', key: 'title' },
  { header: 'Descrição', key: 'description' },
  { header: 'Cliente', key: 'client.companyName' },
  {
    header: 'Tipo',
    key: 'type',
    formatter: (value) => {
      const typeMap: Record<string, string> = {
        meeting: 'Reunião',
        visit: 'Visita',
        call: 'Ligação',
        followup: 'Follow-up',
      };
      return typeMap[value] || value;
    }
  },
  { header: 'Início', key: 'scheduledStart', formatter: (v) => formatDateTime(v) },
  { header: 'Fim', key: 'scheduledEnd', formatter: (v) => formatDateTime(v) },
  { header: 'Local', key: 'location' },
  { header: 'URL da Reunião', key: 'meetingUrl' },
  {
    header: 'Status',
    key: 'status',
    formatter: (value) => {
      const statusMap: Record<string, string> = {
        scheduled: 'Agendado',
        completed: 'Concluído',
        cancelled: 'Cancelado',
        rescheduled: 'Reagendado',
      };
      return statusMap[value] || value;
    }
  },
  { header: 'Responsável', key: 'assignee.nome' },
  { header: 'Criado em', key: 'createdAt', formatter: (v) => formatDateTime(v) },
];

export const visitColumns: CSVColumn<any>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Cliente', key: 'client.companyName' },
  { header: 'Data', key: 'date', formatter: (v) => formatDateTime(v) },
  {
    header: 'Tipo',
    key: 'type',
    formatter: (value) => {
      const typeMap: Record<string, string> = {
        technical_visit: 'Visita Técnica',
        maintenance: 'Manutenção',
        training: 'Treinamento',
        follow_up: 'Follow-up',
      };
      return typeMap[value] || value;
    }
  },
  {
    header: 'Status',
    key: 'status',
    formatter: (value) => {
      const statusMap: Record<string, string> = {
        scheduled: 'Agendada',
        completed: 'Concluída',
        cancelled: 'Cancelada',
      };
      return statusMap[value] || value;
    }
  },
  { header: 'Participantes', key: 'participants' },
  { header: 'Descrição', key: 'description' },
  { header: 'Local', key: 'location' },
  { header: 'Responsável', key: 'assignee.nome' },
  { header: 'Avaliação', key: 'satisfaction_rating' },
  { header: 'Notas', key: 'notes' },
  { header: 'Criado em', key: 'createdAt', formatter: (v) => formatDateTime(v) },
];

export const userColumns: CSVColumn<any>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Nome', key: 'nome' },
  { header: 'Email', key: 'email' },
  { header: 'Telefone', key: 'telefone' },
  {
    header: 'Função',
    key: 'funcao',
    formatter: (value) => {
      const funcaoMap: Record<string, string> = {
        comercial: 'Comercial',
        integracao: 'Integração',
        onboarding: 'Onboarding',
        admin: 'Administrador',
      };
      return funcaoMap[value] || value;
    }
  },
  {
    header: 'Nível',
    key: 'nivelPermissao',
    formatter: (value) => {
      const nivelMap: Record<string, string> = {
        administrador: 'Administrador',
        operador: 'Operador',
        analista: 'Analista',
      };
      return nivelMap[value] || value;
    }
  },
  { header: 'Ativo', key: 'ativo' },
  { header: 'Bloqueado', key: 'bloqueado' },
  { header: 'Último Login', key: 'ultimoLogin', formatter: (v) => formatDateTime(v) },
  { header: 'Criado em', key: 'createdAt', formatter: (v) => formatDateTime(v) },
];

export const auditLogColumns: CSVColumn<any>[] = [
  { header: 'ID', key: 'id' },
  { header: 'Data', key: 'createdAt', formatter: (v) => formatDateTime(v) },
  { header: 'Usuário', key: 'usuario.nome' },
  { header: 'Ação', key: 'acao' },
  { header: 'Entidade', key: 'entidade' },
  { header: 'ID da Entidade', key: 'entidadeId' },
  { header: 'Descrição', key: 'descricao' },
  { header: 'IP de Origem', key: 'ipOrigem' },
  { header: 'User Agent', key: 'userAgent' },
];
