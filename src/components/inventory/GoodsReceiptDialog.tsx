import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Plus, Trash2, Package, ArrowDownRight } from 'lucide-react';

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockLocations: any[];
}

interface ReceiptItem {
  partId: string;
  quantity: number;
  unitPrice: number;
}

export default function GoodsReceiptDialog({
  open,
  onOpenChange,
  stockLocations,
}: GoodsReceiptDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [stockLocationId, setStockLocationId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([{ partId: '', quantity: 1, unitPrice: 0 }]);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch parts
  const { data: parts = [] } = useQuery({
    queryKey: ['parts-for-receipt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parts')
        .select('id, name, sku, purchase_price')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const resetForm = () => {
    setStockLocationId('');
    setSupplierId('');
    setInvoiceNumber('');
    setNotes('');
    setItems([{ partId: '', quantity: 1, unitPrice: 0 }]);
  };

  const receiptMutation = useMutation({
    mutationFn: async () => {
      if (!stockLocationId) throw new Error('Bitte Lagerort auswählen');
      if (!supplierId) throw new Error('Bitte Lieferant auswählen');
      if (items.some(i => !i.partId || i.quantity <= 0)) {
        throw new Error('Bitte alle Positionen vollständig ausfüllen');
      }

      // Create stock movements for each item using the database function
      for (const item of items) {
        const { error } = await supabase.rpc('create_stock_movement', {
          _movement_type: 'PURCHASE',
          _part_id: item.partId,
          _stock_location_id: stockLocationId,
          _quantity: item.quantity,
          _unit_price: item.unitPrice,
          _supplier_id: supplierId,
          _notes: invoiceNumber ? `Rechnung: ${invoiceNumber}` : null,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      onOpenChange(false);
      resetForm();
      toast({
        title: 'Wareneingang gebucht',
        description: `${items.length} Position(en) wurden erfolgreich eingebucht.`,
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

  const addItem = () => {
    setItems([...items, { partId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-fill price from part's purchase_price
    if (field === 'partId') {
      const part = parts.find((p: any) => p.id === value);
      if (part) {
        newItems[index].unitPrice = part.purchase_price || 0;
      }
    }

    setItems(newItems);
  };

  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5 text-success" />
            Wareneingang buchen
          </DialogTitle>
          <DialogDescription>
            Erfassen Sie einen Wareneingang mit Lieferant und Rechnungsinformationen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location & Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-location">Lagerort *</Label>
              <Select value={stockLocationId} onValueChange={setStockLocationId}>
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

            <div className="space-y-2">
              <Label htmlFor="supplier">Lieferant *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Lieferant wählen" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Number */}
          <div className="space-y-2">
            <Label htmlFor="invoice">Rechnungs-/Lieferscheinnummer</Label>
            <Input
              id="invoice"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="z.B. RE-2026-001234"
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Positionen</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Position
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-end p-3 bg-muted/30 rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Artikel *</Label>
                  <Select
                    value={item.partId}
                    onValueChange={(v) => updateItem(index, 'partId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Artikel wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24 space-y-1">
                  <Label className="text-xs">Menge *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="w-28 space-y-1">
                  <Label className="text-xs">EK-Preis (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="text-right text-sm">
              <span className="text-muted-foreground">Gesamtwert: </span>
              <span className="font-semibold">{totalValue.toFixed(2)} €</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Bemerkungen</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionale Bemerkungen..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => receiptMutation.mutate()}
            disabled={receiptMutation.isPending}
            className="gap-2"
          >
            {receiptMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <ArrowDownRight className="h-4 w-4" />
            Wareneingang buchen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
