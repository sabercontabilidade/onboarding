import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const newClientFormSchema = insertClientSchema.extend({
  meetingDate: z.string().optional(),
  meetingTime: z.string().optional(),
  meetingNotes: z.string().optional(),
});

type NewClientFormData = z.infer<typeof newClientFormSchema>;

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewClientModal({ isOpen, onClose }: NewClientModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NewClientFormData>({
    resolver: zodResolver(newClientFormSchema),
    defaultValues: {
      companyName: "",
      cnpj: "",
      sector: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      status: "onboarding",
      assigneeId: "user-1", // Default to the admin user
      notes: "",
      meetingDate: "",
      meetingTime: "",
      meetingNotes: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: NewClientFormData) => {
      const { meetingDate, meetingTime, meetingNotes, ...clientData } = data;
      
      // Create client
      const clientResponse = await apiRequest("POST", "/api/clients", clientData);
      const client = await clientResponse.json();

      // Create initial meeting if date and time are provided
      if (meetingDate && meetingTime) {
        const scheduledStart = new Date(`${meetingDate}T${meetingTime}`);
        const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000); // 1 hour later

        const appointmentData = {
          clientId: client.id,
          assigneeId: clientData.assigneeId,
          title: `Reunião Inicial - ${clientData.companyName}`,
          description: meetingNotes || "Reunião inicial de onboarding",
          type: "meeting",
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          status: "scheduled",
        };

        await apiRequest("POST", "/api/appointments", appointmentData);
      }

      return client;
    },
    onSuccess: () => {
      toast({
        title: "Cliente criado com sucesso!",
        description: "O cliente foi adicionado ao sistema e o processo de onboarding foi iniciado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Ocorreu um erro ao criar o cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewClientFormData) => {
    createClientMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="new-client-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">Novo Cliente - Onboarding</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground border-b border-border pb-2">
                  Informações da Empresa
                </h3>
                
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome completo da empresa" 
                          {...field} 
                          data-testid="input-company-name"
                        />
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
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="00.000.000/0000-00" 
                          {...field} 
                          data-testid="input-cnpj"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setor de Atividade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sector">
                            <SelectValue placeholder="Selecione o setor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="comercio">Comércio</SelectItem>
                          <SelectItem value="servicos">Serviços</SelectItem>
                          <SelectItem value="industria">Indústria</SelectItem>
                          <SelectItem value="tecnologia">Tecnologia</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground border-b border-border pb-2">
                  Contato Principal
                </h3>
                
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do responsável" 
                          {...field} 
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="email@empresa.com" 
                          {...field} 
                          data-testid="input-contact-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="(11) 99999-9999" 
                          {...field} 
                          data-testid="input-contact-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b border-border pb-2">
                Agendamento da Reunião Inicial
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="meetingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-meeting-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meetingTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field} 
                          data-testid="input-meeting-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas sobre o cliente ou reunião..." 
                        rows={3} 
                        {...field} 
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createClientMutation.isPending}
                data-testid="button-submit"
              >
                {createClientMutation.isPending ? "Criando..." : "Criar Cliente e Agendar Reunião"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
