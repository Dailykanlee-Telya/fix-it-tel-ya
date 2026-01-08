import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, Trash2, Euro, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { B2BPrice } from '@/types/b2b';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEVICE_TYPES = [
  { value: 'HANDY', label: 'Handy' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'KONSOLE', label: 'Konsole' },
  { value: 'SMARTWATCH', label: 'Smartwatch' },
];

const REPAIR_TYPES = [
  { value: 'DISPLAY', label: 'Display' },
  { value: 'AKKU', label: 'Akku' },
  { value: 'WASSERSCHADEN', label: 'Wasserschaden' },
  { value: 'LADEBUCHSE', label: 'Ladebuchse' },
  { value: 'KAMERA', label: 'Kamera' },
  { value: 'LAUTSPRECHER', label: 'Lautsprecher' },
  { value: 'MIKROFON', label: 'Mikrofon' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
];

interface PriceFormData {
  device_type: string;
  repair_type: string;
  brand: string;
  model: string;
  b2b_price: string;
  endcustomer_price: string;
  is_active: boolean;
}

const emptyForm: PriceFormData = {
  device_type: 'HANDY',
  repair_type: 'DISPLAY',
  brand: '',
  model: '',
  b2b_price: '',
  endcustomer_price: '',
  is_active: true,
};

export default function B2BPrices() {
  const { b2bPartnerId, canManagePrices, isB2BInhaber } = useB2BAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<B2BPrice | null>(null);
  const [formData, setFormData] = useState<PriceFormData>(emptyForm);
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterRepair, setFilterRepair] = useState<string>('all');

  const { data: prices, isLoading } = useQuery({
    queryKey: ['b2b-prices', b2bPartnerId],
    queryFn: async () => {
      if (!b2bPartnerId) return [];
      const { data, error } = await supabase
        .from('b2b_prices')
        .select('*')
        .eq('b2b_partner_id', b2bPartnerId)
        .order('device_type', { ascending: true })
        .order('repair_type', { ascending: true });
      if (error) throw error;
      return data as B2BPrice[];
    },
    enabled: !!b2bPartnerId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PriceFormData) => {
      const payload = {
        device_type: data.device_type,
        repair_type: data.repair_type,
        brand: data.brand || null,
        model: data.model || null,
        b2b_price: parseFloat(data.b2b_price) || 0,
        endcustomer_price: data.endcustomer_price ? parseFloat(data.endcustomer_price) : null,
        is_active: data.is_active,
      };

      if (editingPrice) {
        const { error } = await supabase
          .from('b2b_prices')
          .update(payload)
          .eq('id', editingPrice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('b2b_prices')
          .insert({ ...payload, b2b_partner_id: b2bPartnerId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-prices'] });
      toast.success(editingPrice ? 'Preis aktualisiert' : 'Preis angelegt');
      handleCloseDialog();
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('b2b_prices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-prices'] });
      toast.success('Preis gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  const handleOpenDialog = (price?: B2BPrice) => {
    if (price) {
      setEditingPrice(price);
      setFormData({
        device_type: price.device_type,
        repair_type: price.repair_type,
        brand: price.brand || '',
        model: price.model || '',
        b2b_price: price.b2b_price.toString(),
        endcustomer_price: price.endcustomer_price?.toString() || '',
        is_active: price.is_active,
      });
    } else {
      setEditingPrice(null);
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPrice(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.b2b_price) {
      toast.error('B2B-Preis ist erforderlich');
      return;
    }
    saveMutation.mutate(formData);
  };

  const filteredPrices = prices?.filter(p => {
    if (filterDevice !== 'all' && p.device_type !== filterDevice) return false;
    if (filterRepair !== 'all' && p.repair_type !== filterRepair) return false;
    return true;
  });

  if (!canManagePrices) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Preisliste</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sie haben keine Berechtigung, Preise zu verwalten.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meine Preisliste</h1>
          <p className="text-muted-foreground">
            Legen Sie Ihre eigenen Preise für Reparaturen fest
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Preis
        </Button>
      </div>

      <Alert>
        <Euro className="h-4 w-4" />
        <AlertDescription>
          <strong>B2B-Preis:</strong> Ihr Einkaufspreis bei Telya. <br />
          <strong>Endkundenpreis:</strong> Der Preis, den Ihr Kunde sieht (nach Freigabe).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Gerätetyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Gerätetypen</SelectItem>
                {DEVICE_TYPES.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRepair} onValueChange={setFilterRepair}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Reparaturtyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Reparaturen</SelectItem>
                {REPAIR_TYPES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredPrices?.length === 0 ? (
            <div className="text-center py-12">
              <Euro className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Noch keine Preise angelegt
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Ersten Preis anlegen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gerät</TableHead>
                  <TableHead>Reparatur</TableHead>
                  <TableHead>Marke/Modell</TableHead>
                  <TableHead className="text-right">B2B-Preis</TableHead>
                  <TableHead className="text-right">Endkundenpreis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrices?.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell>
                      {DEVICE_TYPES.find(d => d.value === price.device_type)?.label || price.device_type}
                    </TableCell>
                    <TableCell>
                      {REPAIR_TYPES.find(r => r.value === price.repair_type)?.label || price.repair_type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {price.brand || price.model ? `${price.brand || ''} ${price.model || ''}`.trim() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {price.b2b_price.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {price.endcustomer_price ? `${price.endcustomer_price.toFixed(2)} €` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        price.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {price.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(price)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isB2BInhaber && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Preis wirklich löschen?')) {
                                deleteMutation.mutate(price.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrice ? 'Preis bearbeiten' : 'Neuer Preis'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gerätetyp *</Label>
                <Select
                  value={formData.device_type}
                  onValueChange={(v) => setFormData(f => ({ ...f, device_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reparaturtyp *</Label>
                <Select
                  value={formData.repair_type}
                  onValueChange={(v) => setFormData(f => ({ ...f, repair_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPAIR_TYPES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marke (optional)</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData(f => ({ ...f, brand: e.target.value }))}
                  placeholder="z.B. Apple"
                />
              </div>
              <div className="space-y-2">
                <Label>Modell (optional)</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData(f => ({ ...f, model: e.target.value }))}
                  placeholder="z.B. iPhone 15"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>B2B-Preis (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.b2b_price}
                  onChange={(e) => setFormData(f => ({ ...f, b2b_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Endkundenpreis (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.endcustomer_price}
                  onChange={(e) => setFormData(f => ({ ...f, endcustomer_price: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, is_active: checked }))}
              />
              <Label htmlFor="is_active">Preis aktiv</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
