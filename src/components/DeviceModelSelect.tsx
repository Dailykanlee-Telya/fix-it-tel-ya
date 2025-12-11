import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DeviceType } from '@/types/database';

interface DeviceModelSelectProps {
  deviceType: DeviceType;
  brand: string;
  model: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
}

// Map enum values to device_catalog values
const DEVICE_TYPE_MAP: Record<DeviceType, string> = {
  'HANDY': 'HANDY',
  'TABLET': 'TABLET',
  'LAPTOP': 'LAPTOP',
  'SMARTWATCH': 'SMARTWATCH',
  'OTHER': 'OTHER',
};

export default function DeviceModelSelect({
  deviceType,
  brand,
  model,
  onBrandChange,
  onModelChange,
}: DeviceModelSelectProps) {
  const { toast } = useToast();
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Common brands per device type
  const commonBrandsByType: Record<string, string[]> = {
    'HANDY': ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Sony', 'Motorola', 'Google', 'OnePlus'],
    'TABLET': ['Apple', 'Samsung', 'Lenovo', 'Microsoft', 'Huawei'],
    'LAPTOP': ['Apple', 'Lenovo', 'Dell', 'HP', 'ASUS', 'Acer', 'Microsoft'],
    'SMARTWATCH': ['Apple', 'Samsung', 'Garmin', 'Huawei', 'Google', 'Xiaomi'],
    'OTHER': [],
  };

  const catalogDeviceType = DEVICE_TYPE_MAP[deviceType] || 'HANDY';
  const commonBrands = commonBrandsByType[catalogDeviceType] || commonBrandsByType['HANDY'];
  const isOtherType = deviceType === 'OTHER';

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Fetch brands filtered by device type
  const { data: brands, refetch: refetchBrands } = useQuery({
    queryKey: ['device-catalog-brands', catalogDeviceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_catalog')
        .select('brand')
        .eq('device_type', catalogDeviceType)
        .order('brand');
      
      if (error) throw error;
      const uniqueBrands = [...new Set(data.map(d => d.brand))];
      return uniqueBrands;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !isOtherType, // Don't fetch for OTHER type
  });

  // Fetch models filtered by device type AND brand
  // Sorting logic:
  // - Apple: sort by sort_order ASC (newest iPhones first, oldest last)
  // - Other brands: sort by sort_order ASC (alphabetical order by model name)
  // - Fallback to model name if sort_order is null
  const { data: models, refetch: refetchModels } = useQuery({
    queryKey: ['device-catalog-models', catalogDeviceType, brand],
    queryFn: async () => {
      if (!brand) return [];
      const { data, error } = await supabase
        .from('device_catalog')
        .select('model, sort_order')
        .eq('device_type', catalogDeviceType)
        .eq('brand', brand)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('model', { ascending: true });
      
      if (error) throw error;
      return data.map(d => d.model);
    },
    enabled: !!brand && !isOtherType,
    staleTime: 1000 * 60 * 5,
  });
  
  const sortedBrands = useMemo(() => {
    if (!brands || brands.length === 0) return commonBrands;
    const common = commonBrands.filter(b => brands.includes(b));
    const others = brands.filter(b => !commonBrands.includes(b));
    return [...common, ...others];
  }, [brands, commonBrands]);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return sortedBrands;
    return sortedBrands.filter(b => 
      b.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [sortedBrands, brandSearch]);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    if (!modelSearch) return models;
    return models.filter(m => 
      m.toLowerCase().includes(modelSearch.toLowerCase())
    );
  }, [models, modelSearch]);

  const handleAddDevice = async () => {
    if (!newBrand.trim() || !newModel.trim()) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte Marke und Modell eingeben',
      });
      return;
    }

    const { error } = await supabase
      .from('device_catalog')
      .insert({ 
        brand: newBrand.trim(), 
        model: newModel.trim(), 
        device_type: catalogDeviceType 
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          variant: 'destructive',
          title: 'Gerät existiert bereits',
          description: `${newBrand} ${newModel} ist bereits im Katalog.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: error.message,
        });
      }
      return;
    }

    toast({
      title: 'Gerät hinzugefügt',
      description: `${newBrand} ${newModel} wurde zum Katalog hinzugefügt.`,
    });

    onBrandChange(newBrand.trim());
    onModelChange(newModel.trim());
    setNewBrand('');
    setNewModel('');
    setAddDialogOpen(false);
    refetchBrands();
    refetchModels();
  };

  const hasNoCatalogModels = brand && models && models.length === 0;

  // For OTHER device type, show free text input
  if (isOtherType) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Marke *</Label>
            <Input
              value={brand}
              onChange={(e) => onBrandChange(e.target.value)}
              placeholder="Marke eingeben..."
            />
          </div>
          <div className="space-y-2">
            <Label>Gerätemodell / Bezeichnung *</Label>
            <Input
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder="Modell oder Bezeichnung eingeben..."
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Für sonstige Geräte geben Sie bitte Marke und Modell manuell ein.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Brand Select with Search */}
        <div className="space-y-2">
          <Label>Marke *</Label>
          <Popover open={brandOpen} onOpenChange={(open) => {
            setBrandOpen(open);
            if (!open) setBrandSearch('');
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={brandOpen}
                className="w-full justify-between font-normal"
              >
                {brand || "Marke wählen..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-popover" align="start">
              <div className="p-2 border-b border-border">
                <Input 
                  placeholder="Marke suchen..." 
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="h-8"
                />
              </div>
              <ScrollArea className="h-[200px]">
                <div className="p-1">
                  {filteredBrands.length === 0 ? (
                    <p className="py-2 px-2 text-sm text-muted-foreground">Keine Marke gefunden</p>
                  ) : (
                    filteredBrands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
                        onClick={() => {
                          onBrandChange(b);
                          setBrandOpen(false);
                          setBrandSearch('');
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4 flex-shrink-0", brand === b ? "opacity-100" : "opacity-0")} />
                        {b}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Model Select with Search or Manual Input */}
        <div className="space-y-2">
          <Label>Modell *</Label>
          {hasNoCatalogModels ? (
            <div className="space-y-2">
              <Input
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder="Modell manuell eingeben..."
              />
              <p className="text-xs text-muted-foreground">
                Keine Modelle im Katalog. Bitte manuell eingeben.
              </p>
            </div>
          ) : (
            <Popover open={modelOpen} onOpenChange={(open) => {
              setModelOpen(open);
              if (!open) setModelSearch('');
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={modelOpen}
                  className="w-full justify-between font-normal"
                  disabled={!brand}
                >
                  {model || (brand ? "Modell wählen..." : "Zuerst Marke wählen")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 bg-popover" align="start">
                <div className="p-2 border-b border-border">
                  <Input 
                    placeholder="Modell suchen..." 
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="h-8"
                  />
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-1">
                    {filteredModels.length === 0 ? (
                      <div className="p-2 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Modell nicht gefunden</p>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => {
                            setModelOpen(false);
                            setModelSearch('');
                            setNewBrand(brand);
                            setAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Neues Modell hinzufügen
                        </Button>
                      </div>
                    ) : (
                      filteredModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
                          onClick={() => {
                            onModelChange(m);
                            setModelOpen(false);
                            setModelSearch('');
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4 flex-shrink-0", model === m ? "opacity-100" : "opacity-0")} />
                          {m}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Add New Device Button */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Neues Gerät zum Katalog hinzufügen
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Gerät hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein neues Gerätemodell zum Katalog hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Marke</Label>
              <Input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="z.B. Apple, Samsung"
              />
            </div>
            <div className="space-y-2">
              <Label>Modell</Label>
              <Input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="z.B. iPhone 15 Pro Max"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddDevice}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
