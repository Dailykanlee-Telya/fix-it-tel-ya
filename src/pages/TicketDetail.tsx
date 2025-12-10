import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Smartphone,
  MapPin,
  Clock,
  Wrench,
  Package,
  MessageSquare,
  History,
  FileText,
  Euro,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TicketStatus,
  DEVICE_TYPE_LABELS,
  DeviceType,
  ERROR_CODE_LABELS,
  ErrorCode,
} from '@/types/database';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import TicketDocuments from '@/components/documents/TicketDocuments';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEU_EINGEGANGEN: ['IN_DIAGNOSE', 'STORNIERT'],
  IN_DIAGNOSE: ['WARTET_AUF_TEIL_ODER_FREIGABE', 'IN_REPARATUR', 'STORNIERT'],
  WARTET_AUF_TEIL_ODER_FREIGABE: ['IN_REPARATUR', 'STORNIERT'],
  IN_REPARATUR: ['FERTIG_ZUR_ABHOLUNG', 'WARTET_AUF_TEIL_ODER_FREIGABE', 'STORNIERT'],
  FERTIG_ZUR_ABHOLUNG: ['ABGEHOLT', 'IN_REPARATUR'],
  ABGEHOLT: [],
  STORNIERT: [],
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [statusNote, setStatusNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customers(*),
          device:devices(*),
          location:locations(*),
          assigned_technician:profiles(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: statusHistory } = useQuery({
    queryKey: ['ticket-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_history')
        .select(`
          *,
          changed_by:profiles(name)
        `)
        .eq('repair_ticket_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: partUsage } = useQuery({
    queryKey: ['ticket-parts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_part_usage')
        .select(`
          *,
          part:parts(*)
        `)
        .eq('repair_ticket_id', id);

      if (error) throw error;
      return data;
    },
  });

  const { data: availableParts } = useQuery({
    queryKey: ['available-parts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .gt('stock_quantity', 0)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const addPartMutation = useMutation({
    mutationFn: async () => {
      const selectedPart = availableParts?.find(p => p.id === selectedPartId);
      if (!selectedPart) throw new Error('Teil nicht gefunden');

      // Add part usage
      const { error: usageError } = await supabase
        .from('ticket_part_usage')
        .insert({
          repair_ticket_id: id,
          part_id: selectedPartId,
          quantity: partQuantity,
          unit_purchase_price: selectedPart.purchase_price,
          unit_sales_price: selectedPart.sales_price,
        });

      if (usageError) throw usageError;

      // Decrease stock
      const { error: stockError } = await supabase
        .from('parts')
        .update({ stock_quantity: selectedPart.stock_quantity - partQuantity })
        .eq('id', selectedPartId);

      if (stockError) throw stockError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-parts', id] });
      queryClient.invalidateQueries({ queryKey: ['available-parts'] });
      setPartDialogOpen(false);
      setSelectedPartId('');
      setPartQuantity(1);
      toast({
        title: 'Teil zugeordnet',
        description: 'Das Teil wurde erfolgreich zum Ticket hinzugefügt.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const removePartMutation = useMutation({
    mutationFn: async (usageId: string) => {
      const usage = partUsage?.find((u: any) => u.id === usageId);
      if (!usage) throw new Error('Verwendung nicht gefunden');

      // Restore stock
      const { error: stockError } = await supabase
        .from('parts')
        .update({ stock_quantity: (usage.part?.stock_quantity || 0) + usage.quantity })
        .eq('id', usage.part_id);

      if (stockError) throw stockError;

      // Remove usage
      const { error: usageError } = await supabase
        .from('ticket_part_usage')
        .delete()
        .eq('id', usageId);

      if (usageError) throw usageError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-parts', id] });
      queryClient.invalidateQueries({ queryKey: ['available-parts'] });
      toast({
        title: 'Teil entfernt',
        description: 'Das Teil wurde vom Ticket entfernt.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: TicketStatus) => {
      // Update ticket status
      const { error: ticketError } = await supabase
        .from('repair_tickets')
        .update({ status: newStatus })
        .eq('id', id);

      if (ticketError) throw ticketError;

      // Add status history entry
      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          repair_ticket_id: id,
          old_status: ticket?.status,
          new_status: newStatus,
          changed_by_user_id: profile?.id,
          note: statusNote || null,
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', id] });
      setStatusNote('');
      toast({
        title: 'Status aktualisiert',
        description: 'Der Ticketstatus wurde erfolgreich geändert.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('repair_tickets')
        .update({ internal_notes: internalNote })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast({
        title: 'Notiz gespeichert',
        description: 'Die interne Notiz wurde gespeichert.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket nicht gefunden</p>
        <Button variant="link" onClick={() => navigate('/tickets')}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[ticket.status as TicketStatus] || [];
  const totalPartsPrice = partUsage?.reduce(
    (sum: number, p: any) => sum + (p.unit_sales_price || 0) * p.quantity,
    0
  ) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{ticket.ticket_number}</h1>
            <span className={`status-badge ${STATUS_COLORS[ticket.status as TicketStatus]}`}>
              {STATUS_LABELS[ticket.status as TicketStatus]}
            </span>
            {ticket.priority === 'express' && (
              <Badge variant="destructive">EXPRESS</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Erstellt am {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
          </p>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Customer */}
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {ticket.customer?.first_name} {ticket.customer?.last_name}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {ticket.customer?.phone}
                </div>
                {ticket.customer?.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{ticket.customer.email}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device */}
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {ticket.device?.brand} {ticket.device?.model}
                </p>
                <p className="text-sm text-muted-foreground">
                  {DEVICE_TYPE_LABELS[ticket.device?.device_type as DeviceType]}
                  {ticket.device?.color && ` • ${ticket.device.color}`}
                </p>
                {ticket.device?.imei_or_serial && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {ticket.device.imei_or_serial}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{ticket.location?.name}</p>
                <p className="text-sm text-muted-foreground">{ticket.location?.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="repair">Reparatur</TabsTrigger>
          <TabsTrigger value="parts">Teile</TabsTrigger>
          <TabsTrigger value="documents">Dokumente</TabsTrigger>
          <TabsTrigger value="history">Verlauf</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Problem Description */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Fehlerbeschreibung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {ERROR_CODE_LABELS[ticket.error_code as ErrorCode]}
                  </Badge>
                  <p className="text-sm">{ticket.error_description_text || 'Keine Beschreibung'}</p>
                </div>
                {ticket.accessories && (
                  <div>
                    <p className="text-sm font-medium mb-1">Zubehör:</p>
                    <p className="text-sm text-muted-foreground">{ticket.accessories}</p>
                  </div>
                )}
                {ticket.passcode_info && (
                  <div>
                    <p className="text-sm font-medium mb-1">Passcode:</p>
                    <p className="text-sm text-muted-foreground">{ticket.passcode_info}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Euro className="h-5 w-5 text-success" />
                  Preisgestaltung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preismodus</span>
                  <Badge>{ticket.price_mode}</Badge>
                </div>
                {ticket.estimated_price && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Geschätzter Preis</span>
                    <span className="font-medium">{ticket.estimated_price.toFixed(2)} €</span>
                  </div>
                )}
                {totalPartsPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Teilekosten</span>
                    <span className="font-medium">{totalPartsPrice.toFixed(2)} €</span>
                  </div>
                )}
                {ticket.kva_required && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {ticket.kva_approved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm text-success">KVA genehmigt</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-warning" />
                        <span className="text-sm text-warning">KVA ausstehend</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Change */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Status ändern</CardTitle>
              <CardDescription>Wählen Sie den neuen Status und fügen Sie optional eine Notiz hinzu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allowedTransitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine weiteren Statusänderungen möglich.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {allowedTransitions.map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate(status)}
                        disabled={updateStatusMutation.isPending}
                        className={status === 'STORNIERT' ? 'text-destructive border-destructive' : ''}
                      >
                        {updateStatusMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Optionale Notiz zur Statusänderung..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={2}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repair" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Interne Notizen
              </CardTitle>
              <CardDescription>Nur für Mitarbeiter sichtbar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Interne Notizen zur Reparatur..."
                value={internalNote || ticket.internal_notes || ''}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={4}
              />
              <Button 
                onClick={() => updateNotesMutation.mutate()}
                disabled={updateNotesMutation.isPending}
              >
                {updateNotesMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Notiz speichern
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Verwendete Teile
              </CardTitle>
              <Dialog open={partDialogOpen} onOpenChange={setPartDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Teil hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Teil zum Ticket hinzufügen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Teil auswählen</label>
                      <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Teil wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableParts?.map((part: any) => (
                            <SelectItem key={part.id} value={part.id}>
                              {part.name} ({part.stock_quantity} verfügbar) - {part.sales_price.toFixed(2)} €
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Anzahl</label>
                      <Input
                        type="number"
                        min={1}
                        max={availableParts?.find(p => p.id === selectedPartId)?.stock_quantity || 1}
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPartDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button 
                      onClick={() => addPartMutation.mutate()}
                      disabled={!selectedPartId || addPartMutation.isPending}
                    >
                      {addPartMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Hinzufügen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {partUsage?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Noch keine Teile zugeordnet
                </p>
              ) : (
                <div className="space-y-3">
                  {partUsage?.map((usage: any) => (
                    <div
                      key={usage.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{usage.part?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {usage.part?.brand} {usage.part?.model}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{usage.quantity}x</p>
                          <p className="text-sm text-muted-foreground">
                            {((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removePartMutation.mutate(usage.id)}
                          disabled={removePartMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Gesamt</span>
                    <span>{totalPartsPrice.toFixed(2)} €</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <TicketDocuments ticket={ticket} partUsage={partUsage} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Statusverlauf
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory?.map((entry: any, index: number) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      {index < (statusHistory?.length || 0) - 1 && (
                        <div className="flex-1 w-0.5 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className={`status-badge ${STATUS_COLORS[entry.new_status as TicketStatus]}`}>
                          {STATUS_LABELS[entry.new_status as TicketStatus]}
                        </span>
                        {entry.old_status && (
                          <span className="text-xs text-muted-foreground">
                            von {STATUS_LABELS[entry.old_status as TicketStatus]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        {entry.changed_by?.name && ` • ${entry.changed_by.name}`}
                      </p>
                      {entry.note && (
                        <p className="text-sm mt-1 text-foreground">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
