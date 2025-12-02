import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, Send, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface EmailComposerProps {
  trigger?: React.ReactNode;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSent?: () => void;
}

export function EmailComposer({
  trigger,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSent,
}: EmailComposerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isHtml, setIsHtml] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [replyTo, setReplyTo] = useState('');

  // Verificar status do Gmail
  const { data: gmailStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: api.integrations.gmailStatus,
  });

  // Enviar email
  const sendMutation = useMutation({
    mutationFn: () =>
      api.integrations.sendEmail({
        to,
        subject,
        body,
        isHtml,
        cc: cc || undefined,
        bcc: bcc || undefined,
        replyTo: replyTo || undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Email enviado!',
        description: `Mensagem enviada para ${to}`,
      });
      setOpen(false);
      resetForm();
      onSent?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar o email',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTo(defaultTo);
    setSubject(defaultSubject);
    setBody(defaultBody);
    setIsHtml(false);
    setCc('');
    setBcc('');
    setReplyTo('');
    setShowAdvanced(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTo(defaultTo);
      setSubject(defaultSubject);
      setBody(defaultBody);
    }
  };

  const isValid = to && subject && body;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Enviar Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compor Email
          </DialogTitle>
          <DialogDescription>
            Enviar email usando sua conta Google conectada
          </DialogDescription>
        </DialogHeader>

        {loadingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !gmailStatus?.gmailEnabled ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {gmailStatus?.connected
                ? 'Reconecte sua conta Google para habilitar o envio de emails. A permissão do Gmail não foi concedida.'
                : 'Você precisa conectar sua conta Google nas Configurações para enviar emails.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Destinatário */}
            <div className="space-y-2">
              <Label htmlFor="email-to">Para *</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="email@exemplo.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">Assunto *</Label>
              <Input
                id="email-subject"
                placeholder="Assunto do email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Corpo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body">Mensagem *</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="html-toggle" className="text-sm text-muted-foreground">
                    HTML
                  </Label>
                  <Switch
                    id="html-toggle"
                    checked={isHtml}
                    onCheckedChange={setIsHtml}
                  />
                </div>
              </div>
              <Textarea
                id="email-body"
                placeholder={isHtml ? '<p>Seu conteúdo HTML aqui...</p>' : 'Escreva sua mensagem...'}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Opções avançadas */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground"
              >
                {showAdvanced ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Ocultar opções avançadas
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Mostrar opções avançadas
                  </>
                )}
              </Button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="email-cc">CC</Label>
                    <Input
                      id="email-cc"
                      type="email"
                      placeholder="copia@exemplo.com"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-bcc">CCO (Cópia oculta)</Label>
                    <Input
                      id="email-bcc"
                      type="email"
                      placeholder="copia.oculta@exemplo.com"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-reply">Responder para</Label>
                    <Input
                      id="email-reply"
                      type="email"
                      placeholder="resposta@exemplo.com"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!isValid || !gmailStatus?.gmailEnabled || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Templates de email pré-definidos
interface EmailTemplateButtonProps {
  type: 'welcome' | 'reminder' | 'status';
  data: any;
  trigger?: React.ReactNode;
  onSent?: () => void;
}

export function EmailTemplateButton({
  type,
  data,
  trigger,
  onSent,
}: EmailTemplateButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: api.integrations.gmailStatus,
    enabled: open,
  });

  const sendWelcomeMutation = useMutation({
    mutationFn: () =>
      api.integrations.sendWelcomeEmail({
        recipientEmail: data.email,
        userName: data.name,
        tempPassword: data.tempPassword,
      }),
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const sendReminderMutation = useMutation({
    mutationFn: () =>
      api.integrations.sendReminderEmail({
        recipientEmail: data.email,
        title: data.title,
        date: data.date,
        time: data.time,
        location: data.location,
        meetingUrl: data.meetingUrl,
        clientName: data.clientName,
      }),
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const sendStatusMutation = useMutation({
    mutationFn: () =>
      api.integrations.sendStatusUpdateEmail({
        recipientEmail: data.email,
        clientName: data.clientName,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        notes: data.notes,
      }),
    onSuccess: handleSuccess,
    onError: handleError,
  });

  function handleSuccess() {
    toast({
      title: 'Email enviado!',
      description: 'O email foi enviado com sucesso.',
    });
    setOpen(false);
    onSent?.();
  }

  function handleError(error: any) {
    toast({
      title: 'Erro ao enviar',
      description: error.message || 'Não foi possível enviar o email',
      variant: 'destructive',
    });
  }

  const mutation =
    type === 'welcome'
      ? sendWelcomeMutation
      : type === 'reminder'
        ? sendReminderMutation
        : sendStatusMutation;

  const getTitle = () => {
    switch (type) {
      case 'welcome':
        return 'Enviar Email de Boas-vindas';
      case 'reminder':
        return 'Enviar Lembrete';
      case 'status':
        return 'Enviar Atualização de Status';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'welcome':
        return `Enviar email de boas-vindas para ${data.name}`;
      case 'reminder':
        return `Enviar lembrete do agendamento "${data.title}"`;
      case 'status':
        return `Notificar sobre mudança de status: ${data.oldStatus} → ${data.newStatus}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            {type === 'welcome' && 'Boas-vindas'}
            {type === 'reminder' && 'Lembrete'}
            {type === 'status' && 'Atualização'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {!gmailStatus?.gmailEnabled ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Conecte sua conta Google nas Configurações para enviar emails.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Para:</span>
                <span>{data.email}</span>
              </div>
              {type === 'welcome' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usuário:</span>
                  <span>{data.name}</span>
                </div>
              )}
              {type === 'reminder' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agendamento:</span>
                    <span>{data.title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data/Hora:</span>
                    <span>{data.date} às {data.time}</span>
                  </div>
                </>
              )}
              {type === 'status' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{data.oldStatus} → {data.newStatus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!gmailStatus?.gmailEnabled || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
