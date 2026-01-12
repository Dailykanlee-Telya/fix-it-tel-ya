import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Euro,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  History,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  RefreshCw,
  Trash2,
  Gift,
} from 'lucide-react';

// KVA Status labels & colors
const KVA_STATUS_LABELS: Record<string, string> = {
  ENTWURF: 'Entwurf',
  ERSTELLT: 'Erstellt',
  GESENDET: 'Gesendet',
  WARTET_AUF_ANTWORT: 'Wartet auf Antwort',
  FREIGEGEBEN: 'Freigegeben',
  ABGELEHNT: 'Abgelehnt',
  ENTSORGEN: 'Entsorgung gewählt',
  RUECKFRAGE: 'Rückfrage',
  ABGELAUFEN: 'Abgelaufen',
};

const KVA_STATUS_COLORS: Record<string, string> = {
  ENTWURF: 'bg-muted text-muted-foreground',
  ERSTELLT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  GESENDET: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  WARTET_AUF_ANTWORT: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  FREIGEGEBEN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ABGELEHNT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ENTSORGEN: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  RUECKFRAGE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ABGELAUFEN: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const KVA_TYPE_LABELS: Record<string, string> = {
  FIXPREIS: 'Festpreis',
  VARIABEL: 'Variabler Preis',
  BIS_ZU: 'Bis-zu-Preis',
};

interface KvaManagerProps {
  ticketId: string;
  ticket: any;
  partUsage?: any[];
  onStatusChange?: () => void;
}

export function KvaManager({ ticketId, ticket, partUsage, onStatusChange }: KvaManagerProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [waiveFeeDialogOpen, setWaiveFeeDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [endcustomerPriceDialogOpen, setEndcustomerPriceDialogOpen] = useState(false);
  
  // Form states
  const [kvaType, setKvaType] = useState<string>('VARIABEL');
  const [repairCost, setRepairCost] = useState<string>('');
  const [minCost, setMinCost] = useState<string>('');
  const [maxCost, setMaxCost] = useState<string>('');
  const [kvaFee, setKvaFee] = useState<string>('35.00');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [repairDescription, setRepairDescription] = useState<string>('');
  const [validDays, setValidDays] = useState<string>('14');
  
  // Approval form
  const [approvalChannel, setApprovalChannel] = useState<'ONLINE' | 'TELEFON' | 'VOR_ORT' | 'EMAIL' | 'SMS'>('TELEFON');
  const [approvalNote, setApprovalNote] = useState<string>('');
  
  // Waiver form
  const [waiverReason, setWaiverReason] = useState<string>('');
  
  // B2B endcustomer price form
  const [endcustomerPrice, setEndcustomerPrice] = useState<string>('');
  const [releaseEndcustomerPrice, setReleaseEndcustomerPrice] = useState(false);

  // Fetch current KVA
  const { data: currentKva, isLoading: loadingKva } = useQuery({
    queryKey: ['kva-current', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kva_estimates')
        .select(`
          *,
          created_by_profile:profiles!kva_estimates_created_by_fkey(name),
          waiver_by_profile:profiles!kva_estimates_kva_fee_waiver_by_fkey(name)
        `)
        .eq('repair_ticket_id', ticketId)
        .eq('is_current', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch all KVA versions
  const { data: allKvas } = useQuery({
    queryKey: ['kva-all', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kva_estimates')
        .select('*')
        .eq('repair_ticket_id', ticketId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch KVA history
  const { data: kvaHistory } = useQuery({
    queryKey: ['kva-history', currentKva?.id],
    queryFn: async () => {
      if (!currentKva?.id) return [];
      const { data, error } = await supabase
        .from('kva_history')
        .select(`
          *,
          user:profiles(name)
        `)
        .eq('kva_estimate_id', currentKva.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentKva?.id,
  });

  // Calculate parts cost
  const totalPartsCost = partUsage?.reduce(
    (sum, p) => sum + (p.unit_sales_price || 0) * p.quantity,
    0
  ) || 0;

  // Create KVA mutation
  const createKvaMutation = useMutation({
    mutationFn: async () => {
      const parsedRepairCost = parseFloat(repairCost) || 0;
      const parsedMinCost = parseFloat(minCost) || null;
      const parsedMaxCost = parseFloat(maxCost) || null;
      const parsedKvaFee = parseFloat(kvaFee) || 35;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(validDays));

      let totalCost = parsedRepairCost + totalPartsCost;
      if (kvaType === 'BIS_ZU' && parsedMaxCost) {
        totalCost = parsedMaxCost;
      }

      // If there's an existing KVA, mark it as not current
      if (currentKva) {
        await supabase
          .from('kva_estimates')
          .update({ is_current: false })
          .eq('id', currentKva.id);
      }

      const newVersion = currentKva ? currentKva.version + 1 : 1;

      const { data, error } = await supabase
        .from('kva_estimates')
        .insert({
          repair_ticket_id: ticketId,
          version: newVersion,
          parent_kva_id: currentKva?.id || null,
          kva_type: kvaType as 'FIXPREIS' | 'VARIABEL' | 'BIS_ZU',
          status: 'ERSTELLT' as const,
          repair_cost: parsedRepairCost,
          parts_cost: totalPartsCost,
          total_cost: totalCost,
          min_cost: parsedMinCost,
          max_cost: parsedMaxCost,
          kva_fee_amount: parsedKvaFee,
          valid_until: validUntil.toISOString(),
          diagnosis,
          repair_description: repairDescription,
          created_by: profile?.id,
          // For B2B tickets, set internal_price
          internal_price: ticket.is_b2b ? totalCost : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add KVA history entry
      await supabase.from('kva_history').insert({
        kva_estimate_id: data.id,
        action: 'ERSTELLT',
        new_values: { 
          kva_type: kvaType, 
          total_cost: totalCost,
          version: newVersion 
        } as any,
        user_id: profile?.id,
        note: `KVA Version ${newVersion} erstellt`,
      });

      // Update ticket to require KVA and set status
      const oldStatus = ticket.status;
      await supabase
        .from('repair_tickets')
        .update({ 
          kva_required: true,
          estimated_price: totalCost,
          status: 'WARTET_AUF_TEIL_ODER_FREIGABE',
        })
        .eq('id', ticketId);

      // Add status history entry for ticket status change
      await supabase.from('status_history').insert({
        repair_ticket_id: ticketId,
        old_status: oldStatus,
        new_status: 'WARTET_AUF_TEIL_ODER_FREIGABE',
        changed_by_user_id: profile?.id,
        note: `KVA erstellt (Version ${newVersion})`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kva-current', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['kva-all', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
      setCreateDialogOpen(false);
      resetForm();
      toast.success('KVA erstellt - Auftragsstatus auf "Wartet auf Freigabe" gesetzt');
      onStatusChange?.();
    },
    onError: (error: any) => {
      toast.error('Fehler beim Erstellen: ' + error.message);
    },
  });

  // Send KVA mutation
  const sendKvaMutation = useMutation({
    mutationFn: async (channel: 'EMAIL' | 'SMS') => {
      if (!currentKva) throw new Error('Kein KVA vorhanden');

      // Update KVA status
      const { error } = await supabase
        .from('kva_estimates')
        .update({
          status: 'GESENDET',
          sent_at: new Date().toISOString(),
          sent_via: channel,
          updated_by: profile?.id,
        })
        .eq('id', currentKva.id);

      if (error) throw error;

      // Add KVA history entry
      await supabase.from('kva_history').insert({
        kva_estimate_id: currentKva.id,
        action: 'GESENDET',
        new_values: { sent_via: channel },
        user_id: profile?.id,
        note: `KVA per ${channel} versendet`,
      });

      // Only update ticket status if not already waiting
      const oldStatus = ticket.status;
      if (oldStatus !== 'WARTET_AUF_TEIL_ODER_FREIGABE') {
        await supabase
          .from('repair_tickets')
          .update({ status: 'WARTET_AUF_TEIL_ODER_FREIGABE' })
          .eq('id', ticketId);

        // Add status history entry
        await supabase.from('status_history').insert({
          repair_ticket_id: ticketId,
          old_status: oldStatus,
          new_status: 'WARTET_AUF_TEIL_ODER_FREIGABE',
          changed_by_user_id: profile?.id,
          note: `KVA per ${channel} versendet`,
        });
      }

      // Send email if channel is EMAIL and customer has email
      if (channel === 'EMAIL' && ticket.customer?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'kva_ready',
            ticket_id: ticketId,
          },
        });
      }

      return { channel };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kva-current', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
      setSendDialogOpen(false);
      toast.success('KVA versendet');
      onStatusChange?.();
    },
    onError: (error: any) => {
      toast.error('Fehler beim Versenden: ' + error.message);
    },
  });

  // Manual approval mutation
  const manualApproveMutation = useMutation({
    mutationFn: async (approved: boolean) => {
      if (!currentKva) throw new Error('Kein KVA vorhanden');

      const newKvaStatus = approved ? 'FREIGEGEBEN' : 'ABGELEHNT';
      const oldTicketStatus = ticket.status;
      // When manually approved, set to FREIGEGEBEN so workshop knows action is required
      const newTicketStatus = approved ? 'FREIGEGEBEN' : 'WARTET_AUF_TEIL_ODER_FREIGABE';

      const { error } = await supabase
        .from('kva_estimates')
        .update({
          status: newKvaStatus,
          decision: newKvaStatus,
          decision_at: new Date().toISOString(),
          decision_by_customer: false,
          decision_channel: approvalChannel,
          decision_note: approvalNote,
          updated_by: profile?.id,
        })
        .eq('id', currentKva.id);

      if (error) throw error;

      // Add KVA history entry
      await supabase.from('kva_history').insert({
        kva_estimate_id: currentKva.id,
        action: approved ? 'MANUELL_FREIGEGEBEN' : 'MANUELL_ABGELEHNT',
        new_values: { 
          decision_channel: approvalChannel,
          decision_note: approvalNote 
        },
        user_id: profile?.id,
        note: `KVA manuell ${approved ? 'freigegeben' : 'abgelehnt'} (${approvalChannel})`,
      });

      // Update ticket status and approval
      await supabase
        .from('repair_tickets')
        .update({ 
          kva_approved: approved,
          kva_approved_at: new Date().toISOString(),
          status: newTicketStatus,
        })
        .eq('id', ticketId);

      // Add status history entry
      if (oldTicketStatus !== newTicketStatus) {
        await supabase.from('status_history').insert({
          repair_ticket_id: ticketId,
          old_status: oldTicketStatus,
          new_status: newTicketStatus,
          changed_by_user_id: profile?.id,
          note: approved 
            ? `KVA freigegeben (${approvalChannel}): ${approvalNote}`
            : `KVA abgelehnt (${approvalChannel}): ${approvalNote}`,
        });
      }

      return { approved };
    },
    onSuccess: ({ approved }) => {
      queryClient.invalidateQueries({ queryKey: ['kva-current', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
      setApproveDialogOpen(false);
      setApprovalNote('');
      toast.success(approved 
        ? 'KVA freigegeben - Auftrag ist jetzt "Freigegeben" und wartet auf Bearbeitung' 
        : 'KVA abgelehnt');
      onStatusChange?.();
    },
    onError: (error: any) => {
      toast.error('Fehler: ' + error.message);
    },
  });

  // Waive fee mutation
  const waiveFeeMutation = useMutation({
    mutationFn: async () => {
      if (!currentKva) throw new Error('Kein KVA vorhanden');

      const { error } = await supabase
        .from('kva_estimates')
        .update({
          kva_fee_waived: true,
          kva_fee_waiver_reason: waiverReason,
          kva_fee_waiver_by: profile?.id,
          updated_by: profile?.id,
        })
        .eq('id', currentKva.id);

      if (error) throw error;

      // Add history entry
      await supabase.from('kva_history').insert({
        kva_estimate_id: currentKva.id,
        action: 'GEBUEHR_ERLASSEN',
        new_values: { waiver_reason: waiverReason },
        user_id: profile?.id,
        note: `KVA-Gebühr erlassen: ${waiverReason}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kva-current', ticketId] });
      setWaiveFeeDialogOpen(false);
      setWaiverReason('');
      toast.success('KVA-Gebühr erlassen');
    },
    onError: (error: any) => {
      toast.error('Fehler: ' + error.message);
    },
  });

  // B2B: Set endcustomer price mutation
  const setEndcustomerPriceMutation = useMutation({
    mutationFn: async () => {
      if (!currentKva) throw new Error('Kein KVA vorhanden');

      const parsedPrice = parseFloat(endcustomerPrice) || 0;

      const { error } = await supabase
        .from('kva_estimates')
        .update({
          endcustomer_price: parsedPrice,
          endcustomer_price_released: releaseEndcustomerPrice,
          updated_by: profile?.id,
        })
        .eq('id', currentKva.id);

      if (error) throw error;

      // Also update ticket
      await supabase
        .from('repair_tickets')
        .update({
          endcustomer_price: parsedPrice,
          endcustomer_price_released: releaseEndcustomerPrice,
        })
        .eq('id', ticketId);

      // Add history entry
      await supabase.from('kva_history').insert({
        kva_estimate_id: currentKva.id,
        action: releaseEndcustomerPrice ? 'ENDKUNDENPREIS_FREIGEGEBEN' : 'ENDKUNDENPREIS_GESETZT',
        new_values: { 
          endcustomer_price: parsedPrice,
          released: releaseEndcustomerPrice 
        },
        user_id: profile?.id,
        note: releaseEndcustomerPrice 
          ? `Endkundenpreis ${parsedPrice.toFixed(2)} € für Dokumente freigegeben`
          : `Endkundenpreis auf ${parsedPrice.toFixed(2)} € gesetzt`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kva-current', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setEndcustomerPriceDialogOpen(false);
      toast.success(releaseEndcustomerPrice 
        ? 'Endkundenpreis freigegeben' 
        : 'Endkundenpreis gespeichert');
    },
    onError: (error: any) => {
      toast.error('Fehler: ' + error.message);
    },
  });

  const resetForm = () => {
    setKvaType('VARIABEL');
    setRepairCost('');
    setMinCost('');
    setMaxCost('');
    setKvaFee('35.00');
    setDiagnosis('');
    setRepairDescription('');
    setValidDays('14');
  };

  const canCreateNew = !currentKva || ['ABGELEHNT', 'ABGELAUFEN', 'RUECKFRAGE'].includes(currentKva.status);
  const canSend = currentKva && currentKva.status === 'ERSTELLT';
  const canApproveManually = currentKva && ['GESENDET', 'WARTET_AUF_ANTWORT'].includes(currentKva.status);
  const canWaiveFee = currentKva && !currentKva.kva_fee_waived && currentKva.status === 'ABGELEHNT';

  if (loadingKva) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Kostenvoranschlag (KVA)
            </CardTitle>
            {currentKva && (
              <Badge className={KVA_STATUS_COLORS[currentKva.status]}>
                {KVA_STATUS_LABELS[currentKva.status]}
              </Badge>
            )}
          </div>
          <CardDescription>
            {currentKva 
              ? `Version ${currentKva.version} • ${KVA_TYPE_LABELS[currentKva.kva_type]}`
              : 'Noch kein KVA erstellt'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current KVA Details */}
          {currentKva ? (
            <div className="space-y-4">
              {/* Price Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Reparaturkosten</p>
                  <p className="text-lg font-semibold">{currentKva.repair_cost?.toFixed(2) || '0.00'} €</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Ersatzteile</p>
                  <p className="text-lg font-semibold">{currentKva.parts_cost?.toFixed(2) || '0.00'} €</p>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Gesamtpreis</p>
                  <p className="text-2xl font-bold text-primary">
                    {currentKva.kva_type === 'BIS_ZU' 
                      ? `bis ${currentKva.max_cost?.toFixed(2)} €`
                      : `${currentKva.total_cost?.toFixed(2)} €`}
                  </p>
                </div>
                {currentKva.kva_type === 'BIS_ZU' && currentKva.min_cost && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Mindestens: {currentKva.min_cost.toFixed(2)} €
                  </p>
                )}
              </div>

              {/* KVA Fee */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">KVA-Gebühr bei Ablehnung</p>
                  <p className="text-xs text-muted-foreground">
                    {currentKva.kva_fee_waived 
                      ? `Erlassen: ${currentKva.kva_fee_waiver_reason}`
                      : 'Wird bei Ablehnung berechnet'}
                  </p>
                </div>
                <p className={`text-lg font-semibold ${currentKva.kva_fee_waived ? 'line-through text-muted-foreground' : ''}`}>
                  {currentKva.kva_fee_amount?.toFixed(2)} €
                </p>
              </div>

              {/* B2B: Endcustomer Price Section */}
              {ticket.is_b2b && (
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Endkundenpreis</p>
                      <p className="text-xs text-muted-foreground">
                        {currentKva.endcustomer_price_released 
                          ? 'Für Dokumente freigegeben'
                          : 'Noch nicht für Dokumente freigegeben'}
                      </p>
                    </div>
                    <div className="text-right">
                      {currentKva.endcustomer_price ? (
                        <p className="text-lg font-semibold">{currentKva.endcustomer_price.toFixed(2)} €</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nicht gesetzt</p>
                      )}
                      {currentKva.endcustomer_price_released && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Freigegeben
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 w-full"
                    onClick={() => {
                      setEndcustomerPrice(currentKva.endcustomer_price?.toString() || '');
                      setReleaseEndcustomerPrice(currentKva.endcustomer_price_released || false);
                      setEndcustomerPriceDialogOpen(true);
                    }}
                  >
                    <Euro className="h-4 w-4 mr-2" />
                    Endkundenpreis bearbeiten
                  </Button>
                </div>
              )}

              {/* Validity */}
              {currentKva.valid_until && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Gültig bis: {format(new Date(currentKva.valid_until), 'dd.MM.yyyy', { locale: de })}</span>
                </div>
              )}

              {/* Diagnosis */}
              {currentKva.diagnosis && (
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-1">Diagnose</p>
                  <p className="text-sm text-muted-foreground">{currentKva.diagnosis}</p>
                </div>
              )}

              {/* Decision Info */}
              {currentKva.decision_at && (
                <div className={`p-4 rounded-lg ${
                  currentKva.status === 'FREIGEGEBEN' ? 'bg-green-50 border-green-200 dark:bg-green-950' :
                  currentKva.status === 'ABGELEHNT' ? 'bg-red-50 border-red-200 dark:bg-red-950' :
                  'bg-muted'
                } border`}>
                  <div className="flex items-center gap-2">
                    {currentKva.status === 'FREIGEGEBEN' 
                      ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                      : <XCircle className="h-5 w-5 text-red-600" />
                    }
                    <span className="font-medium">
                      {currentKva.decision_by_customer ? 'Kunde' : 'Mitarbeiter'} hat {currentKva.status === 'FREIGEGEBEN' ? 'freigegeben' : 'abgelehnt'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(currentKva.decision_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    {currentKva.decision_channel && ` • ${currentKva.decision_channel}`}
                  </p>
                  {currentKva.decision_note && (
                    <p className="text-sm mt-2">{currentKva.decision_note}</p>
                  )}
                  {currentKva.disposal_option && (
                    <p className="text-sm mt-1">
                      Entsorgung: {currentKva.disposal_option === 'KOSTENLOS_ENTSORGEN' ? 'Kostenlos entsorgen' : 'Zurücksenden'}
                    </p>
                  )}
                </div>
              )}

              {/* Customer Question */}
              {currentKva.customer_question && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4" />
                    Kundenrückfrage
                  </p>
                  <p className="text-sm">{currentKva.customer_question}</p>
                  {currentKva.staff_answer && (
                    <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                      <p className="text-sm text-muted-foreground">Antwort:</p>
                      <p className="text-sm">{currentKva.staff_answer}</p>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {canSend && (
                  <Button onClick={() => setSendDialogOpen(true)} className="gap-2">
                    <Send className="h-4 w-4" />
                    KVA versenden
                  </Button>
                )}
                
                {canApproveManually && (
                  <Button variant="outline" onClick={() => setApproveDialogOpen(true)} className="gap-2">
                    <Phone className="h-4 w-4" />
                    Manuelle Freigabe
                  </Button>
                )}

                {canWaiveFee && (
                  <Button variant="outline" onClick={() => setWaiveFeeDialogOpen(true)} className="gap-2">
                    <Gift className="h-4 w-4" />
                    Gebühr erlassen
                  </Button>
                )}

                {canCreateNew && (
                  <Button variant="outline" onClick={() => setCreateDialogOpen(true)} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Neuen KVA erstellen
                  </Button>
                )}

                <Button variant="ghost" onClick={() => setHistoryDialogOpen(true)} className="gap-2">
                  <History className="h-4 w-4" />
                  Verlauf
                </Button>
              </div>
            </div>
          ) : (
            /* No KVA yet */
            <div className="text-center py-6">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Noch kein Kostenvoranschlag erstellt
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                KVA erstellen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create KVA Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kostenvoranschlag erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen KVA für diesen Auftrag.
              {currentKva && ` (Version ${currentKva.version + 1})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* KVA Type */}
            <div className="space-y-2">
              <Label>KVA-Typ</Label>
              <Select value={kvaType} onValueChange={setKvaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXPREIS">Festpreis</SelectItem>
                  <SelectItem value="VARIABEL">Variabler Preis</SelectItem>
                  <SelectItem value="BIS_ZU">Bis-zu-Preis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Fields */}
            {kvaType === 'BIS_ZU' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mindestpreis (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={minCost}
                    onChange={(e) => setMinCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximalpreis (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Reparaturkosten (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Parts Cost (read-only) */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span>Ersatzteile ({partUsage?.length || 0} Positionen)</span>
                <span className="font-medium">{totalPartsCost.toFixed(2)} €</span>
              </div>
            </div>

            {/* KVA Fee */}
            <div className="space-y-2">
              <Label>KVA-Gebühr bei Ablehnung (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={kvaFee}
                onChange={(e) => setKvaFee(e.target.value)}
                placeholder="35.00"
              />
            </div>

            {/* Validity */}
            <div className="space-y-2">
              <Label>Gültigkeit (Tage)</Label>
              <Input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                placeholder="14"
              />
            </div>

            {/* Diagnosis */}
            <div className="space-y-2">
              <Label>Diagnose / Befund</Label>
              <Textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Ergebnis der Diagnose..."
                rows={2}
              />
            </div>

            {/* Repair Description */}
            <div className="space-y-2">
              <Label>Geplante Arbeiten</Label>
              <Textarea
                value={repairDescription}
                onChange={(e) => setRepairDescription(e.target.value)}
                placeholder="Beschreibung der geplanten Reparatur..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => createKvaMutation.mutate()} 
              disabled={createKvaMutation.isPending}
            >
              {createKvaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              KVA erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send KVA Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KVA versenden</DialogTitle>
            <DialogDescription>
              Wählen Sie den Kommunikationskanal für den Versand.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {ticket.customer?.email && (
              <Button 
                className="w-full justify-start gap-3" 
                variant="outline"
                onClick={() => sendKvaMutation.mutate('EMAIL')}
                disabled={sendKvaMutation.isPending}
              >
                <Mail className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Per E-Mail senden</p>
                  <p className="text-xs text-muted-foreground">{ticket.customer.email}</p>
                </div>
              </Button>
            )}
            
            {ticket.customer?.phone && (
              <Button 
                className="w-full justify-start gap-3" 
                variant="outline"
                onClick={() => sendKvaMutation.mutate('SMS')}
                disabled={sendKvaMutation.isPending}
              >
                <Phone className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Per SMS senden</p>
                  <p className="text-xs text-muted-foreground">{ticket.customer.phone}</p>
                </div>
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Der Kunde erhält einen Link zur Freigabe/Ablehnung des KVA.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Approval Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manuelle KVA-Freigabe</DialogTitle>
            <DialogDescription>
              Dokumentieren Sie die Kundenentscheidung.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kommunikationsweg</Label>
              <Select value={approvalChannel} onValueChange={(v) => setApprovalChannel(v as 'ONLINE' | 'TELEFON' | 'VOR_ORT' | 'EMAIL' | 'SMS')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELEFON">Telefonisch</SelectItem>
                  <SelectItem value="VOR_ORT">Vor Ort</SelectItem>
                  <SelectItem value="EMAIL">E-Mail</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notiz zur Freigabe</Label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="z.B. 'Kunde hat telefonisch am 02.01. um 14:30 Uhr zugestimmt'"
                rows={3}
              />
              <p className="text-xs text-destructive">
                Pflichtfeld: Dokumentation des Kundengesprächs erforderlich
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="destructive" 
              onClick={() => manualApproveMutation.mutate(false)}
              disabled={manualApproveMutation.isPending || !approvalNote.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Ablehnen
            </Button>
            <Button 
              onClick={() => manualApproveMutation.mutate(true)}
              disabled={manualApproveMutation.isPending || !approvalNote.trim()}
            >
              {manualApproveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Freigeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waive Fee Dialog */}
      <Dialog open={waiveFeeDialogOpen} onOpenChange={setWaiveFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KVA-Gebühr erlassen</DialogTitle>
            <DialogDescription>
              Erlassen Sie die KVA-Gebühr von {currentKva?.kva_fee_amount?.toFixed(2)} €.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Begründung (Pflichtfeld)</Label>
              <Textarea
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="z.B. 'Kulanzentscheidung wegen Stammkunde'"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveFeeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => waiveFeeMutation.mutate()}
              disabled={waiveFeeMutation.isPending || !waiverReason.trim()}
            >
              {waiveFeeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gebühr erlassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KVA-Verlauf</DialogTitle>
            <DialogDescription>
              Alle Änderungen und Aktionen für diesen KVA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Version History */}
            {allKvas && allKvas.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Versionen</p>
                <div className="space-y-1">
                  {allKvas.map((kva: any) => (
                    <div 
                      key={kva.id} 
                      className={`p-2 rounded text-sm ${kva.is_current ? 'bg-primary/10' : 'bg-muted/30'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span>Version {kva.version}</span>
                        <Badge variant="outline" className="text-xs">
                          {KVA_STATUS_LABELS[kva.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(kva.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        {' • '}{kva.total_cost?.toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Action History */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Aktionen</p>
              {kvaHistory && kvaHistory.length > 0 ? (
                <div className="space-y-2">
                  {kvaHistory.map((entry: any) => (
                    <div key={entry.id} className="p-2 rounded bg-muted/30 text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd.MM. HH:mm', { locale: de })}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-muted-foreground mt-1">{entry.note}</p>
                      )}
                      {entry.user?.name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          von {entry.user.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Historie vorhanden</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* B2B: Endcustomer Price Dialog */}
      <Dialog open={endcustomerPriceDialogOpen} onOpenChange={setEndcustomerPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endkundenpreis festlegen</DialogTitle>
            <DialogDescription>
              Legen Sie den Preis fest, der dem Endkunden auf Dokumenten angezeigt wird.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span>Interne Kosten (B2B-Preis)</span>
                <span className="font-medium">{currentKva?.total_cost?.toFixed(2) || '0.00'} €</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endkundenpreis (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={endcustomerPrice}
                onChange={(e) => setEndcustomerPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Dieser Preis wird auf Dokumenten für den Endkunden angezeigt.
              </p>
            </div>

            <div className="flex items-center space-x-2 p-3 rounded-lg border">
              <Checkbox
                id="releasePrice"
                checked={releaseEndcustomerPrice}
                onCheckedChange={(checked) => setReleaseEndcustomerPrice(checked as boolean)}
              />
              <div>
                <Label htmlFor="releasePrice" className="cursor-pointer">
                  Endkundenpreis für Dokumente freigeben
                </Label>
                <p className="text-xs text-muted-foreground">
                  Der Preis wird auf Lieferscheinen und Reparaturberichten angezeigt
                </p>
              </div>
            </div>

            {releaseEndcustomerPrice && parseFloat(endcustomerPrice) > 0 && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Endkundenpreis von <strong>{parseFloat(endcustomerPrice).toFixed(2)} €</strong> wird auf Dokumenten angezeigt.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEndcustomerPriceDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => setEndcustomerPriceMutation.mutate()}
              disabled={setEndcustomerPriceMutation.isPending || !endcustomerPrice}
            >
              {setEndcustomerPriceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
