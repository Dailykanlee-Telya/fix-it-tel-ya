import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package } from 'lucide-react';

const PART_CATEGORIES = [
  { value: 'DISPLAY', label: 'Display' },
  { value: 'AKKU', label: 'Akku' },
  { value: 'LADEBUCHSE', label: 'Ladebuchse' },
  { value: 'KAMERA_VORNE', label: 'Kamera vorne' },
  { value: 'KAMERA_HINTEN', label: 'Kamera hinten' },
  { value: 'LAUTSPRECHER', label: 'Lautsprecher' },
  { value: 'MIKROFON', label: 'Mikrofon' },
  { value: 'BACKCOVER', label: 'Backcover' },
  { value: 'RAHMEN', label: 'Rahmen' },
  { value: 'FLEXKABEL', label: 'Flexkabel' },
  { value: 'BUTTONS', label: 'Buttons' },
  { value: 'VIBRATIONSMOTOR', label: 'Vibrationsmotor' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
] as const;

interface CreatePartFromTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceBrand: string | null | undefined;
  deviceModel: string | null | undefined;
  deviceType: string | null | undefined;
  onSuccess?: () => void;
}

export default function CreatePartFromTicketDialog({
  open,
  onOpenChange,
  deviceBrand,
  deviceModel,
  deviceType,
  onSuccess,
}: CreatePartFromTicketDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [partName, setPartName] = useState('');
  const [partCategory, setPartCategory] = useState<string>('SONSTIGES');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salesPrice, setSalesPrice] = useState('');
  const [sku, setSku] = useState('');

  // Get manufacturer_id from brand name
  const { data: manufacturer } = useQuery({
    queryKey: ['manufacturer-by-name', deviceBrand],
    queryFn: async () => {
      if (!deviceBrand) return null;
      const { data, error } = await supabase
        .from('manufacturers')
        .select('id, name')
        .ilike('name', deviceBrand)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!deviceBrand,
  });

  // Get model_id from device_catalog
  const { data: catalogModel } = useQuery({
    queryKey: ['catalog-model', deviceBrand, deviceModel],
    queryFn: async () => {
      if (!deviceBrand || !deviceModel) return null;
      const { data, error } = await supabase
        .from('device_catalog')
        .select('id, brand, model')
        .ilike('brand', deviceBrand)
        .ilike('model', deviceModel)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!deviceBrand && !!deviceModel,
  });

  // Pre-fill part name based on device
  useEffect(() => {
    if (open && deviceBrand && deviceModel) {
      setPartName(`${deviceBrand} ${deviceModel} `);
    }
  }, [open, deviceBrand, deviceModel]);

  const createPartMutation = useMutation({
    mutationFn: async () => {
      if (!partName.trim()) throw new Error('Teilename erforderlich');
      if (!manufacturer?.id) throw new Error('Hersteller nicht gefunden');

      const { data, error } = await supabase
        .from('parts')
        .insert({
          name: partName.trim(),
          brand: deviceBrand,
          model: deviceModel,
          device_type: deviceType || 'HANDY',
          part_category: partCategory,
          manufacturer_id: manufacturer.id,
          model_id: catalogModel?.id || null,
          purchase_price: parseFloat(purchasePrice) || 0,
          sales_price: parseFloat(salesPrice) || 0,
          sku: sku.trim() || null,
          stock_quantity: 0,
          min_stock_quantity: 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['context-parts'] });
      toast({
        title: 'Teil erstellt',
        description: `${data.name} wurde angelegt und kann jetzt verwendet werden.`,
      });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setPartName('');
    setPartCategory('SONSTIGES');
    setPurchasePrice('');
    setSalesPrice('');
    setSku('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Neues Ersatzteil anlegen
          </DialogTitle>
          <DialogDescription>
            Teil für {deviceBrand} {deviceModel} erstellen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pre-filled info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hersteller:</span>
              <span className="font-medium">{deviceBrand || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modell:</span>
              <span className="font-medium">{deviceModel || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gerätetyp:</span>
              <span className="font-medium">{deviceType || '-'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partName">Teilename *</Label>
            <Input
              id="partName"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="z.B. Display Original"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partCategory">Kategorie</Label>
            <Select value={partCategory} onValueChange={setPartCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PART_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Einkaufspreis (€)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesPrice">Verkaufspreis (€)</Label>
              <Input
                id="salesPrice"
                type="number"
                step="0.01"
                min="0"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">Artikelnummer (optional)</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU oder Bestellnummer"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => createPartMutation.mutate()}
            disabled={!partName.trim() || !manufacturer?.id || createPartMutation.isPending}
          >
            {createPartMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Teil erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
