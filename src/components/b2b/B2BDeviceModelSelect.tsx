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
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeviceType } from '@/types/database';
import ModelRequestButton from './ModelRequestButton';

interface B2BDeviceModelSelectProps {
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

// Common brands per device type
const commonBrandsByType: Record<string, string[]> = {
  'HANDY': ['Apple', 'Samsung', 'Xiaomi', 'realme', 'Huawei', 'Sony', 'Motorola', 'Google', 'OnePlus', 'OPPO', 'Vivo', 'Honor', 'Nothing', 'Fairphone'],
  'TABLET': ['Apple', 'Samsung', 'Lenovo', 'Microsoft', 'Huawei', 'Xiaomi'],
  'LAPTOP': ['Apple', 'Lenovo', 'Dell', 'HP', 'ASUS', 'Acer', 'Microsoft', 'Huawei'],
  'SMARTWATCH': ['Apple', 'Samsung', 'Garmin', 'Huawei', 'Google', 'Xiaomi', 'Fitbit'],
  'OTHER': [],
};

/**
 * B2B-specific version of DeviceModelSelect
 * - NO catalog management (add brand/model) buttons
 * - Only "Model Request" button to request missing models
 */
export default function B2BDeviceModelSelect({
  deviceType,
  brand,
  model,
  onBrandChange,
  onModelChange,
}: B2BDeviceModelSelectProps) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  const catalogDeviceType = DEVICE_TYPE_MAP[deviceType] || 'HANDY';
  const commonBrands = commonBrandsByType[catalogDeviceType] || commonBrandsByType['HANDY'];
  const isOtherType = deviceType === 'OTHER';

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

  // Fetch models filtered by device type AND brand with proper sorting
  const { data: models } = useQuery({
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
                    <div className="p-2 text-center">
                      <p className="text-sm text-muted-foreground">Keine Marke gefunden</p>
                    </div>
                  ) : (
                    filteredBrands.map((b) => (
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
                placeholder="Modell eingeben..."
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
                      <div className="p-2 text-center">
                        <p className="text-sm text-muted-foreground">
                          {modelSearch ? `"${modelSearch}" nicht gefunden` : 'Keine Modelle vorhanden'}
                        </p>
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

      {/* Model Request Button - B2B can only request, not add directly */}
      <ModelRequestButton deviceType={deviceType} brand={brand} />
    </div>
  );
}
