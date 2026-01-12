import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  Package,
  Loader2,
  AlertTriangle,
  User,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PartUsageApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId?: string; // Optional: filter by ticket
}

interface PendingUsage {
  id: string;
  quantity: number;
  reason: string | null;
  notes: string | null;
  approval_status: string;
  created_at: string;
  repair_ticket_id: string;
  part: {
    id: string;
    name: string;
    sku: string | null;
    sales_price: number;
    stock_quantity: number;
  };
  booked_by_profile: {
    name: string;
  } | null;
  ticket: {
    ticket_number: string;
    device: {
      brand: string;
      model: string;
    } | null;
  } | null;
}

export default function PartUsageApprovalDialog({
  open,
  onOpenChange,
  ticketId,
}: PartUsageApprovalDialogProps) {
  const queryClient = useQueryClient();
  const { profile, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [selectedUsage, setSelectedUsage] = useState<PendingUsage | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const canApprove = hasAnyRole(['ADMIN', 'FILIALLEITER']);

  // Fetch pending approvals
  const { data: pendingUsages, isLoading } = useQuery({
    queryKey: ['pending-part-approvals', ticketId],
    queryFn: async () => {
      let query = supabase
        .from('ticket_part_usage')
        .select(`
          *,
          part:parts(id, name, sku, sales_price, stock_quantity),
          booked_by_profile:profiles!ticket_part_usage_booked_by_fkey(name),
          ticket:repair_tickets(
            ticket_number,
            device:devices(brand, model)
          )
        `)
        .eq('approval_status', 'PENDING')
        .order('created_at', { ascending: false });

      if (ticketId) {
        query = query.eq('repair_ticket_id', ticketId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PendingUsage[];
    },
    enabled: open,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (usageId: string) => {
      const { error } = await supabase
        .from('ticket_part_usage')
        .update({
          approval_status: 'APPROVED',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', usageId);

      if (error) throw error;

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'APPROVE_PART_USAGE',
        entity_type: 'ticket_part_usage',
        entity_id: usageId,
        meta: { approved_by: profile?.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-part-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-parts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      setSelectedUsage(null);
      setActionType(null);
      toast({
        title: 'Freigabe erteilt',
        description: 'Der Teileverbrauch wurde genehmigt.',
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

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ usageId, reason }: { usageId: string; reason: string }) => {
      const usage = pendingUsages?.find(u => u.id === usageId);
      if (!usage) throw new Error('Verwendung nicht gefunden');

      // Restore stock quantity
      const { error: stockError } = await supabase
        .from('parts')
        .update({
          stock_quantity: (usage.part?.stock_quantity || 0) + usage.quantity,
        })
        .eq('id', usage.part.id);

      if (stockError) throw stockError;

      // Update usage status
      const { error: usageError } = await supabase
        .from('ticket_part_usage')
        .update({
          approval_status: 'REJECTED',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
          approval_note: reason,
        })
        .eq('id', usageId);

      if (usageError) throw usageError;

      // Reverse the stock movement
      const { data: movement } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('repair_ticket_id', usage.repair_ticket_id)
        .eq('part_id', usage.part.id)
        .eq('movement_type', 'CONSUMPTION')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (movement) {
        await supabase.from('stock_movements').insert({
          movement_type: 'INVENTORY_PLUS',
          part_id: usage.part.id,
          stock_location_id: movement.stock_location_id,
          quantity: usage.quantity,
          stock_before: usage.part.stock_quantity,
          stock_after: (usage.part?.stock_quantity || 0) + usage.quantity,
          created_by: profile?.id!,
          reason: `Ablehnung Teileverbrauch: ${reason}`,
          notes: `Rückbuchung für Ticket ${usage.ticket?.ticket_number}`,
        });
      }

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        action: 'REJECT_PART_USAGE',
        entity_type: 'ticket_part_usage',
        entity_id: usageId,
        meta: { reason, rejected_by: profile?.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-part-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-parts'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setSelectedUsage(null);
      setActionType(null);
      setRejectionReason('');
      toast({
        title: 'Ablehnung erfolgt',
        description: 'Der Teileverbrauch wurde abgelehnt und der Bestand zurückgebucht.',
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

  const handleAction = (usage: PendingUsage, action: 'approve' | 'reject') => {
    setSelectedUsage(usage);
    setActionType(action);
    if (action === 'approve') {
      approveMutation.mutate(usage.id);
    }
  };

  const confirmReject = () => {
    if (!selectedUsage || !rejectionReason.trim()) return;
    rejectMutation.mutate({ usageId: selectedUsage.id, reason: rejectionReason });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Teileverbrauch-Freigaben
          </DialogTitle>
          <DialogDescription>
            {ticketId
              ? 'Offene Freigaben für diesen Auftrag'
              : 'Alle offenen Freigaben verwalten'}
          </DialogDescription>
        </DialogHeader>

        {actionType === 'reject' && selectedUsage ? (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Ablehnung bestätigen</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedUsage.quantity}x {selectedUsage.part.name} wird zurückgebucht.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Begründung *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Grund für die Ablehnung..."
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActionType(null);
                  setSelectedUsage(null);
                  setRejectionReason('');
                }}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={confirmReject}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Ablehnen & Zurückbuchen
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 max-h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !pendingUsages || pendingUsages.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-success/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Keine offenen Freigaben</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {pendingUsages.map((usage) => (
                    <div
                      key={usage.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{usage.part.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {usage.quantity}x
                            </Badge>
                          </div>
                          {usage.part.sku && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {usage.part.sku}
                            </p>
                          )}
                          {!ticketId && usage.ticket && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <span className="font-mono">{usage.ticket.ticket_number}</span>
                              <span>•</span>
                              <span>
                                {usage.ticket.device?.brand} {usage.ticket.device?.model}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {usage.booked_by_profile?.name || 'Unbekannt'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(usage.created_at), 'dd.MM. HH:mm', { locale: de })}
                            </div>
                          </div>
                          {usage.notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              "{usage.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-right font-medium">
                            {(usage.part.sales_price * usage.quantity).toFixed(2)} €
                          </p>
                          {canApprove && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success hover:text-success hover:bg-success/10"
                                onClick={() => handleAction(usage, 'approve')}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleAction(usage, 'reject')}
                                disabled={rejectMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator />

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
