import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export type ExportEntity = 'clients' | 'appointments' | 'visits' | 'users' | 'audit';

interface ExportButtonsProps {
  entity: ExportEntity;
  filters?: Record<string, any>;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportButtons({ entity, filters, variant = 'outline', size = 'sm' }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      const entityExport = api.export[entity];

      if (format === 'csv') {
        await entityExport.csv(filters);
      } else if ('pdf' in entityExport) {
        await entityExport.pdf(filters);
      }

      toast({
        title: 'Exportado com sucesso',
        description: `Arquivo ${format.toUpperCase()} baixado.`,
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const hasPdf = entity !== 'users'; // Users só tem CSV

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
        {hasPdf && (
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Componente específico para exportar clientes
export function ExportClientsButton(props: Omit<ExportButtonsProps, 'entity'>) {
  return <ExportButtons entity="clients" {...props} />;
}

// Componente específico para exportar agendamentos
export function ExportAppointmentsButton(props: Omit<ExportButtonsProps, 'entity'>) {
  return <ExportButtons entity="appointments" {...props} />;
}

// Componente específico para exportar visitas
export function ExportVisitsButton(props: Omit<ExportButtonsProps, 'entity'>) {
  return <ExportButtons entity="visits" {...props} />;
}

// Componente específico para exportar usuários (apenas admin)
export function ExportUsersButton(props: Omit<ExportButtonsProps, 'entity'>) {
  return <ExportButtons entity="users" {...props} />;
}

// Componente específico para exportar auditoria (apenas admin)
export function ExportAuditButton(props: Omit<ExportButtonsProps, 'entity'>) {
  return <ExportButtons entity="audit" {...props} />;
}
