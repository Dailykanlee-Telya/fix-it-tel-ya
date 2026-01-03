import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Ticket, 
  Calendar,
  Smartphone,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { STATUS_LABELS, TicketStatus } from '@/types/database';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import CustomerEditDialog from './CustomerEditDialog';

interface CustomerDetailDialogProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailDialog({ customerId, open, onOpenChange }: CustomerDetailDialogProps) {
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = React.useState(false);

  const { data: customer, refetch: refetchCustomer } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId && open,
  });

  const { data: tickets } = useQuery({
    queryKey: ['customer-tickets', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          id, ticket_number, status, created_at,
          device:devices(brand, model, device_type)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId && open,
  });

  if (!customer) return null;

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'NEU_EINGEGANGEN': return 'bg-blue-100 text-blue-700';
      case 'IN_DIAGNOSE': return 'bg-purple-100 text-purple-700';
      case 'WARTET_AUF_TEIL_ODER_FREIGABE': return 'bg-amber-100 text-amber-700';
      case 'IN_REPARATUR': return 'bg-cyan-100 text-cyan-700';
      case 'FERTIG_ZUR_ABHOLUNG': return 'bg-emerald-100 text-emerald-700';
      case 'ABGEHOLT': return 'bg-slate-100 text-slate-600';
      case 'STORNIERT': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Kundendetails
              </span>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Bearbeiten
              </Button>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Stammdaten</TabsTrigger>
              <TabsTrigger value="tickets">Aufträge ({tickets?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Kunde seit {format(new Date(customer.created_at), 'MMMM yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                  </div>

                  {customer.marketing_consent && (
                    <Badge variant="outline" className="text-xs">
                      Marketing-Einwilligung erteilt
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tickets" className="mt-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {tickets?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Keine Aufträge vorhanden
                  </p>
                ) : (
                  tickets?.map((ticket: any) => (
                    <Card 
                      key={ticket.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/tickets/${ticket.id}`);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-mono font-medium text-sm">
                                {ticket.ticket_number}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                {ticket.device?.brand} {ticket.device?.model}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(ticket.status)}>
                              {STATUS_LABELS[ticket.status as TicketStatus]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(ticket.created_at), 'dd.MM.yy', { locale: de })}
                            </span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {customer && (
        <CustomerEditDialog
          customer={customer}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => {
            refetchCustomer();
            setEditOpen(false);
          }}
        />
      )}
    </>
  );
}
