import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { Plus, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DeviceType, DEVICE_TYPE_LABELS } from '@/types/database';

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
  const queryClient = useQueryClient();
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false);
  const [addBrandDialogOpen, setAddBrandDialogOpen] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>(deviceType);
  const [selectedBrandForNewModel, setSelectedBrandForNewModel] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Common brands per device type - sorted alphabetically with most popular first
  const commonBrandsByType: Record<string, string[]> = {
    'HANDY': ['Apple', 'Samsung', 'Xiaomi', 'realme', 'Huawei', 'Sony', 'Motorola', 'Google', 'OnePlus', 'OPPO', 'Vivo', 'Honor', 'Nothing', 'Fairphone'],
    'TABLET': ['Apple', 'Samsung', 'Lenovo', 'Microsoft', 'Huawei', 'Xiaomi'],
    'LAPTOP': ['Apple', 'Lenovo', 'Dell', 'HP', 'ASUS', 'Acer', 'Microsoft', 'Huawei'],
    'SMARTWATCH': ['Apple', 'Samsung', 'Garmin', 'Huawei', 'Google', 'Xiaomi', 'Fitbit'],
    'OTHER': [],
  };

  const catalogDeviceType = DEVICE_TYPE_MAP[deviceType] || 'HANDY';
  const commonBrands = commonBrandsByType[catalogDeviceType] || commonBrandsByType['HANDY'];
  const isOtherType = deviceType === 'OTHER';

  // Fetch all unique brands from the catalog (across all device types for suggestions)
  const { data: allBrands, refetch: refetchBrands } = useQuery({
    queryKey: ['device-catalog-all-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_catalog')
        .select('brand')
        .order('brand');
      
      if (error) throw error;
      const uniqueBrands = [...new Set(data.map(d => d.brand))];
      return uniqueBrands;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch brands filtered by device type
  const { data: brands } = useQuery({
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
    enabled: !isOtherType,
  });

  // Fetch models filtered by device type AND brand
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

  // Check if brand exists (case-insensitive)
  const checkBrandExists = (brandName: string): string | null => {
    const normalizedName = brandName.toLowerCase().trim();
    const existingBrand = allBrands?.find(b => b.toLowerCase() === normalizedName);
    return existingBrand || null;
  };

  const handleAddBrand = async () => {
    const trimmedBrand = newBrand.trim();
    if (!trimmedBrand) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte Herstellername eingeben',
      });
      return;
    }

    // Check for duplicates (case-insensitive)
    const existingBrand = checkBrandExists(trimmedBrand);
    if (existingBrand) {
      toast({
        variant: 'destructive',
        title: 'Hersteller existiert bereits',
        description: `"${existingBrand}" ist bereits im System vorhanden.`,
      });
      return;
    }

    // Just set the new brand - it will be created when the first model is added
    onBrandChange(trimmedBrand);
    setNewBrand('');
    setAddBrandDialogOpen(false);
    
    toast({
      title: 'Hersteller ausgewählt',
      description: `${trimmedBrand} wurde ausgewählt. Fügen Sie jetzt ein Modell hinzu.`,
    });

    // Open the model dialog
    setSelectedBrandForNewModel(trimmedBrand);
    setAddModelDialogOpen(true);
  };

  const handleAddModel = async () => {
    const brandToUse = selectedBrandForNewModel || brand;
    const trimmedModel = newModel.trim();

    if (!brandToUse || !trimmedModel) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte Hersteller und Modell eingeben',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Calculate sort_order based on brand
      let sortOrder: number | null = null;
      if (brandToUse.toLowerCase() === 'apple') {
        // For Apple, we use negative sort_order so newer models (higher numbers) come first
        // Extract model number if possible (e.g., "iPhone 17" -> 17)
        const match = trimmedModel.match(/\d+/);
        if (match) {
          sortOrder = -parseInt(match[0], 10) * 100; // Multiply to leave room for variants
        }
      }

      const { error } = await supabase
        .from('device_catalog')
        .insert({ 
          brand: brandToUse, 
          model: trimmedModel, 
          device_type: DEVICE_TYPE_MAP[newDeviceType],
          sort_order: sortOrder,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Modell existiert bereits',
            description: `${brandToUse} ${trimmedModel} ist bereits im Katalog.`,
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Modell hinzugefügt',
        description: `${brandToUse} ${trimmedModel} wurde zum Katalog hinzugefügt.`,
      });

      // Update the form values
      onBrandChange(brandToUse);
      onModelChange(trimmedModel);
      
      // Reset dialog state
      setNewBrand('');
      setNewModel('');
      setSelectedBrandForNewModel('');
      setNewDeviceType(deviceType);
      setAddModelDialogOpen(false);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['device-catalog-brands'] });
      queryClient.invalidateQueries({ queryKey: ['device-catalog-models'] });
      queryClient.invalidateQueries({ queryKey: ['device-catalog-all-brands'] });
      refetchBrands();
      refetchModels();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModelDialog = (presetBrand?: string) => {
    setSelectedBrandForNewModel(presetBrand || brand);
    setNewModel('');
    setNewDeviceType(deviceType);
    setAddModelDialogOpen(true);
  };

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

  const noBrandInSearch = brandSearch && filteredBrands.length === 0;
  const noModelInSearch = modelSearch && filteredModels.length === 0;
  const hasNoCatalogModels = brand && models && models.length === 0;

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
            <PopoverContent className="w-[250px] p-0 bg-popover" align="start">
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
                    <div className="p-2 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">Keine Marke gefunden</p>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="w-full"
                        onClick={() => {
                          setBrandOpen(false);
                          setNewBrand(brandSearch);
                          setBrandSearch('');
                          setAddBrandDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        "{brandSearch}" als neuen Hersteller anlegen
                      </Button>
                    </div>
                  ) : (
                    <>
                      {filteredBrands.map((b) => (
                        <button
                          key={b}
                          type="button"
                          className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
                          onClick={() => {
                            onBrandChange(b);
                            onModelChange(''); // Reset model when brand changes
                            setBrandOpen(false);
                            setBrandSearch('');
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4 flex-shrink-0", brand === b ? "opacity-100" : "opacity-0")} />
                          {b}
                        </button>
                      ))}
                      {/* Add new brand option at the end */}
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          type="button"
                          className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left text-primary"
                          onClick={() => {
                            setBrandOpen(false);
                            setBrandSearch('');
                            setNewBrand('');
                            setAddBrandDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Neuen Hersteller anlegen...
                        </button>
                      </div>
                    </>
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
              <div className="flex gap-2">
                <Input
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  placeholder="Modell eingeben..."
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => openAddModelDialog()}
                  title="Modell zum Katalog hinzufügen"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keine Modelle im Katalog. Sie können ein Modell manuell eingeben oder zum Katalog hinzufügen.
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
              <PopoverContent className="w-[250px] p-0 bg-popover" align="start">
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
                      <div className="p-2 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {modelSearch ? `"${modelSearch}" nicht gefunden` : 'Keine Modelle vorhanden'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          className="w-full"
                          onClick={() => {
                            setModelOpen(false);
                            setNewModel(modelSearch);
                            setModelSearch('');
                            openAddModelDialog();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {modelSearch ? `"${modelSearch}" hinzufügen` : 'Neues Modell hinzufügen'}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {filteredModels.map((m) => (
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
                        ))}
                        {/* Add new model option at the end */}
                        <div className="border-t border-border mt-1 pt-1">
                          <button
                            type="button"
                            className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left text-primary"
                            onClick={() => {
                              setModelOpen(false);
                              setModelSearch('');
                              openAddModelDialog();
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Neues Modell hinzufügen...
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Quick Add Button */}
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        className="gap-1"
        onClick={() => openAddModelDialog()}
      >
        <Plus className="h-4 w-4" />
        Neues Gerät zum Katalog hinzufügen
      </Button>

      {/* Add New Brand Dialog */}
      <Dialog open={addBrandDialogOpen} onOpenChange={setAddBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Hersteller anlegen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Gerätehersteller zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Herstellername *</Label>
              <Input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="z.B. Fairphone, Nokia"
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Nach dem Anlegen des Herstellers können Sie Modelle hinzufügen.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBrandDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddBrand} disabled={!newBrand.trim()}>
              Hersteller anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Model Dialog */}
      <Dialog open={addModelDialogOpen} onOpenChange={setAddModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Modell hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein neues Gerätemodell zum Katalog hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Gerätetyp</Label>
              <Select value={newDeviceType} onValueChange={(value) => setNewDeviceType(value as DeviceType)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).filter(t => t !== 'OTHER').map((type) => (
                    <SelectItem key={type} value={type}>
                      {DEVICE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hersteller *</Label>
              <Select 
                value={selectedBrandForNewModel} 
                onValueChange={setSelectedBrandForNewModel}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Hersteller wählen..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {allBrands?.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                  {/* Show the selected brand if it's new and not in the list */}
                  {selectedBrandForNewModel && !allBrands?.includes(selectedBrandForNewModel) && (
                    <SelectItem value={selectedBrandForNewModel}>
                      {selectedBrandForNewModel} (neu)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary p-0 h-auto"
                onClick={() => {
                  setAddModelDialogOpen(false);
                  setAddBrandDialogOpen(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Neuen Hersteller anlegen
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Modellname *</Label>
              <Input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder="z.B. iPhone 17 Pro Max"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModelDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleAddModel} 
              disabled={isSaving || !selectedBrandForNewModel || !newModel.trim()}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
