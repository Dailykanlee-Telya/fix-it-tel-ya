import React, { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
  ClipboardCheck,
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
import TicketMessages from '@/components/tickets/TicketMessages';
import TicketPhotos from '@/components/tickets/TicketPhotos';
import TicketInternalNotes from '@/components/tickets/TicketInternalNotes';
import { KvaManager } from '@/components/tickets/KvaManager';
import PickupReceipt from '@/components/documents/PickupReceipt';
import TicketPartSelector from '@/components/tickets/TicketPartSelector';
import CreatePartFromTicketDialog from '@/components/tickets/CreatePartFromTicketDialog';

// Status order for determining forward/backward changes
const STATUS_ORDER: TicketStatus[] = [
  'NEU_EINGEGANGEN',
  'IN_DIAGNOSE', 
  'WARTET_AUF_TEIL_ODER_FREIGABE',
  'IN_REPARATUR',
  'FERTIG_ZUR_ABHOLUNG',
  'ABGEHOLT',
];

// Closed statuses that cannot be changed
const CLOSED_STATUSES: TicketStatus[] = ['ABGEHOLT', 'STORNIERT'];

// All possible transitions (forward transitions are always allowed, backward with reason)
const getAllowedTransitions = (currentStatus: TicketStatus): TicketStatus[] => {
  // Closed statuses cannot be changed
  if (CLOSED_STATUSES.includes(currentStatus)) {
    return [];
  }
  
  // All non-closed statuses can be targets (except current)
  return ['NEU_EINGEGANGEN', 'IN_DIAGNOSE', 'WARTET_AUF_TEIL_ODER_FREIGABE', 'IN_REPARATUR', 'FERTIG_ZUR_ABHOLUNG', 'STORNIERT']
    .filter(s => s !== currentStatus) as TicketStatus[];
};

// Check if a status change is backwards
const isBackwardTransition = (from: TicketStatus, to: TicketStatus): boolean => {
  if (to === 'STORNIERT') return false; // Cancel is never "backward"
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  return toIndex < fromIndex;
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
  const [createPartDialogOpen, setCreatePartDialogOpen] = useState(false);

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
          assigned_technician:profiles(*),
          shipment:b2b_shipments(shipment_number)
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
        .order('created_at', { ascending: true }); // Chronological order (oldest first)

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

  // Removed: availableParts query - now handled by TicketPartSelector with context-based filtering

  // Fetch checklist templates and items
  const { data: checklistTemplates } = useQuery({
    queryKey: ['checklist-templates', ticket?.device?.device_type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select(`
          *,
          items:checklist_items(*)
        `)
        .eq('active', true)
        .or(`device_type.eq.${ticket?.device?.device_type},device_type.is.null`)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!ticket?.device?.device_type,
  });

  // Fetch ticket checklist items
  const { data: ticketChecklistItems } = useQuery({
    queryKey: ['ticket-checklist', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_checklist_items')
        .select(`
          *,
          checklist_item:checklist_items(*)
        `)
        .eq('repair_ticket_id', id);

      if (error) throw error;
      return data;
    },
  });

  // Initialize checklist items for this ticket
  const initChecklistMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = checklistTemplates?.find(t => t.id === templateId);
      if (!template?.items) return;

      const items = template.items.map((item: any) => ({
        repair_ticket_id: id,
        checklist_item_id: item.id,
        checked: false,
      }));

      const { error } = await supabase
        .from('ticket_checklist_items')
        .insert(items);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-checklist', id] });
      toast({
        title: 'Checkliste hinzugefügt',
        description: 'Die Qualitätscheckliste wurde zum Auftrag hinzugefügt.',
      });
    },
  });

  // Toggle checklist item
  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('ticket_checklist_items')
        .update({
          checked,
          checked_at: checked ? new Date().toISOString() : null,
          checked_by_user_id: checked ? profile?.id : null,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-checklist', id] });
    },
  });

  // Removed: addPartMutation - now handled by TicketPartSelector component

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
        description: 'Das Teil wurde vom Auftrag entfernt.',
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
      const currentStatus = ticket?.status as TicketStatus;
      
      // Check if this is a backward transition
      const isBackward = isBackwardTransition(currentStatus, newStatus);
      
      // Backward transitions require a reason
      if (isBackward && !statusNote.trim()) {
        throw new Error('Bei Rückwärts-Statusänderungen ist eine Begründung erforderlich.');
      }
      
      // Check if checklist is complete before allowing FERTIG_ZUR_ABHOLUNG
      if (newStatus === 'FERTIG_ZUR_ABHOLUNG' && ticketChecklistItems && ticketChecklistItems.length > 0) {
        const allChecked = ticketChecklistItems.every((item: any) => item.checked);
        if (!allChecked) {
          throw new Error('Bitte schließen Sie zuerst die Qualitätscheckliste ab, bevor Sie den Status auf "Fertig zur Abholung" setzen.');
        }
      }

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

      // Send notification emails based on new status
      if (ticket?.email_opt_in && ticket?.customer?.email) {
        try {
          // KVA Ready email when status changes to WARTET_AUF_TEIL_ODER_FREIGABE and KVA is required
          if (newStatus === 'WARTET_AUF_TEIL_ODER_FREIGABE' && ticket?.kva_required) {
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'kva_ready',
                ticket_id: id,
              },
            });
            console.log('KVA ready email sent');
          }
          
          // Ready for pickup email
          if (newStatus === 'FERTIG_ZUR_ABHOLUNG') {
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'ready_for_pickup',
                ticket_id: id,
              },
            });
            console.log('Ready for pickup email sent');
          }
        } catch (emailError) {
          console.error('Error sending status email:', emailError);
          // Don't fail the status change if email fails
        }
      }

      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', id] });
      setStatusNote('');
      
      const emailSent = ticket?.email_opt_in && ticket?.customer?.email && 
        (newStatus === 'WARTET_AUF_TEIL_ODER_FREIGABE' && ticket?.kva_required || newStatus === 'FERTIG_ZUR_ABHOLUNG');
      
      toast({
        title: 'Status aktualisiert',
        description: emailSent 
          ? 'Der Auftragsstatus wurde geändert und der Kunde wurde per E-Mail benachrichtigt.'
          : 'Der Auftragsstatus wurde erfolgreich geändert.',
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
        <p className="text-muted-foreground">Auftrag nicht gefunden</p>
        <Button variant="link" onClick={() => navigate('/tickets')}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const allowedTransitions = getAllowedTransitions(ticket.status as TicketStatus);
  const totalPartsPrice = partUsage?.reduce(
    (sum: number, p: any) => sum + (p.unit_sales_price || 0) * p.quantity,
    0
  ) || 0;
  const checklistComplete = ticketChecklistItems && ticketChecklistItems.length > 0 
    ? ticketChecklistItems.every((item: any) => item.checked) 
    : true;

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
        <PickupReceipt ticket={ticket} />
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
                {/* IMEI for HANDY */}
                {ticket.device?.device_type === 'HANDY' && (
                  ticket.device?.imei_unreadable ? (
                    <p className="text-xs text-warning mt-1">IMEI nicht lesbar</p>
                  ) : ticket.device?.imei_or_serial ? (
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      IMEI: {ticket.device.imei_or_serial}
                    </p>
                  ) : null
                )}
                {/* Serial for non-HANDY */}
                {ticket.device?.device_type !== 'HANDY' && (
                  ticket.device?.serial_unreadable ? (
                    <p className="text-xs text-warning mt-1">Seriennummer nicht lesbar</p>
                  ) : ticket.device?.serial_number ? (
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      S/N: {ticket.device.serial_number}
                    </p>
                  ) : null
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="repair">Reparatur</TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1">
            <ClipboardCheck className="h-4 w-4" />
            Qualitätsprüfung
            {ticketChecklistItems && ticketChecklistItems.length > 0 && (
              <Badge variant={checklistComplete ? 'default' : 'secondary'} className="ml-1 text-xs">
                {ticketChecklistItems.filter((i: any) => i.checked).length}/{ticketChecklistItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="parts">Teile</TabsTrigger>
          <TabsTrigger value="communication" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            Kommunikation
          </TabsTrigger>
          <TabsTrigger value="documents">Dokumente</TabsTrigger>
          <TabsTrigger value="history">Verlauf</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Photos Section */}
          <TicketPhotos ticketId={id!} />
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

            {/* Pricing & KVA */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Euro className="h-5 w-5 text-success" />
                  Preisgestaltung & KVA
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
                
                {/* KVA Status or Create Button */}
                <Separator />
                {ticket.kva_required ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {ticket.kva_approved ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-sm text-success font-medium">KVA genehmigt</span>
                        </>
                      ) : ticket.kva_approved === false ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive font-medium">KVA abgelehnt</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-warning" />
                          <span className="text-sm text-warning font-medium">KVA wartet auf Antwort</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const repairTab = document.querySelector('[data-value="repair"]') as HTMLButtonElement;
                          repairTab?.click();
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        KVA bearbeiten
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Kein KVA erforderlich</span>
                    </div>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        const repairTab = document.querySelector('[data-value="repair"]') as HTMLButtonElement;
                        repairTab?.click();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      KVA erstellen
                    </Button>
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
                    {allowedTransitions.map((status) => {
                      const isBackward = isBackwardTransition(ticket.status as TicketStatus, status);
                      return (
                        <Button
                          key={status}
                          variant={isBackward ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => updateStatusMutation.mutate(status)}
                          disabled={updateStatusMutation.isPending || (isBackward && !statusNote.trim())}
                          className={`${status === 'STORNIERT' ? 'text-destructive border-destructive' : ''} ${isBackward ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : ''}`}
                          title={isBackward ? 'Rückwärts-Änderung - Begründung erforderlich' : undefined}
                        >
                          {updateStatusMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : isBackward ? (
                            <span className="mr-1">←</span>
                          ) : null}
                          {STATUS_LABELS[status]}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Check if any backward transitions exist */}
                  {allowedTransitions.some(s => isBackwardTransition(ticket.status as TicketStatus, s)) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Für Rückwärts-Statusänderungen (← markiert) ist eine Begründung erforderlich
                    </p>
                  )}
                  
                  <Textarea
                    placeholder={allowedTransitions.some(s => isBackwardTransition(ticket.status as TicketStatus, s)) 
                      ? "Begründung (Pflicht für Rückwärts-Änderungen)..." 
                      : "Optionale Notiz zur Statusänderung..."}
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
          {/* KVA Manager - Primary location for KVA management */}
          <KvaManager 
            ticketId={ticket.id}
            ticket={ticket}
            partUsage={partUsage}
            onStatusChange={() => {
              queryClient.invalidateQueries({ queryKey: ['ticket', id] });
              queryClient.invalidateQueries({ queryKey: ['ticket-history', id] });
            }}
          />
          
          {/* Internal Notes - Chronological component */}
          <TicketInternalNotes ticketId={id!} />
        </TabsContent>

        {/* Quality Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Qualitätscheckliste
              </CardTitle>
              <CardDescription>
                Alle Punkte müssen vor Abschluss der Reparatur geprüft werden
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add checklist template if none exists */}
              {(!ticketChecklistItems || ticketChecklistItems.length === 0) && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Noch keine Checkliste für diesen Auftrag. Wählen Sie eine Vorlage:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {checklistTemplates?.map((template: any) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        onClick={() => initChecklistMutation.mutate(template.id)}
                        disabled={initChecklistMutation.isPending}
                      >
                        {initChecklistMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {template.name}
                      </Button>
                    ))}
                  </div>
                  {(!checklistTemplates || checklistTemplates.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">
                      Keine Checklisten-Vorlagen für diesen Gerätetyp verfügbar.
                    </p>
                  )}
                </div>
              )}

              {/* Display checklist items */}
              {ticketChecklistItems && ticketChecklistItems.length > 0 && (
                <div className="space-y-3">
                  {ticketChecklistItems.map((item: any) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        item.checked ? 'bg-success/5 border-success/30' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={item.id}
                          checked={item.checked}
                          onCheckedChange={(checked) => 
                            toggleChecklistItemMutation.mutate({ itemId: item.id, checked: !!checked })
                          }
                        />
                        <label
                          htmlFor={item.id}
                          className={`text-sm font-medium cursor-pointer ${
                            item.checked ? 'text-success line-through' : ''
                          }`}
                        >
                          {item.checklist_item?.label}
                        </label>
                      </div>
                      {item.checked && item.checked_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.checked_at), 'dd.MM. HH:mm', { locale: de })}
                        </span>
                      )}
                    </div>
                  ))}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Fortschritt: {ticketChecklistItems.filter((i: any) => i.checked).length} von {ticketChecklistItems.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {checklistComplete 
                          ? 'Alle Prüfungen abgeschlossen' 
                          : 'Offene Prüfungen vorhanden'}
                      </p>
                    </div>
                    {checklistComplete && (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Komplett
                      </Badge>
                    )}
                  </div>
                </div>
              )}
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2" 
                  onClick={() => setCreatePartDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Neues Teil
                </Button>
                <Button size="sm" className="gap-2" onClick={() => setPartDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Teil hinzufügen
                </Button>
              </div>
            </CardHeader>
            <TicketPartSelector
              ticketId={id!}
              deviceBrand={ticket.device?.brand}
              deviceModel={ticket.device?.model}
              deviceType={ticket.device?.device_type}
              open={partDialogOpen}
              onOpenChange={setPartDialogOpen}
              onCreateNewPart={() => setCreatePartDialogOpen(true)}
            />
            <CreatePartFromTicketDialog
              open={createPartDialogOpen}
              onOpenChange={setCreatePartDialogOpen}
              deviceBrand={ticket.device?.brand}
              deviceModel={ticket.device?.model}
              deviceType={ticket.device?.device_type}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['context-parts'] });
              }}
            />
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

        <TabsContent value="communication" className="space-y-4">

          {/* Messages Component */}
          <TicketMessages ticketId={id!} />
          
          {/* Customer Tracking Info */}
          {ticket.customer?.email && (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg">Tracking-Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">Kunden-E-Mail</span>
                  <span className="text-sm font-medium">{ticket.customer.email}</span>
                </div>
                {ticket.kva_token && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Tracking-Code</span>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">{ticket.kva_token}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
