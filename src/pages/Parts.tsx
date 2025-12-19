import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Filter,
  X,
} from 'lucide-react';

// Part categories for smartphones/tablets
const PART_CATEGORIES = [
  { value: 'DISPLAY', label: 'Display' },
  { value: 'AKKU', label: 'Akku' },
  { value: 'LADEBUCHSE', label: 'Ladebuchse' },
  { value: 'KAMERA', label: 'Kamera' },
  { value: 'BACKCOVER', label: 'Backcover' },
  { value: 'RAHMEN', label: 'Rahmen' },
  { value: 'LAUTSPRECHER', label: 'Lautsprecher' },
  { value: 'MIKROFON', label: 'Mikrofon' },
  { value: 'BUTTON', label: 'Button/Tasten' },
  { value: 'FLEXKABEL', label: 'Flexkabel' },
  { value: 'SONSTIGES', label: 'Sonstiges' },
];

const DEVICE_TYPES = [
  { value: 'HANDY', label: 'Smartphone' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'SMARTWATCH', label: 'Smartwatch' },
  { value: 'OTHER', label: 'Sonstiges' },
];

export default function Parts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  
  // Filter states
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterDeviceType, setFilterDeviceType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    device_type: 'HANDY',
    part_category: 'SONSTIGES',
    sku: '',
    supplier_sku: '',
    storage_location: '',
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
        .order('brand', { ascending: true })
        .order('model', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Get unique brands from parts
  const uniqueBrands = useMemo(() => {
    if (!parts) return [];
    const brands = [...new Set(parts.map((p: any) => p.brand).filter(Boolean))];
    return brands.sort();
  }, [parts]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const partData = {
        name: formData.name,
        brand: formData.brand || null,
        model: formData.model || null,
        device_type: formData.device_type,
        part_category: formData.part_category,
        sku: formData.sku || null,
        supplier_sku: formData.supplier_sku || null,
        storage_location: formData.storage_location || null,
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
      device_type: 'HANDY',
      part_category: 'SONSTIGES',
      sku: '',
      supplier_sku: '',
      storage_location: '',
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
      device_type: part.device_type || 'HANDY',
      part_category: part.part_category || 'SONSTIGES',
      sku: part.sku || '',
      supplier_sku: part.supplier_sku || '',
      storage_location: part.storage_location || '',
      purchase_price: part.purchase_price?.toString() || '',
      sales_price: part.sales_price?.toString() || '',
      stock_quantity: part.stock_quantity?.toString() || '',
      min_stock_quantity: part.min_stock_quantity?.toString() || '5',
    });
    setDialogOpen(true);
  };

  // Apply all filters
  const filteredParts = useMemo(() => {
    if (!parts) return [];
    
    return parts.filter((part: any) => {
      // Search filter
      const matchesSearch = !searchQuery || 
        part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Brand filter
      const matchesBrand = filterBrand === 'all' || part.brand === filterBrand;
      
      // Device type filter
      const matchesDeviceType = filterDeviceType === 'all' || part.device_type === filterDeviceType;
      
      // Category filter
      const matchesCategory = filterCategory === 'all' || part.part_category === filterCategory;
      
      // Low stock filter
      const matchesLowStock = !filterLowStock || part.stock_quantity <= part.min_stock_quantity;
      
      return matchesSearch && matchesBrand && matchesDeviceType && matchesCategory && matchesLowStock;
    });
  }, [parts, searchQuery, filterBrand, filterDeviceType, filterCategory, filterLowStock]);

  const lowStockCount = parts?.filter((p: any) => p.stock_quantity <= p.min_stock_quantity).length || 0;
  const hasActiveFilters = filterBrand !== 'all' || filterDeviceType !== 'all' || filterCategory !== 'all' || filterLowStock;

  const clearFilters = () => {
    setFilterBrand('all');
    setFilterDeviceType('all');
    setFilterCategory('all');
    setFilterLowStock(false);
    setSearchQuery('');
  };

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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPart ? 'Teil bearbeiten' : 'Neues Ersatzteil'}</DialogTitle>
              <DialogDescription>
                Geben Sie die Details des Ersatzteils ein.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Bezeichnung *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Display OLED Original"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gerätetyp</Label>
                  <Select
                    value={formData.device_type}
                    onValueChange={(v) => setFormData({ ...formData, device_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map((dt) => (
                        <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teilkategorie</Label>
                  <Select
                    value={formData.part_category}
                    onValueChange={(v) => setFormData({ ...formData, part_category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PART_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hersteller</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="z.B. Apple, Samsung"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interne Art.-Nr. (SKU)</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lieferanten Art.-Nr.</Label>
                  <Input
                    value={formData.supplier_sku}
                    onChange={(e) => setFormData({ ...formData, supplier_sku: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lagerort (Regal/Fach)</Label>
                <Input
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  placeholder="z.B. Regal A3, Fach 5"
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
                  <Label>Aktueller Bestand</Label>
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

      {/* Search & Filters */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen (Name, Marke, Modell, SKU)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Filter Row */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Hersteller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Hersteller</SelectItem>
                  {uniqueBrands.map((brand: string) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDeviceType} onValueChange={setFilterDeviceType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Gerätetyp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  {DEVICE_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {PART_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={filterLowStock ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLowStock(!filterLowStock)}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Niedriger Bestand
                {filterLowStock && <span>({lowStockCount})</span>}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          {filteredParts.length} von {parts?.length || 0} Teilen angezeigt
        </p>
      )}

      {/* Parts Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead>Hersteller / Modell</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Lagerort</TableHead>
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
                    <TableCell colSpan={9} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
                {filteredParts?.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      {hasActiveFilters ? 'Keine Ersatzteile entsprechen den Filterkriterien' : 'Keine Ersatzteile gefunden'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredParts?.map((part: any) => {
                  const margin = part.sales_price - part.purchase_price;
                  const marginPercent = part.purchase_price > 0 
                    ? ((margin / part.purchase_price) * 100).toFixed(0) 
                    : 0;
                  const isLowStock = part.stock_quantity <= part.min_stock_quantity;
                  const categoryLabel = PART_CATEGORIES.find(c => c.value === part.part_category)?.label || part.part_category;

                  return (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{part.name}</span>
                            {part.sku && (
                              <p className="text-xs font-mono text-muted-foreground">{part.sku}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{part.brand || '-'}</span>
                          {part.model && <span className="text-muted-foreground"> / {part.model}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {part.storage_location || '-'}
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
