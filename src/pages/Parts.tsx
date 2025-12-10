import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Edit,
  Loader2,
} from 'lucide-react';

export default function Parts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    sku: '',
    purchase_price: '',
    sales_price: '',
    stock_quantity: '',
    min_stock_quantity: '5',
  });

  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const partData = {
        name: formData.name,
        brand: formData.brand || null,
        model: formData.model || null,
        sku: formData.sku || null,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        sales_price: parseFloat(formData.sales_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock_quantity: parseInt(formData.min_stock_quantity) || 5,
      };

      if (editingPart) {
        const { error } = await supabase
          .from('parts')
          .update(partData)
          .eq('id', editingPart.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('parts')
          .insert(partData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: editingPart ? 'Teil aktualisiert' : 'Teil erstellt',
        description: 'Das Ersatzteil wurde erfolgreich gespeichert.',
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

  const resetForm = () => {
    setEditingPart(null);
    setFormData({
      name: '',
      brand: '',
      model: '',
      sku: '',
      purchase_price: '',
      sales_price: '',
      stock_quantity: '',
      min_stock_quantity: '5',
    });
  };

  const handleEdit = (part: any) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      brand: part.brand || '',
      model: part.model || '',
      sku: part.sku || '',
      purchase_price: part.purchase_price?.toString() || '',
      sales_price: part.sales_price?.toString() || '',
      stock_quantity: part.stock_quantity?.toString() || '',
      min_stock_quantity: part.min_stock_quantity?.toString() || '5',
    });
    setDialogOpen(true);
  };

  const filteredParts = parts?.filter((part: any) =>
    part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = parts?.filter((p: any) => p.stock_quantity <= p.min_stock_quantity).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ersatzteile</h1>
          <p className="text-muted-foreground">
            {parts?.length || 0} Teile im Lager
            {lowStockCount > 0 && (
              <span className="text-warning ml-2">• {lowStockCount} mit niedrigem Bestand</span>
            )}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Neues Teil
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingPart ? 'Teil bearbeiten' : 'Neues Ersatzteil'}</DialogTitle>
              <DialogDescription>
                Geben Sie die Details des Ersatzteils ein.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. iPhone 14 Pro Display"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marke</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="z.B. Apple"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modell</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="z.B. iPhone 14 Pro"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Artikelnummer (SKU)</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Einkaufspreis (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verkaufspreis (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.sales_price}
                    onChange={(e) => setFormData({ ...formData, sales_price: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bestand</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mindestbestand</Label>
                  <Input
                    type="number"
                    value={formData.min_stock_quantity}
                    onChange={(e) => setFormData({ ...formData, min_stock_quantity: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !formData.name}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Suchen (Name, Marke, Modell, SKU)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Parts Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead>Marke/Modell</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">EK</TableHead>
                  <TableHead className="text-right">VK</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                  <TableHead className="text-right">Bestand</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
                {filteredParts?.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Keine Ersatzteile gefunden
                    </TableCell>
                  </TableRow>
                )}
                {filteredParts?.map((part: any) => {
                  const margin = part.sales_price - part.purchase_price;
                  const marginPercent = part.purchase_price > 0 
                    ? ((margin / part.purchase_price) * 100).toFixed(0) 
                    : 0;
                  const isLowStock = part.stock_quantity <= part.min_stock_quantity;

                  return (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{part.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {part.brand} {part.model}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-muted-foreground">
                          {part.sku || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {part.purchase_price?.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right">
                        {part.sales_price?.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={margin > 0 ? 'text-success' : 'text-destructive'}>
                          {margin.toFixed(2)} € ({marginPercent}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLowStock && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                            {part.stock_quantity}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(part)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
