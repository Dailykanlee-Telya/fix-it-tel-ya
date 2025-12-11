import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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

interface DeviceModelSelectProps {
  brand: string;
  model: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
}

export default function DeviceModelSelect({
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

  // Common brands that should always be shown first
  const commonBrands = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Sony', 'Motorola', 'Google', 'OnePlus'];

  // Fetch all brands from catalog
  const { data: brands, refetch: refetchBrands } = useQuery({
    queryKey: ['device-catalog-brands'],
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

  // Fetch models for selected brand
  const { data: models, refetch: refetchModels } = useQuery({
    queryKey: ['device-catalog-models', brand],
    queryFn: async () => {
      if (!brand) return [];
      const { data, error } = await supabase
        .from('device_catalog')
        .select('model')
        .eq('brand', brand)
        .order('model');
      
      if (error) throw error;
      return data.map(d => d.model);
    },
    enabled: !!brand,
    staleTime: 1000 * 60 * 5,
  });
  
  const sortedBrands = useMemo(() => {
    if (!brands || brands.length === 0) return commonBrands;
    const common = commonBrands.filter(b => brands.includes(b));
    const others = brands.filter(b => !commonBrands.includes(b));
    return [...common, ...others];
  }, [brands]);

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
      .insert({ brand: newBrand.trim(), model: newModel.trim(), device_type: 'HANDY' });

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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Brand Select with Search */}
        <div className="space-y-2">
          <Label>Marke *</Label>
          <Popover open={brandOpen} onOpenChange={setBrandOpen}>
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
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Marke suchen..." />
                <CommandList>
                  <CommandEmpty>Keine Marke gefunden</CommandEmpty>
                  <CommandGroup>
                    {sortedBrands.map((b) => (
                      <CommandItem
                        key={b}
                        value={b}
                        onSelect={() => {
                          onBrandChange(b);
                          onModelChange('');
                          setBrandOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            brand === b ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {b}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Model Select with Search */}
        <div className="space-y-2">
          <Label>Modell *</Label>
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
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
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Modell suchen..." />
                <CommandList>
                  <CommandEmpty>
                    <div className="p-2 text-center">
                      <p className="text-sm text-muted-foreground mb-2">Modell nicht gefunden</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModelOpen(false);
                          setNewBrand(brand);
                          setAddDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Neues Modell hinzufügen
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {models?.map((m) => (
                      <CommandItem
                        key={m}
                        value={m}
                        onSelect={() => {
                          onModelChange(m);
                          setModelOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            model === m ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {m}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
