import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  User,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import TicketPartSelector from './TicketPartSelector';
import CreatePartFromTicketDialog from './CreatePartFromTicketDialog';
import PartUsageApprovalDialog from './PartUsageApprovalDialog';

interface TicketPartsTabProps {
  ticketId: string;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  deviceType?: string | null;
}

export default function TicketPartsTab({
  ticketId,
  deviceBrand,
  deviceModel,
  deviceType,
}: TicketPartsTabProps) {
  const queryClient = useQueryClient();
  const { profile, hasAnyRole } = useAuth();
  const { toast } = useToast();
  
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [createPartDialogOpen, setCreatePartDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const canApprove = hasAnyRole(['ADMIN', 'FILIALLEITER']);

  // Fetch part usage with approval status
  const { data: partUsage, isLoading } = useQuery({
    queryKey: ['ticket-parts', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_part_usage')
        .select(`
          *,
          part:parts(*),
          booked_by_profile:profiles!ticket_part_usage_booked_by_fkey(name),
          approved_by_profile:profiles!ticket_part_usage_approved_by_fkey(name)
        `)
        .eq('repair_ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Count pending approvals
  const pendingCount = partUsage?.filter(u => u.approval_status === 'PENDING').length || 0;
  const totalPartsPrice = partUsage?.reduce(
    (sum: number, p: any) => sum + (p.unit_sales_price || 0) * p.quantity,
    0
  ) || 0;

  // Remove part mutation
  const removePartMutation = useMutation({
    mutationFn: async (usageId: string) => {
      const usage = partUsage?.find((u: any) => u.id === usageId);
      if (!usage) throw new Error('Verwendung nicht gefunden');

      // Only allow removal of pending or rejected items, or if user is admin
      if (usage.approval_status === 'APPROVED' && !hasAnyRole(['ADMIN'])) {
        throw new Error('Freigegebene Teile können nur von Admins entfernt werden');
      }

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
      queryClient.invalidateQueries({ queryKey: ['ticket-parts', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['context-parts'] });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Freigegeben
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1" />
            Warte auf Freigabe
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <XCircle className="h-3 w-3 mr-1" />
            Abgelehnt
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Verwendete Teile
          </CardTitle>
          <CardDescription>
            {partUsage?.length || 0} Teile zugeordnet • {totalPartsPrice.toFixed(2)} € gesamt
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && canApprove && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-warning text-warning hover:bg-warning/10"
              onClick={() => setApprovalDialogOpen(true)}
            >
              <ShieldCheck className="h-4 w-4" />
              {pendingCount} Freigaben
            </Button>
          )}
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

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : partUsage?.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Noch keine Teile zugeordnet
            </p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => setPartDialogOpen(true)}
            >
              Erstes Teil hinzufügen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {partUsage?.map((usage: any) => (
              <div
                key={usage.id}
                className={`p-4 rounded-lg border transition-colors ${
                  usage.approval_status === 'PENDING' 
                    ? 'border-warning/30 bg-warning/5'
                    : usage.approval_status === 'REJECTED'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{usage.part?.name}</span>
                      {getStatusBadge(usage.approval_status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {usage.part?.sku && (
                        <span className="font-mono text-xs">{usage.part.sku}</span>
                      )}
                      <span>
                        {usage.part?.brand} {usage.part?.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Gebucht: {usage.booked_by_profile?.name || 'Unbekannt'}
                      </div>
                      <span>
                        {format(new Date(usage.created_at), 'dd.MM. HH:mm', { locale: de })}
                      </span>
                      {usage.approval_status === 'APPROVED' && usage.approved_by_profile && (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Freigabe: {usage.approved_by_profile.name}
                        </div>
                      )}
                    </div>
                    {usage.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        "{usage.notes}"
                      </p>
                    )}
                    {usage.approval_status === 'REJECTED' && usage.approval_note && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        <span className="text-destructive">{usage.approval_note}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{usage.quantity}x</p>
                      <p className="text-sm text-muted-foreground">
                        {((usage.unit_sales_price || 0) * usage.quantity).toFixed(2)} €
                      </p>
                    </div>
                    {(usage.approval_status !== 'APPROVED' || hasAnyRole(['ADMIN'])) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removePartMutation.mutate(usage.id)}
                        disabled={removePartMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Gesamt</p>
                {pendingCount > 0 && (
                  <p className="text-xs text-warning">
                    {pendingCount} Teil{pendingCount !== 1 ? 'e' : ''} warte{pendingCount === 1 ? 't' : 'n'} auf Freigabe
                  </p>
                )}
              </div>
              <p className="text-lg font-bold">{totalPartsPrice.toFixed(2)} €</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <TicketPartSelector
        ticketId={ticketId}
        deviceBrand={deviceBrand}
        deviceModel={deviceModel}
        deviceType={deviceType}
        open={partDialogOpen}
        onOpenChange={setPartDialogOpen}
        onCreateNewPart={() => setCreatePartDialogOpen(true)}
      />
      
      <CreatePartFromTicketDialog
        open={createPartDialogOpen}
        onOpenChange={setCreatePartDialogOpen}
        deviceBrand={deviceBrand}
        deviceModel={deviceModel}
        deviceType={deviceType}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['context-parts'] });
        }}
      />
      
      <PartUsageApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        ticketId={ticketId}
      />
    </Card>
  );
}
