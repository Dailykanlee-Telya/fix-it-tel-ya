import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useInventoryPermissions } from '@/hooks/useInventoryPermissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowUpRight, AlertTriangle } from 'lucide-react';

interface ManualOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockLocations: any[];
}

const MANUAL_OUT_REASONS = [
  { value: 'TEST', label: 'Test / Prüfung' },
  { value: 'SALE', label: 'Einzelverkauf' },
  { value: 'DEFECT', label: 'Defekt (Eigenverschulden)' },
  { value: 'SAMPLE', label: 'Muster / Probe' },
  { value: 'OTHER', label: 'Sonstiges' },
];

export default function ManualOutDialog({
  open,
  onOpenChange,
  stockLocations,
}: ManualOutDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canApproveWriteOff } = useInventoryPermissions();

  const [stockLocationId, setStockLocationId] = useState('');
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reasonType, setReasonType] = useState('');
  const [reason, setReason] = useState('');

  // Fetch parts with stock
  const { data: parts = [] } = useQuery({
    queryKey: ['parts-with-stock', stockLocationId],
    queryFn: async () => {
      let query = supabase
        .from('parts')
        .select('id, name, sku, stock_quantity, stock_location_id')
        .eq('is_active', true)
        .gt('stock_quantity', 0)
        .order('name');

      if (stockLocationId) {
        query = query.eq('stock_location_id', stockLocationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const selectedPart = parts.find((p: any) => p.id === partId);
  const isWriteOff = reasonType === 'DEFECT';
  const requiresApproval = isWriteOff && !canApproveWriteOff;

  const resetForm = () => {
    setStockLocationId('');
    setPartId('');
    setQuantity(1);
    setReasonType('');
    setReason('');
  };

  const outMutation = useMutation({
    mutationFn: async () => {
      if (!stockLocationId) throw new Error('Bitte Lagerort auswählen');
      if (!partId) throw new Error('Bitte Artikel auswählen');
      if (!reasonType) throw new Error('Bitte Grund auswählen');
      if (quantity <= 0) throw new Error('Ungültige Menge');

      const selectedPart = parts.find((p: any) => p.id === partId);
      if (selectedPart && quantity > selectedPart.stock_quantity) {
        throw new Error(`Nur ${selectedPart.stock_quantity} Stück verfügbar`);
      }

      const fullReason = `${MANUAL_OUT_REASONS.find(r => r.value === reasonType)?.label}: ${reason}`.trim();

      const movementType = isWriteOff ? 'WRITE_OFF' : 'MANUAL_OUT';

      const { error } = await supabase.rpc('create_stock_movement', {
        _movement_type: movementType,
        _part_id: partId,
        _stock_location_id: stockLocationId,
        _quantity: -quantity, // Negative for outgoing
        _reason: fullReason,
        _requires_approval: requiresApproval,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      onOpenChange(false);
      resetForm();
      toast({
        title: requiresApproval ? 'Entnahme zur Freigabe eingereicht' : 'Entnahme gebucht',
        description: requiresApproval 
          ? 'Die Abschreibung muss noch von einem Vorgesetzten freigegeben werden.'
          : `${quantity} Stück wurden entnommen.`,
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-warning" />
            Manuelle Entnahme
          </DialogTitle>
          <DialogDescription>
            Erfassen Sie eine manuelle Entnahme mit Begründung.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location */}
          <div className="space-y-2">
            <Label>Lagerort *</Label>
            <Select value={stockLocationId} onValueChange={(v) => { setStockLocationId(v); setPartId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Lagerort wählen" />
              </SelectTrigger>
              <SelectContent>
                {stockLocations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.location?.name} - {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Part */}
          <div className="space-y-2">
            <Label>Artikel *</Label>
            <Select value={partId} onValueChange={setPartId} disabled={!stockLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Artikel wählen" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.stock_quantity} verfügbar)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Menge *</Label>
            <Input
              type="number"
              min={1}
              max={selectedPart?.stock_quantity || 999}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
            {selectedPart && (
              <p className="text-xs text-muted-foreground">
                Verfügbar: {selectedPart.stock_quantity} Stück
              </p>
            )}
          </div>

          {/* Reason Type */}
          <div className="space-y-2">
            <Label>Grund *</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger>
                <SelectValue placeholder="Grund wählen" />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_OUT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Details */}
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Weitere Details..."
              rows={2}
            />
          </div>

          {/* Write-off warning */}
          {isWriteOff && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {canApproveWriteOff 
                  ? 'Abschreibungen werden endgültig gebucht und können nicht rückgängig gemacht werden.'
                  : 'Abschreibungen müssen von einem Vorgesetzten freigegeben werden.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => outMutation.mutate()}
            disabled={outMutation.isPending}
            variant={isWriteOff ? 'destructive' : 'default'}
            className="gap-2"
          >
            {outMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {requiresApproval ? 'Zur Freigabe einreichen' : 'Entnahme buchen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
