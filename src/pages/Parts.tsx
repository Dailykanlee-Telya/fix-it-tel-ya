import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
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

// Fixed part categories - no free text allowed
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

const DEVICE_TYPES = [
  { value: 'HANDY', label: 'Smartphone' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'SMARTWATCH', label: 'Smartwatch' },
  { value: 'OTHER', label: 'Sonstiges' },
] as const;

interface Manufacturer {
  id: string;
  name: string;
}

interface DeviceModel {
  id: string;
  brand: string;
  model: string;
  device_type: string;
}

interface Part {
  id: string;
  name: string;
  device_type: string;
  part_category: string;
  manufacturer_id: string | null;
  model_id: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  supplier_sku: string | null;
  storage_location: string | null;
  purchase_price: number;
  sales_price: number;
  stock_quantity: number;
  min_stock_quantity: number;
  is_active: boolean;
}

export default function Parts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  
  // Filter states - cascading order
  const [filterDeviceType, setFilterDeviceType] = useState<string>('all');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    device_type: 'HANDY',
    manufacturer_id: '',
    model_id: '',
    part_category: '',
    sku: '',
    supplier_sku: '',
    storage_location: '',
    purchase_price: '',
    sales_price: '',
    stock_quantity: '',
    min_stock_quantity: '5',
  });

  // Fetch manufacturers
  const { data: manufacturers = [] } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manufacturers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Manufacturer[];
    },
  });

  // Fetch device catalog for models
  const { data: deviceCatalog = [] } = useQuery({
    queryKey: ['device-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_catalog')
        .select('*')
        .order('brand')
        .order('model');
      if (error) throw error;
      return data as DeviceModel[];
    },
  });

  // Fetch parts with manufacturer and model info
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parts')
        .select(`
          *,
          manufacturers:manufacturer_id(id, name),
          device_catalog:model_id(id, brand, model, device_type)
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Models filtered by selected manufacturer in form
  const formModels = useMemo(() => {
    if (!formData.manufacturer_id) return [];
    const manufacturer = manufacturers.find(m => m.id === formData.manufacturer_id);
    if (!manufacturer) return [];
    
    return deviceCatalog.filter(dc => 
      dc.brand.toLowerCase() === manufacturer.name.toLowerCase() &&
      (formData.device_type === 'all' || dc.device_type === formData.device_type)
    );
  }, [deviceCatalog, manufacturers, formData.manufacturer_id, formData.device_type]);

  // Models for filter dropdown - based on selected manufacturer filter
  const filterModels = useMemo(() => {
    if (filterManufacturer === 'all') return [];
    const manufacturer = manufacturers.find(m => m.id === filterManufacturer);
    if (!manufacturer) return [];
    
    return deviceCatalog.filter(dc => 
      dc.brand.toLowerCase() === manufacturer.name.toLowerCase() &&
      (filterDeviceType === 'all' || dc.device_type === filterDeviceType)
    );
  }, [deviceCatalog, manufacturers, filterManufacturer, filterDeviceType]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!formData.name.trim()) throw new Error('Bezeichnung ist erforderlich');
      if (!formData.manufacturer_id) throw new Error('Hersteller ist erforderlich');
      if (!formData.part_category) throw new Error('Kategorie ist erforderlich');
      if (!formData.device_type) throw new Error('Gerätetyp ist erforderlich');

      // Get manufacturer name for legacy brand field
      const manufacturer = manufacturers.find(m => m.id === formData.manufacturer_id);
      const model = deviceCatalog.find(m => m.id === formData.model_id);

      const partData = {
        name: formData.name.trim(),
        device_type: formData.device_type,
        manufacturer_id: formData.manufacturer_id,
        model_id: formData.model_id || null,
        part_category: formData.part_category,
        // Keep legacy fields for backward compatibility
        brand: manufacturer?.name || null,
        model: model?.model || null,
        sku: formData.sku.trim() || null,
        supplier_sku: formData.supplier_sku.trim() || null,
        storage_location: formData.storage_location.trim() || null,
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
    onError: (error: Error) => {
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
      device_type: 'HANDY',
      manufacturer_id: '',
      model_id: '',
      part_category: '',
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
      name: part.name || '',
      device_type: part.device_type || 'HANDY',
      manufacturer_id: part.manufacturer_id || '',
      model_id: part.model_id || '',
      part_category: part.part_category || '',
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

  // Apply cascading filters
  const filteredParts = useMemo(() => {
    if (!parts) return [];
    
    return parts.filter((part: any) => {
      // Search filter
      const matchesSearch = !searchQuery || 
        part.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.storage_location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Device type filter
      const matchesDeviceType = filterDeviceType === 'all' || part.device_type === filterDeviceType;
      
      // Manufacturer filter
      const matchesManufacturer = filterManufacturer === 'all' || part.manufacturer_id === filterManufacturer;
      
      // Model filter
      const matchesModel = filterModel === 'all' || part.model_id === filterModel;
      
      // Category filter
      const matchesCategory = filterCategory === 'all' || part.part_category === filterCategory;
      
      // Low stock filter
      const matchesLowStock = !filterLowStock || part.stock_quantity <= part.min_stock_quantity;
      
      return matchesSearch && matchesDeviceType && matchesManufacturer && matchesModel && matchesCategory && matchesLowStock;
    });
  }, [parts, searchQuery, filterDeviceType, filterManufacturer, filterModel, filterCategory, filterLowStock]);

  const lowStockCount = parts?.filter((p: any) => p.stock_quantity <= p.min_stock_quantity).length || 0;
  const hasActiveFilters = filterDeviceType !== 'all' || filterManufacturer !== 'all' || filterModel !== 'all' || filterCategory !== 'all' || filterLowStock;

  const clearFilters = () => {
    setFilterDeviceType('all');
    setFilterManufacturer('all');
    setFilterModel('all');
    setFilterCategory('all');
    setFilterLowStock(false);
    setSearchQuery('');
  };

  // Reset model filter when manufacturer changes
  const handleManufacturerFilterChange = (value: string) => {
    setFilterManufacturer(value);
    setFilterModel('all');
  };

  // Reset model in form when manufacturer changes
  const handleFormManufacturerChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      manufacturer_id: value,
      model_id: '', // Reset model when manufacturer changes
    }));
  };

  const getCategoryLabel = (value: string) => {
    return PART_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getDeviceTypeLabel = (value: string) => {
    return DEVICE_TYPES.find(d => d.value === value)?.label || value;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ersatzteilverwaltung</h1>
          <p className="text-muted-foreground">
            {parts?.length || 0} Teile im Lager
            {lowStockCount > 0 && (
              <span className="text-destructive ml-2">• {lowStockCount} mit niedrigem Bestand</span>
            )}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neues Teil anlegen
        </Button>
      </div>

      {/* Search & Cascading Filters */}
      <Card className="card-elevated">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen (Name, Hersteller, Modell, SKU, Lagerort)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Cascading Filter Row */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              
              {/* 1. Device Type */}
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

              {/* 2. Manufacturer */}
              <Select value={filterManufacturer} onValueChange={handleManufacturerFilterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Hersteller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Hersteller</SelectItem>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 3. Model - only show if manufacturer is selected */}
              {filterManufacturer !== 'all' && filterModels.length > 0 && (
                <Select value={filterModel} onValueChange={setFilterModel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Modell" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Modelle</SelectItem>
                    {filterModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* 4. Category */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {PART_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Low Stock Toggle */}
              <Button
                variant={filterLowStock ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLowStock(!filterLowStock)}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Niedriger Bestand
                {lowStockCount > 0 && <Badge variant="secondary" className="ml-1">{lowStockCount}</Badge>}
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

      {/* Parts Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Gerätetyp</TableHead>
                <TableHead>Hersteller / Modell</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Lagerort</TableHead>
                <TableHead className="text-right">EK</TableHead>
                <TableHead className="text-right">VK</TableHead>
                <TableHead className="text-center">Bestand</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Keine Ersatzteile gefunden</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters}>
                        Filter zurücksetzen
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredParts.map((part: any) => {
                  const isLowStock = part.stock_quantity <= part.min_stock_quantity;
                  const manufacturerName = part.manufacturers?.name || part.brand || '-';
                  const modelName = part.device_catalog?.model || part.model || null;
                  
                  return (
                    <TableRow key={part.id} className={isLowStock ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div className="font-medium">{part.name}</div>
                        {part.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {part.sku}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDeviceTypeLabel(part.device_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{manufacturerName}</div>
                        {modelName && (
                          <div className="text-sm text-muted-foreground">{modelName}</div>
                        )}
                        {!modelName && (
                          <div className="text-xs text-muted-foreground italic">Generisch</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(part.part_category)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {part.storage_location || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {part.purchase_price?.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {part.sales_price?.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-medium ${isLowStock ? 'text-destructive' : ''}`}>
                            {part.stock_quantity}
                          </span>
                          {isLowStock && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Min: {part.min_stock_quantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(part)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog with Guided Form */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPart ? 'Ersatzteil bearbeiten' : 'Neues Ersatzteil anlegen'}</DialogTitle>
            <DialogDescription>
              Wählen Sie die Zuordnung über die Dropdowns. Freie Texteingabe ist nicht erlaubt.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Step 1: Device Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                1. Gerätetyp <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.device_type}
                onValueChange={(v) => setFormData({ ...formData, device_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Gerätetyp wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Manufacturer */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                2. Hersteller <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.manufacturer_id}
                onValueChange={handleFormManufacturerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hersteller wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Model (Optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                3. Modell <span className="text-muted-foreground text-xs">(optional - leer = generisches Teil)</span>
              </Label>
              <Select
                value={formData.model_id || 'none'}
                onValueChange={(v) => setFormData({ ...formData, model_id: v === 'none' ? '' : v })}
                disabled={!formData.manufacturer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.manufacturer_id ? "Modell wählen..." : "Erst Hersteller wählen"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Generisches Teil (kein Modell) —</SelectItem>
                  {formModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 4: Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                4. Kategorie <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.part_category}
                onValueChange={(v) => setFormData({ ...formData, part_category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {PART_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Divider */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-muted-foreground">Details</Label>
            </div>

            {/* Part Name */}
            <div className="space-y-2">
              <Label>Bezeichnung <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Display OLED Original, Akku 3000mAh"
              />
            </div>

            {/* SKU Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interne Art.-Nr. (SKU)</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="z.B. DIS-IP14P-001"
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

            {/* Storage Location */}
            <div className="space-y-2">
              <Label>Lagerort (Regal/Fach)</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="z.B. Regal A3, Fach 5"
              />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Einkaufspreis (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Verkaufspreis (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sales_price}
                  onChange={(e) => setFormData({ ...formData, sales_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aktueller Bestand</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Mindestbestand</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_stock_quantity}
                  onChange={(e) => setFormData({ ...formData, min_stock_quantity: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending || !formData.name || !formData.manufacturer_id || !formData.part_category}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
