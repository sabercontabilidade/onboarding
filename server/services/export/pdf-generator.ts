/**
 * Serviço de geração de arquivos PDF
 */
// @ts-ignore - pdfkit types issue with ES modules
import PDFDocument from 'pdfkit';
import { formatDate, formatDateTime } from './csv-generator.js';

export interface PDFOptions {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  showDate?: boolean;
  showPageNumbers?: boolean;
}

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: any) => string;
}

/**
 * Criar documento PDF
 */
export function createPDFDocument(options: PDFOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    layout: options.orientation || 'portrait',
    margin: 50,
    bufferPages: true,
    info: {
      Title: options.title,
      Author: 'SABER Onboarding',
      Creator: 'SABER Onboarding System',
    },
  });

  return doc;
}

/**
 * Adicionar cabeçalho ao PDF
 */
export function addHeader(
  doc: PDFKit.PDFDocument,
  options: PDFOptions
): void {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Logo/Título principal
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('SABER', doc.page.margins.left, 40, { align: 'center', width: pageWidth });

  // Título do relatório
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(options.title, { align: 'center', width: pageWidth });

  // Subtítulo
  if (options.subtitle) {
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(options.subtitle, { align: 'center', width: pageWidth });
  }

  // Data de geração
  if (options.showDate !== false) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Gerado em: ${formatDateTime(new Date())}`, { align: 'center', width: pageWidth });
  }

  // Linha separadora
  doc.moveDown(1);
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();

  doc.moveDown(1);
}

/**
 * Adicionar tabela ao PDF
 */
export function addTable(
  doc: PDFKit.PDFDocument,
  data: Record<string, any>[],
  columns: TableColumn[],
  options?: {
    headerColor?: string;
    alternateRowColor?: string;
    fontSize?: number;
    cellPadding?: number;
  }
): void {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const fontSize = options?.fontSize || 9;
  const cellPadding = options?.cellPadding || 5;
  const headerColor = options?.headerColor || '#f3f4f6';
  const alternateRowColor = options?.alternateRowColor || '#f9fafb';

  // Calcular largura das colunas
  const totalDefinedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
  const undefinedCols = columns.filter(col => !col.width).length;
  const remainingWidth = Math.max(0, pageWidth - totalDefinedWidth);
  const defaultColWidth = undefinedCols > 0 ? remainingWidth / undefinedCols : 0;

  const colWidths = columns.map(col => col.width || defaultColWidth);

  // Desenhar cabeçalho
  let startX = doc.page.margins.left;
  const headerHeight = fontSize + cellPadding * 2;

  // Fundo do cabeçalho
  doc
    .rect(startX, doc.y, pageWidth, headerHeight)
    .fill(headerColor);

  // Texto do cabeçalho
  doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#1f2937');

  let x = startX;
  columns.forEach((col, i) => {
    doc.text(
      col.header,
      x + cellPadding,
      doc.y + cellPadding,
      {
        width: colWidths[i] - cellPadding * 2,
        align: col.align || 'left',
        height: headerHeight,
        ellipsis: true,
      }
    );
    x += colWidths[i];
  });

  doc.y += headerHeight;

  // Desenhar linhas de dados
  doc.font('Helvetica').fontSize(fontSize).fillColor('#374151');

  data.forEach((row, rowIndex) => {
    const rowHeight = fontSize + cellPadding * 2;

    // Verificar se precisa de nova página
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
      doc.y = doc.page.margins.top;

      // Redesenhar cabeçalho na nova página
      doc
        .rect(startX, doc.y, pageWidth, headerHeight)
        .fill(headerColor);

      doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#1f2937');
      x = startX;
      columns.forEach((col, i) => {
        doc.text(
          col.header,
          x + cellPadding,
          doc.y + cellPadding,
          {
            width: colWidths[i] - cellPadding * 2,
            align: col.align || 'left',
            height: headerHeight,
            ellipsis: true,
          }
        );
        x += colWidths[i];
      });
      doc.y += headerHeight;
      doc.font('Helvetica').fontSize(fontSize).fillColor('#374151');
    }

    // Fundo alternado
    if (rowIndex % 2 === 1) {
      doc
        .rect(startX, doc.y, pageWidth, rowHeight)
        .fill(alternateRowColor);
    }

    // Dados da linha
    x = startX;
    columns.forEach((col, i) => {
      let value = getNestedValue(row, col.key);

      if (col.formatter) {
        value = col.formatter(value, row);
      } else {
        value = formatValue(value);
      }

      doc.text(
        value,
        x + cellPadding,
        doc.y + cellPadding,
        {
          width: colWidths[i] - cellPadding * 2,
          align: col.align || 'left',
          height: rowHeight,
          ellipsis: true,
        }
      );
      x += colWidths[i];
    });

    doc.y += rowHeight;

    // Linha separadora
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .moveTo(startX, doc.y)
      .lineTo(startX + pageWidth, doc.y)
      .stroke();
  });
}

/**
 * Adicionar números de página
 */
export function addPageNumbers(doc: PDFKit.PDFDocument): void {
  const pages = doc.bufferedPageRange();

  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(
        `Página ${i + 1} de ${pages.count}`,
        doc.page.margins.left,
        doc.page.height - 30,
        {
          align: 'center',
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        }
      );
  }
}

/**
 * Adicionar rodapé
 */
export function addFooter(doc: PDFKit.PDFDocument, text?: string): void {
  const pages = doc.bufferedPageRange();

  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    if (text) {
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text(
          text,
          doc.page.margins.left,
          doc.page.height - 45,
          {
            align: 'center',
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          }
        );
    }
  }
}

/**
 * Adicionar resumo/estatísticas
 */
export function addSummary(
  doc: PDFKit.PDFDocument,
  stats: Array<{ label: string; value: string | number }>
): void {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxWidth = pageWidth / stats.length;
  const startX = doc.page.margins.left;

  stats.forEach((stat, i) => {
    const x = startX + boxWidth * i;

    // Box de fundo
    doc
      .rect(x + 5, doc.y, boxWidth - 10, 50)
      .fill('#f3f4f6');

    // Valor
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text(String(stat.value), x + 5, doc.y + 10, {
        width: boxWidth - 10,
        align: 'center',
      });

    // Label
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(stat.label, x + 5, doc.y + 25, {
        width: boxWidth - 10,
        align: 'center',
      });
  });

  doc.y += 60;
}

/**
 * Gerar PDF de lista de clientes
 */
export async function generateClientsPDF(
  clients: any[],
  options?: { subtitle?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = createPDFDocument({
      title: 'Relatório de Clientes',
      subtitle: options?.subtitle,
      orientation: 'landscape',
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    addHeader(doc, { title: 'Relatório de Clientes', subtitle: options?.subtitle });

    // Estatísticas
    const stats = [
      { label: 'Total', value: clients.length },
      { label: 'Ativos', value: clients.filter(c => c.status === 'active').length },
      { label: 'Em Onboarding', value: clients.filter(c => c.status === 'onboarding').length },
      { label: 'Pendentes', value: clients.filter(c => c.status === 'pending').length },
    ];

    addSummary(doc, stats);

    // Tabela
    const columns: TableColumn[] = [
      { header: 'Empresa', key: 'companyName', width: 150 },
      { header: 'CNPJ', key: 'cnpj', width: 100 },
      { header: 'Contato', key: 'contactName', width: 100 },
      { header: 'Email', key: 'contactEmail', width: 140 },
      { header: 'Telefone', key: 'contactPhone', width: 90 },
      {
        header: 'Status',
        key: 'status',
        width: 80,
        formatter: (value) => {
          const map: Record<string, string> = {
            pending: 'Pendente',
            onboarding: 'Onboarding',
            active: 'Ativo',
            inactive: 'Inativo',
          };
          return map[value] || value;
        }
      },
      { header: 'Responsável', key: 'assignee.nome', width: 100 },
    ];

    addTable(doc, clients, columns);

    addPageNumbers(doc);
    addFooter(doc, 'SABER Onboarding - Relatório Confidencial');

    doc.end();
  });
}

/**
 * Gerar PDF de lista de agendamentos
 */
export async function generateAppointmentsPDF(
  appointments: any[],
  options?: { subtitle?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = createPDFDocument({
      title: 'Relatório de Agendamentos',
      subtitle: options?.subtitle,
      orientation: 'landscape',
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    addHeader(doc, { title: 'Relatório de Agendamentos', subtitle: options?.subtitle });

    // Estatísticas
    const stats = [
      { label: 'Total', value: appointments.length },
      { label: 'Agendados', value: appointments.filter(a => a.status === 'scheduled').length },
      { label: 'Concluídos', value: appointments.filter(a => a.status === 'completed').length },
      { label: 'Cancelados', value: appointments.filter(a => a.status === 'cancelled').length },
    ];

    addSummary(doc, stats);

    // Tabela
    const columns: TableColumn[] = [
      { header: 'Título', key: 'title', width: 150 },
      { header: 'Cliente', key: 'client.companyName', width: 120 },
      {
        header: 'Tipo',
        key: 'type',
        width: 80,
        formatter: (value) => {
          const map: Record<string, string> = {
            meeting: 'Reunião',
            visit: 'Visita',
            call: 'Ligação',
            followup: 'Follow-up',
          };
          return map[value] || value;
        }
      },
      { header: 'Início', key: 'scheduledStart', width: 110, formatter: (v) => formatDateTime(v) },
      { header: 'Fim', key: 'scheduledEnd', width: 110, formatter: (v) => formatDateTime(v) },
      { header: 'Local', key: 'location', width: 100 },
      {
        header: 'Status',
        key: 'status',
        width: 80,
        formatter: (value) => {
          const map: Record<string, string> = {
            scheduled: 'Agendado',
            completed: 'Concluído',
            cancelled: 'Cancelado',
            rescheduled: 'Reagendado',
          };
          return map[value] || value;
        }
      },
    ];

    addTable(doc, appointments, columns);

    addPageNumbers(doc);
    addFooter(doc, 'SABER Onboarding - Relatório Confidencial');

    doc.end();
  });
}

/**
 * Gerar PDF de lista de visitas
 */
export async function generateVisitsPDF(
  visits: any[],
  options?: { subtitle?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = createPDFDocument({
      title: 'Relatório de Visitas',
      subtitle: options?.subtitle,
      orientation: 'landscape',
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    addHeader(doc, { title: 'Relatório de Visitas', subtitle: options?.subtitle });

    // Estatísticas
    const stats = [
      { label: 'Total', value: visits.length },
      { label: 'Concluídas', value: visits.filter(v => v.status === 'completed').length },
      { label: 'Agendadas', value: visits.filter(v => v.status === 'scheduled').length },
      { label: 'Canceladas', value: visits.filter(v => v.status === 'cancelled').length },
    ];

    addSummary(doc, stats);

    // Tabela
    const columns: TableColumn[] = [
      { header: 'Cliente', key: 'client.companyName', width: 130 },
      { header: 'Data', key: 'date', width: 100, formatter: (v) => formatDateTime(v) },
      {
        header: 'Tipo',
        key: 'type',
        width: 90,
        formatter: (value) => {
          const map: Record<string, string> = {
            technical_visit: 'Técnica',
            maintenance: 'Manutenção',
            training: 'Treinamento',
            follow_up: 'Follow-up',
          };
          return map[value] || value;
        }
      },
      {
        header: 'Status',
        key: 'status',
        width: 80,
        formatter: (value) => {
          const map: Record<string, string> = {
            scheduled: 'Agendada',
            completed: 'Concluída',
            cancelled: 'Cancelada',
          };
          return map[value] || value;
        }
      },
      { header: 'Participantes', key: 'participants', width: 150 },
      { header: 'Local', key: 'location', width: 100 },
      { header: 'Avaliação', key: 'satisfaction_rating', width: 70, align: 'center' },
    ];

    addTable(doc, visits, columns);

    addPageNumbers(doc);
    addFooter(doc, 'SABER Onboarding - Relatório Confidencial');

    doc.end();
  });
}

/**
 * Gerar PDF de logs de auditoria
 */
export async function generateAuditLogsPDF(
  logs: any[],
  options?: { subtitle?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = createPDFDocument({
      title: 'Relatório de Auditoria',
      subtitle: options?.subtitle,
      orientation: 'landscape',
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    addHeader(doc, { title: 'Relatório de Auditoria', subtitle: options?.subtitle });

    // Tabela
    const columns: TableColumn[] = [
      { header: 'Data', key: 'createdAt', width: 110, formatter: (v) => formatDateTime(v) },
      { header: 'Usuário', key: 'usuario.nome', width: 100 },
      { header: 'Ação', key: 'acao', width: 100 },
      { header: 'Entidade', key: 'entidade', width: 80 },
      { header: 'Descrição', key: 'descricao', width: 200 },
      { header: 'IP', key: 'ipOrigem', width: 100 },
    ];

    addTable(doc, logs, columns);

    addPageNumbers(doc);
    addFooter(doc, 'SABER Onboarding - Relatório Confidencial');

    doc.end();
  });
}

// Helpers
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
