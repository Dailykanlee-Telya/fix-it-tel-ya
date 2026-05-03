import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, Search, Euro } from 'lucide-react';

const DEVICE_TYPES = [
  { value: 'HANDY', label: 'Handy' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'SMARTWATCH', label: 'Smartwatch' },
  { value: 'OTHER', label: 'Sonstiges' },
];

const REPAIR_TYPES = [
  { value: 'DISPLAYBRUCH', label: 'Displaybruch' },
  { value: 'WASSERSCHADEN', label: 'Wasserschaden' },
  { value: 'AKKU_SCHWACH', label: 'Akku schwach' },
  { value: 'LADEBUCHSE', label: 'Ladebuchse' },
  { value: 'KAMERA', label: 'Kamera' },
  { value: 'MIKROFON', label: 'Mikrofon' },
  { value: 'LAUTSPRECHER', label: 'Lautsprecher' },
  { value: 'TASTATUR', label: 'Tastatur' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
];

interface PriceEntry {
  id: string;
  device_type: string;
  brand: string;
  model: string | null;
  repair_type: string;
  price: number;
  net_price: number | null;
  tax_rate: number;
  title: string | null;
  description: string | null;
  estimated_duration_minutes: number | null;
  active: boolean;
}

const emptyForm = {
  device_type: 'HANDY',
  brand: '',
  model: '',
  repair_type: 'DISPLAYBRUCH',
  price: '',
  tax_rate: '19',
  title: '',
  description: '',
  estimated_duration_minutes: '',
};

export default function PriceList() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDeviceType, setFilterDeviceType] = useState<string>('ALL');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterActive, setFilterActive] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: prices, isLoading } = useQuery({
    queryKey: ['price-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_list')
        .select('*')
        .order('brand')
        .order('model')
        .order('repair_type');
      if (error) throw error;
      return data as PriceEntry[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const grossPrice = parseFloat(form.price);
      if (isNaN(grossPrice) || grossPrice <= 0) throw new Error('Ungültiger Preis');
      if (!form.brand.trim()) throw new Error('Marke ist Pflichtfeld');

      const taxRate = parseFloat(form.tax_rate) || 19;
      const netPrice = Math.round((grossPrice / (1 + taxRate / 100)) * 100) / 100;

      const payload = {
        device_type: form.device_type as any,
        brand: form.brand.trim(),
        model: form.model.trim() || null,
        repair_type: form.repair_type as any,
        price: grossPrice,
        net_price: netPrice,
        tax_rate: taxRate,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        estimated_duration_minutes: form.estimated_duration_minutes ? parseInt(form.estimated_duration_minutes) : null,
      };

      if (editId) {
        const { error } = await supabase.from('price_list').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('price_list').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] });
      setDialogOpen(false);
      resetForm();
      toast.success(editId ? 'Preis aktualisiert' : 'Preis angelegt');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('price_list').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-list'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('price_list').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-list'] });
      toast.success('Preis gelöscht');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  const openEdit = (p: PriceEntry) => {
    setEditId(p.id);
    setForm({
      device_type: p.device_type,
      brand: p.brand,
      model: p.model || '',
      repair_type: p.repair_type,
      price: String(p.price),
      tax_rate: String(p.tax_rate),
      title: p.title || '',
      description: p.description || '',
      estimated_duration_minutes: p.estimated_duration_minutes ? String(p.estimated_duration_minutes) : '',
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Computed net price for form
  const formGross = parseFloat(form.price) || 0;
  const formTax = parseFloat(form.tax_rate) || 19;
  const formNet = formGross > 0 ? Math.round((formGross / (1 + formTax / 100)) * 100) / 100 : 0;

  // Filter
  const filtered = prices?.filter((p) => {
    if (filterDeviceType !== 'ALL' && p.device_type !== filterDeviceType) return false;
    if (filterActive === 'ACTIVE' && !p.active) return false;
    if (filterActive === 'INACTIVE' && p.active) return false;
    if (filterBrand && !p.brand.toLowerCase().includes(filterBrand.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = [p.brand, p.model, p.title, REPAIR_TYPES.find(r => r.value === p.repair_type)?.label]
        .filter(Boolean)
        .some(v => v!.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Preisliste</h1>
          <p className="text-muted-foreground">Standardpreise für Reparaturen verwalten</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Preis anlegen
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterDeviceType} onValueChange={setFilterDeviceType}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle Geräte</SelectItem>
                {DEVICE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle</SelectItem>
                <SelectItem value="ACTIVE">Aktiv</SelectItem>
                <SelectItem value="INACTIVE">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !filtered?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Euro className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Keine Preise gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gerätetyp</TableHead>
                  <TableHead>Marke / Modell</TableHead>
                  <TableHead>Reparatur</TableHead>
                  <TableHead className="text-right">Brutto</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead className="text-right">MwSt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className={!p.active ? 'opacity-50' : ''}>
                    <TableCell>{DEVICE_TYPES.find(d => d.value === p.device_type)?.label}</TableCell>
                    <TableCell>
                      <span className="font-medium">{p.brand}</span>
                      {p.model && <span className="text-muted-foreground ml-1">{p.model}</span>}
                      {p.title && <p className="text-xs text-muted-foreground">{p.title}</p>}
                    </TableCell>
                    <TableCell>{REPAIR_TYPES.find(r => r.value === p.repair_type)?.label}</TableCell>
                    <TableCell className="text-right font-medium">{Number(p.price).toFixed(2)} €</TableCell>
                    <TableCell className="text-right">{p.net_price ? Number(p.net_price).toFixed(2) : '–'} €</TableCell>
                    <TableCell className="text-right">{p.tax_rate}%</TableCell>
                    <TableCell>
                      <Switch
                        checked={p.active}
                        onCheckedChange={(v) => toggleActiveMutation.mutate({ id: p.id, active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Preis bearbeiten' : 'Neuen Preis anlegen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gerätetyp</Label>
                <Select value={form.device_type} onValueChange={v => setForm(f => ({ ...f, device_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reparaturart</Label>
                <Select value={form.repair_type} onValueChange={v => setForm(f => ({ ...f, repair_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPAIR_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marke *</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="z.B. Apple" />
              </div>
              <div className="space-y-2">
                <Label>Modell</Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="z.B. iPhone 15 Pro" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bezeichnung</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Display OLED Original" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Brutto-Preis (€) *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>MwSt (%)</Label>
                <Input type="number" step="0.01" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} placeholder="19" />
              </div>
              <div className="space-y-2">
                <Label>Netto (berechnet)</Label>
                <Input value={formNet > 0 ? `${formNet.toFixed(2)} €` : '–'} disabled className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dauer (Min.)</Label>
                <Input type="number" value={form.estimated_duration_minutes} onChange={e => setForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))} placeholder="z.B. 60" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? 'Speichern' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
